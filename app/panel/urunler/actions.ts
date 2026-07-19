"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { writeAuditLog } from "../../../lib/supabase/audit";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function categoryPayload(supabase: SupabaseClient, formData: FormData) {
  const selectedId = String(formData.get("subcategory_id") ?? "") || String(formData.get("parent_category_id") ?? "") || null;
  if (!selectedId) return { category_id: null, category: "", subcategory: "" };
  const selected = await supabase.from("categories").select("id,name,parent_id").eq("id", selectedId).maybeSingle();
  if (selected.error || !selected.data) throw new Error(selected.error?.message ?? "Kategori bulunamadı.");
  if (!selected.data.parent_id) return { category_id: selected.data.id, category: selected.data.name, subcategory: "" };
  const parent = await supabase.from("categories").select("name").eq("id", selected.data.parent_id).maybeSingle();
  if (parent.error || !parent.data) throw new Error(parent.error?.message ?? "Ana kategori bulunamadı.");
  return { category_id: selected.data.id, category: parent.data.name, subcategory: selected.data.name };
}

async function ensureCategoryPath(supabase: SupabaseClient, categoryName: string, subcategoryName: string) {
  const rootName = categoryName.trim();
  if (!rootName) return { category_id: null, category: "", subcategory: "" };
  let root = await supabase.from("categories").select("id,name").is("parent_id", null).ilike("name", rootName).limit(1).maybeSingle();
  if (root.error) throw new Error(root.error.message);
  if (!root.data) {
    const created = await supabase.from("categories").insert({ name: rootName, parent_id: null }).select("id,name").single();
    if (created.error || !created.data) throw new Error(created.error?.message ?? "Kategori oluşturulamadı.");
    root = created;
  }
  const rootData = root.data;
  if (!rootData) throw new Error("Kategori oluşturulamadı.");
  const childName = subcategoryName.trim();
  if (!childName) return { category_id: rootData.id, category: rootData.name, subcategory: "" };
  let child = await supabase.from("categories").select("id,name").eq("parent_id", rootData.id).ilike("name", childName).limit(1).maybeSingle();
  if (child.error) throw new Error(child.error.message);
  if (!child.data) {
    const created = await supabase.from("categories").insert({ name: childName, parent_id: rootData.id }).select("id,name").single();
    if (created.error || !created.data) throw new Error(created.error?.message ?? "Alt kategori oluşturulamadı.");
    child = created;
  }
  const childData = child.data;
  if (!childData) throw new Error("Alt kategori oluşturulamadı.");
  return { category_id: childData.id, category: rootData.name, subcategory: childData.name };
}

async function verifyPassword(supabase: Awaited<ReturnType<typeof createClient>>, password: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !password) throw new Error("Silme işlemi için şifre doğrulaması gerekli.");
  const result = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (result.error) throw new Error("Şifre doğrulanamadı.");
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: lastProduct } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const category = await categoryPayload(supabase, formData);
  const { error } = await supabase.from("products").insert({
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    ...category,
    brand: String(formData.get("brand") ?? "").trim(),
    supplier_id: supplierId,
    unit: String(formData.get("unit") ?? "Adet"),
    cost: Number(formData.get("cost") ?? 0),
    price: Number(formData.get("price") ?? 0),
    critical_level: Number(formData.get("critical_level") ?? 0),
    conversion: String(formData.get("conversion") ?? "—").trim() || "—",
    sort_order: Number(lastProduct?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  const { data: created } = await supabase.from("products").select("id").eq("sku", String(formData.get("sku") ?? "").trim()).single();
  await saveProductImage(supabase, created?.id, formData.get("image"));
  await saveCustomerPrices(supabase, created?.id, formData);
  if (created?.id) await supabase.from("cost_history").insert({ product_id: created.id, cost: Number(formData.get("cost") ?? 0) });
  await writeAuditLog(supabase, "product", created?.id ?? null, "create", { sku: String(formData.get("sku") ?? "").trim() });
  revalidatePath("/panel/urunler");
}

export async function importProducts(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("CSV dosyası seçin.");
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV dosyasında veri bulunamadı.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const parse = (line: string) => line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, "").replaceAll('""', '"'));
  const headers = parse(lines[0]).map((header) => header.toLocaleLowerCase("tr-TR"));
  const index = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const column = (values: string[], names: string[]) => { const position = index(names); return position >= 0 ? values[position] ?? "" : ""; };
  for (const line of lines.slice(1)) {
    const values = parse(line);
    const name = column(values, ["ad", "ürün", "ürün adı", "name"]).trim();
    const sku = column(values, ["sku", "kod"]).trim();
    if (!name || !sku) continue;
    const cost = Number(column(values, ["son alış", "alış", "cost"]).replace(",", ".") || 0);
    const price = Number(column(values, ["satış", "satış fiyatı", "price"]).replace(",", ".") || 0);
    const category = await ensureCategoryPath(supabase, column(values, ["kategori", "category"]), column(values, ["alt kategori", "subcategory"]));
    const product = await supabase.from("products").upsert({ name, sku, barcode: column(values, ["barkod", "barcode"]), ...category, brand: column(values, ["marka", "brand"]), unit: column(values, ["birim", "unit"]) || "Adet", cost: Number.isFinite(cost) ? cost : 0, price: Number.isFinite(price) ? price : 0, critical_level: Number(column(values, ["kritik stok", "critical_level"]) || 0) || 0 }, { onConflict: "sku" }).select("id").single();
    if (product.error || !product.data) throw new Error(product.error?.message ?? `${sku} ürünü içe aktarılamadı.`);
    await supabase.from("cost_history").insert({ product_id: product.data.id, cost: Number.isFinite(cost) ? cost : 0 });
    await writeAuditLog(supabase, "product", product.data.id, "import_upsert", { sku, cost: Number.isFinite(cost) ? cost : 0 });
  }
  revalidatePath("/panel/urunler");
  revalidatePath("/siparis/[slug]", "page");
}

export async function toggleProductActive(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) throw new Error("Ürün bulunamadı.");
  const { error } = await supabase.from("products").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "product", id, active ? "reactivate" : "deactivate", {});
  revalidatePath("/panel/urunler");
  revalidatePath("/siparis/[slug]", "page");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const [orders, movements, stock] = await Promise.all([
    supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id),
    supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("product_id", id),
    supabase.from("product_stock").select("product_id", { count: "exact", head: true }).eq("product_id", id).gt("quantity", 0),
  ]);
  const readError = orders.error?.message ?? movements.error?.message ?? stock.error?.message;
  if (readError) throw new Error(readError);
  const hasHistory = (orders.count ?? 0) > 0 || (movements.count ?? 0) > 0 || (stock.count ?? 0) > 0;
  const result = hasHistory ? await supabase.from("products").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id) : await supabase.from("products").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
  await writeAuditLog(supabase, "product", id, hasHistory ? "soft_delete" : "delete", { hasHistory });
  revalidatePath("/panel/urunler");
}

export async function saveProductOrder(formData: FormData) {
  const supabase = await createClient();
  let ids: string[];
  try { ids = JSON.parse(String(formData.get("ordered_ids") ?? "[]")); } catch { throw new Error("Sıralama verisi okunamadı."); }
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string") || ids.length === 0) throw new Error("Geçerli bir ürün sırası gönderilmedi.");
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) throw new Error("Ürün sıralamasında tekrar eden kayıt var.");
  const { data: existing, error: readError } = await supabase.from("products").select("id");
  if (readError) throw new Error(readError.message);
  if ((existing ?? []).length !== ids.length || (existing ?? []).some((product) => !uniqueIds.has(product.id))) throw new Error("Ürün listesi değişmiş. Sayfayı yenileyip tekrar deneyin.");
  for (const [position, id] of ids.entries()) {
    const { error } = await supabase.from("products").update({ sort_order: position }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  await writeAuditLog(supabase, "product", null, "reorder", { count: ids.length });
  revalidatePath("/panel/urunler");
  revalidatePath("/siparis/[slug]", "page");
}

async function saveCustomerPrices(supabase: Awaited<ReturnType<typeof createClient>>, productId: string | undefined, formData: FormData) {
  if (!productId) return;
  const prices = [...formData.entries()].filter(([key, value]) => key.startsWith("customer_price_") && value !== "").map(([key, value]) => ({ product_id: productId, customer_id: key.replace("customer_price_", ""), price: Number(value) }));
  if (prices.length) await supabase.from("product_prices").upsert(prices, { onConflict: "product_id,customer_id" });
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const previous = await supabase.from("products").select("cost").eq("id", id).maybeSingle();
  if (previous.error || !previous.data) throw new Error(previous.error?.message ?? "Ürün bulunamadı.");
  const cost = Number(formData.get("cost") ?? 0);
  const category = await categoryPayload(supabase, formData);
  const { error } = await supabase.from("products").update({
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    ...category,
    brand: String(formData.get("brand") ?? "").trim(),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    unit: String(formData.get("unit") ?? "Adet"),
    cost,
    price: Number(formData.get("price") ?? 0),
    critical_level: Number(formData.get("critical_level") ?? 0),
    conversion: String(formData.get("conversion") ?? "—").trim() || "—",
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await saveProductImage(supabase, id, formData.get("image"));
  await saveCustomerPrices(supabase, id, formData);
  if (Number(previous.data.cost) !== cost) await supabase.from("cost_history").insert({ product_id: id, cost });
  await writeAuditLog(supabase, "product", id, "update", { costChanged: Number(previous.data.cost) !== cost });
  revalidatePath("/panel/urunler");
}

async function saveProductImage(supabase: Awaited<ReturnType<typeof createClient>>, productId: string | undefined, image: FormDataEntryValue | null) {
  if (!productId || !(image instanceof File) || image.size === 0) return;
  if (!image.type.startsWith("image/")) throw new Error("Yalnızca görsel dosyası yükleyebilirsiniz.");
  const extension = image.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${productId}.${extension}`;
  const upload = await supabase.storage.from("product-images").upload(path, image, { upsert: true, contentType: image.type });
  if (upload.error) throw new Error(upload.error.message);
  const imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("products").update({ image_url: imageUrl }).eq("id", productId);
  if (error) throw new Error(error.message);
}
