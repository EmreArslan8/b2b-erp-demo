"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    unit: String(formData.get("unit") ?? "Adet"),
    cost: Number(formData.get("cost") ?? 0),
    price: Number(formData.get("price") ?? 0),
    critical_level: Number(formData.get("critical_level") ?? 0),
    conversion: String(formData.get("conversion") ?? "—").trim() || "—",
  });
  if (error) throw new Error(error.message);
  const { data: created } = await supabase.from("products").select("id").eq("sku", String(formData.get("sku") ?? "").trim()).single();
  await saveProductImage(supabase, created?.id, formData.get("image"));
  await saveCustomerPrices(supabase, created?.id, formData);
  revalidatePath("/panel/urunler");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/panel/urunler");
}

async function saveCustomerPrices(supabase: Awaited<ReturnType<typeof createClient>>, productId: string | undefined, formData: FormData) {
  if (!productId) return;
  const prices = [...formData.entries()].filter(([key, value]) => key.startsWith("customer_price_") && value !== "").map(([key, value]) => ({ product_id: productId, customer_id: key.replace("customer_price_", ""), price: Number(value) }));
  if (prices.length) await supabase.from("product_prices").upsert(prices, { onConflict: "product_id,customer_id" });
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("products").update({
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    unit: String(formData.get("unit") ?? "Adet"),
    cost: Number(formData.get("cost") ?? 0),
    price: Number(formData.get("price") ?? 0),
    critical_level: Number(formData.get("critical_level") ?? 0),
    conversion: String(formData.get("conversion") ?? "—").trim() || "—",
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await saveProductImage(supabase, id, formData.get("image"));
  await saveCustomerPrices(supabase, id, formData);
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
