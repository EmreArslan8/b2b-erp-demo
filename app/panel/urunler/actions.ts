"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

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
  const { error } = await supabase.from("products").insert({
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    subcategory: String(formData.get("subcategory") ?? "").trim(),
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
    const product = await supabase.from("products").upsert({ name, sku, barcode: column(values, ["barkod", "barcode"]), category: column(values, ["kategori", "category"]), subcategory: column(values, ["alt kategori", "subcategory"]), brand: column(values, ["marka", "brand"]), unit: column(values, ["birim", "unit"]) || "Adet", cost: Number.isFinite(cost) ? cost : 0, price: Number.isFinite(price) ? price : 0, critical_level: Number(column(values, ["kritik stok", "critical_level"]) || 0) || 0 }, { onConflict: "sku" }).select("id").single();
    if (product.error || !product.data) throw new Error(product.error?.message ?? `${sku} ürünü içe aktarılamadı.`);
    await supabase.from("cost_history").insert({ product_id: product.data.id, cost: Number.isFinite(cost) ? cost : 0 });
  }
  revalidatePath("/panel/urunler");
  revalidatePath("/siparis/[slug]", "page");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const { error } = await supabase.from("products").delete().eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
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
  const { error } = await supabase.from("products").update({
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    subcategory: String(formData.get("subcategory") ?? "").trim(),
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
