"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

const statuses = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"] as const;

async function verifyPassword(supabase: Awaited<ReturnType<typeof createClient>>, password: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !password) throw new Error("Silme işlemi için şifre doğrulaması gerekli.");
  const result = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (result.error) throw new Error("Şifre doğrulanamadı.");
}

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !statuses.includes(status as (typeof statuses)[number])) throw new Error("Geçersiz sipariş durumu.");
  const current = await supabase.from("orders").select("status,order_no,order_items(product_id,qty,products(name))").eq("id", id).maybeSingle();
  if (current.error || !current.data) throw new Error(current.error?.message ?? "Sipariş bulunamadı.");
  if (status === "Tamamlandı" && current.data.status !== "Tamamlandı") {
    const warehouse = await supabase.from("warehouses").select("id").eq("active", true).order("created_at").limit(1).maybeSingle();
    if (warehouse.error || !warehouse.data) throw new Error("Otomatik stok düşümü için aktif depo bulunamadı.");
    const ref = `Sipariş ${current.data.order_no}`;
    const alreadyDeducted = await supabase.from("stock_movements").select("id").eq("ref", ref).eq("type", "Çıkış").limit(1).maybeSingle();
    if (alreadyDeducted.error) throw new Error(alreadyDeducted.error.message);
    if (!alreadyDeducted.data) {
      for (const item of current.data.order_items ?? []) {
        const stock = await supabase.from("product_stock").select("quantity").eq("product_id", item.product_id).eq("warehouse_id", warehouse.data.id).maybeSingle();
        const available = Number(stock.data?.quantity ?? 0);
        const qty = Number(item.qty);
        if (stock.error) throw new Error(stock.error.message);
        if (available < qty) throw new Error(`${(Array.isArray(item.products) ? item.products[0] : item.products)?.name ?? "Ürün"} için stok yetersiz. Mevcut: ${available}`);
      }
      for (const item of current.data.order_items ?? []) {
        const qty = Number(item.qty);
        const movement = await supabase.rpc("apply_stock_movement", { p_type: "Çıkış", p_product_id: item.product_id, p_warehouse_id: warehouse.data.id, p_from_warehouse: warehouse.data.id, p_to_warehouse: null, p_qty: qty, p_ref: ref });
        if (movement.error) throw new Error(movement.error.message);
      }
    }
  }
  const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: `Sipariş durumu “${status}” olarak güncellendi.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
  revalidatePath("/panel/stok");
}

export async function updateOrderDetails(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const discount = Number(formData.get("discount"));
  if (!id) throw new Error("Sipariş bulunamadı.");
  if (!Number.isFinite(discount) || discount < 0) throw new Error("İndirim geçerli değil.");
  const { error } = await supabase.from("orders").update({ note, discount, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: `Sipariş notu ve indirimi güncellendi. İndirim: ₺${discount.toFixed(2)}.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function updateOrderManualTotal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("manual_total") ?? "").trim();
  const manualTotal = raw === "" ? null : Number(raw);
  if (!id) throw new Error("Sipariş bulunamadı.");
  if (manualTotal !== null && (!Number.isFinite(manualTotal) || manualTotal < 0)) throw new Error("Manuel toplam geçerli değil.");
  const { error } = await supabase.from("orders").update({ manual_total: manualTotal, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: manualTotal === null ? "Manuel sipariş toplamı kaldırıldı." : `Manuel sipariş toplamı ₺${manualTotal.toFixed(2)} olarak güncellendi.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function copyOrder(formData: FormData) {
  const supabase = await createClient();
  const sourceId = String(formData.get("id") ?? "");
  if (!sourceId) throw new Error("Sipariş bulunamadı.");
  const source = await supabase.from("orders").select("customer_id,note,discount,order_items(product_id,qty,price)").eq("id", sourceId).maybeSingle();
  if (source.error || !source.data) throw new Error(source.error?.message ?? "Sipariş bulunamadı.");
  const orderNo = `SIP-${Date.now().toString(36).toUpperCase()}`;
  const created = await supabase.from("orders").insert({ order_no: orderNo, customer_id: source.data.customer_id, note: source.data.note, discount: source.data.discount, manual_total: null }).select("id").single();
  if (created.error || !created.data) throw new Error(created.error?.message ?? "Sipariş kopyalanamadı.");
  const items = (source.data.order_items ?? []).map((item) => ({ order_id: created.data.id, product_id: item.product_id, qty: item.qty, price: item.price }));
  if (items.length) {
    const inserted = await supabase.from("order_items").insert(items);
    if (inserted.error) throw new Error(inserted.error.message);
  }
  await supabase.from("order_logs").insert({ order_id: created.data.id, text: `Sipariş ${orderNo} olarak kopyalandı.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function createManualOrder(formData: FormData) {
  const supabase = await createClient();
  const customerId = String(formData.get("customer_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!customerId) throw new Error("Müşteri seçin.");
  let items: { productId: string; qty: number }[];
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { throw new Error("Sipariş kalemleri okunamadı."); }
  items = (items ?? []).filter((item) => item && typeof item.productId === "string" && Number(item.qty) > 0);
  if (!items.length) throw new Error("En az bir ürün ekleyin.");

  const productIds = [...new Set(items.map((item) => item.productId))];
  const [products, prices] = await Promise.all([
    supabase.from("products").select("id,price").in("id", productIds),
    supabase.from("product_prices").select("product_id,price").eq("customer_id", customerId).in("product_id", productIds),
  ]);
  if (products.error) throw new Error(products.error.message);
  if (prices.error) throw new Error(prices.error.message);
  const basePrice = new Map((products.data ?? []).map((row) => [row.id, Number(row.price)]));
  const customPrice = new Map((prices.data ?? []).map((row) => [row.product_id, Number(row.price)]));
  for (const item of items) if (!basePrice.has(item.productId)) throw new Error("Seçilen ürünlerden biri bulunamadı.");

  const orderNo = `SIP-${Date.now().toString(36).toUpperCase()}`;
  const { data: { user } } = await supabase.auth.getUser();
  const created = await supabase.from("orders").insert({ order_no: orderNo, customer_id: customerId, status: "Yeni Sipariş", note, created_by: user?.id ?? null }).select("id").single();
  if (created.error || !created.data) throw new Error(created.error?.message ?? "Sipariş oluşturulamadı.");
  const rows = items.map((item) => ({ order_id: created.data.id, product_id: item.productId, qty: Number(item.qty), price: customPrice.get(item.productId) ?? basePrice.get(item.productId) ?? 0 }));
  const inserted = await supabase.from("order_items").insert(rows);
  if (inserted.error) throw new Error(inserted.error.message);
  await supabase.from("notifications").insert({ order_id: created.data.id });
  await supabase.from("order_logs").insert({ order_id: created.data.id, text: `Manuel sipariş oluşturuldu (${rows.length} kalem).` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function updateOrderItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const qty = Number(formData.get("qty"));
  const price = Number(formData.get("price"));
  if (!id || !Number.isFinite(qty) || qty <= 0) throw new Error("Adet sıfırdan büyük olmalı.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Fiyat geçerli değil.");
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) throw new Error("Sipariş bulunamadı.");
  const { error } = await supabase.from("order_items").update({ qty, price }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: orderId, text: `Sipariş ürünü güncellendi: ${qty} adet, ₺${price.toFixed(2)} birim fiyat.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function addOrderItem(formData: FormData) {
  const supabase = await createClient();
  const orderId = String(formData.get("order_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const qty = Number(formData.get("qty"));
  const price = Number(formData.get("price"));
  if (!orderId || !productId) throw new Error("Sipariş veya ürün bulunamadı.");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Adet sıfırdan büyük olmalı.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Fiyat geçerli değil.");
  const existing = await supabase.from("order_items").select("id,qty").eq("order_id", orderId).eq("product_id", productId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const result = existing.data
    ? await supabase.from("order_items").update({ qty: Number(existing.data.qty) + qty, price }).eq("id", existing.data.id)
    : await supabase.from("order_items").insert({ order_id: orderId, product_id: productId, qty, price });
  if (result.error) throw new Error(result.error.message);
  await supabase.from("order_logs").insert({ order_id: orderId, text: `Siparişe ürün eklendi: ${qty} adet, ₺${price.toFixed(2)} birim fiyat.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function deleteOrderItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Sipariş ürünü bulunamadı.");
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) throw new Error("Sipariş bulunamadı.");
  const { error } = await supabase.from("order_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: orderId, text: "Sipariş ürünü silindi." });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function deleteOrder(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Sipariş bulunamadı.");
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}
