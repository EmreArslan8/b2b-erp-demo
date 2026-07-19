"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { writeAuditLog } from "../../../lib/supabase/audit";

const statuses = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"] as const;
const fulfillmentSources = ["Kendi depo", "Tedarikçi", "Depo + tedarikçi", "Başka depo"] as const;

async function planFulfillment(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string) {
  const result = await supabase.rpc("plan_order_fulfillment", { p_order_id: orderId });
  if (result.error && !/function .*plan_order_fulfillment|schema cache/i.test(result.error.message)) throw new Error(result.error.message);
}

function orderStatusError(message: string) {
  if (/function .*reserve_order_stock|function .*ship_order_stock|function .*release_order_reservations|schema cache|Could not find/i.test(message)) {
    return "Veritabanı güncellemesi eksik görünüyor. Supabase SQL Editor’da supabase/patches/020_internal_stock_fulfillment.sql dosyasını tekrar çalıştırın.";
  }
  if (/Satılabilir stok rezervasyon için yetersiz|Fiziksel stok satış çıkışı için yetersiz/i.test(message)) {
    return `${message} Stok ekranından fiziksel/rezerve stokları kontrol edin.`;
  }
  return message;
}

async function assertCanModifyOrder(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string) {
  const order = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (order.error || !order.data) throw new Error(order.error?.message ?? "Sipariş bulunamadı.");
  if (!["Teslim Edildi", "Tamamlandı"].includes(order.data.status)) return;
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle() : { data: null, error: null };
  if (!profile.data?.active || profile.data.role !== "super_admin") throw new Error("Tamamlanmış siparişlerde değişiklik için Süper Admin yetkisi gerekir.");
}

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
  if (["Teslim Edildi", "Tamamlandı"].includes(current.data.status) && current.data.status !== status) await assertCanModifyOrder(supabase, id);
  if (status === "Onaylandı" && current.data.status !== "Onaylandı") {
    const reserved = await supabase.rpc("reserve_order_stock", { p_order_id: id });
    if (reserved.error) throw new Error(orderStatusError(reserved.error.message));
  }
  if (["Teslim Edildi", "Tamamlandı"].includes(status) && !["Teslim Edildi", "Tamamlandı"].includes(current.data.status)) {
    const reserved = await supabase.rpc("reserve_order_stock", { p_order_id: id });
    if (reserved.error) throw new Error(orderStatusError(reserved.error.message));
    const shipped = await supabase.rpc("ship_order_stock", { p_order_id: id });
    if (shipped.error) throw new Error(orderStatusError(shipped.error.message));
  }
  if (status === "İptal Edildi" && current.data.status !== "İptal Edildi") {
    const released = await supabase.rpc("release_order_reservations", { p_order_id: id });
    if (released.error) throw new Error(orderStatusError(released.error.message));
  }
  const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: `Sipariş durumu “${status}” olarak güncellendi.` });
  await writeAuditLog(supabase, "order", id, "status_update", { status, previousStatus: current.data.status });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
  revalidatePath("/panel/stok");
}

export async function updateOrderDetails(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const discount = Number(formData.get("discount"));
  const shippingCost = Number(formData.get("shipping_cost") ?? 0);
  const otherCosts = Number(formData.get("other_costs") ?? 0);
  if (!id) throw new Error("Sipariş bulunamadı.");
  await assertCanModifyOrder(supabase, id);
  if (!Number.isFinite(discount) || discount < 0) throw new Error("İndirim geçerli değil.");
  if (!Number.isFinite(shippingCost) || shippingCost < 0 || !Number.isFinite(otherCosts) || otherCosts < 0) throw new Error("Masraf bilgileri geçerli değil.");
  const { error } = await supabase.from("orders").update({ note, discount, shipping_cost: shippingCost, other_costs: otherCosts, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: `Sipariş bilgileri güncellendi. İndirim: ₺${discount.toFixed(2)}, nakliye: ₺${shippingCost.toFixed(2)}, diğer masraf: ₺${otherCosts.toFixed(2)}.` });
  await writeAuditLog(supabase, "order", id, "details_update", { discount, shippingCost, otherCosts });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function updateOrderManualTotal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("manual_total") ?? "").trim();
  const manualTotal = raw === "" ? null : Number(raw);
  if (!id) throw new Error("Sipariş bulunamadı.");
  await assertCanModifyOrder(supabase, id);
  if (manualTotal !== null && (!Number.isFinite(manualTotal) || manualTotal < 0)) throw new Error("Manuel toplam geçerli değil.");
  const { error } = await supabase.from("orders").update({ manual_total: manualTotal, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: manualTotal === null ? "Manuel sipariş toplamı kaldırıldı." : `Manuel sipariş toplamı ₺${manualTotal.toFixed(2)} olarak güncellendi.` });
  await writeAuditLog(supabase, "order", id, "manual_total_update", { manualTotal });
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
  await planFulfillment(supabase, created.data.id);
  await supabase.from("order_logs").insert({ order_id: created.data.id, text: `Sipariş ${orderNo} olarak kopyalandı.` });
  await writeAuditLog(supabase, "order", created.data.id, "copy", { sourceId, orderNo });
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
  await planFulfillment(supabase, created.data.id);
  await supabase.from("notifications").insert({ order_id: created.data.id });
  await supabase.from("order_logs").insert({ order_id: created.data.id, text: `Manuel sipariş oluşturuldu (${rows.length} kalem).` });
  await writeAuditLog(supabase, "order", created.data.id, "create_manual", { itemCount: rows.length });
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
  await assertCanModifyOrder(supabase, orderId);
  const { error } = await supabase.from("order_items").update({ qty, price }).eq("id", id);
  if (error) throw new Error(error.message);
  await planFulfillment(supabase, orderId);
  await supabase.from("order_logs").insert({ order_id: orderId, text: `Sipariş ürünü güncellendi: ${qty} adet, ₺${price.toFixed(2)} birim fiyat.` });
  await writeAuditLog(supabase, "order_item", id, "update", { orderId, qty, price });
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
  await assertCanModifyOrder(supabase, orderId);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Adet sıfırdan büyük olmalı.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Fiyat geçerli değil.");
  const existing = await supabase.from("order_items").select("id,qty").eq("order_id", orderId).eq("product_id", productId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const result = existing.data
    ? await supabase.from("order_items").update({ qty: Number(existing.data.qty) + qty, price }).eq("id", existing.data.id)
    : await supabase.from("order_items").insert({ order_id: orderId, product_id: productId, qty, price });
  if (result.error) throw new Error(result.error.message);
  await planFulfillment(supabase, orderId);
  await supabase.from("order_logs").insert({ order_id: orderId, text: `Siparişe ürün eklendi: ${qty} adet, ₺${price.toFixed(2)} birim fiyat.` });
  await writeAuditLog(supabase, "order", orderId, "item_add", { productId, qty, price });
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
  await assertCanModifyOrder(supabase, orderId);
  const { error } = await supabase.from("order_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await planFulfillment(supabase, orderId);
  await supabase.from("order_logs").insert({ order_id: orderId, text: "Sipariş ürünü silindi." });
  await writeAuditLog(supabase, "order_item", id, "delete", { orderId });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function deleteOrder(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Sipariş bulunamadı.");
  await assertCanModifyOrder(supabase, id);
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const released = await supabase.rpc("release_order_reservations", { p_order_id: id });
  if (released.error && !/function .*release_order_reservations|schema cache/i.test(released.error.message)) throw new Error(released.error.message);
  const { error } = await supabase.from("orders").update({ status: "İptal Edildi", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: "Sipariş kalıcı silinmek yerine iptal durumuna alındı." });
  await writeAuditLog(supabase, "order", id, "soft_delete", {});
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function updateOrderItemFulfillment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const fulfillmentSource = String(formData.get("fulfillment_source") ?? "");
  const warehouseQty = Number(formData.get("warehouse_qty") ?? 0);
  const supplierQty = Number(formData.get("supplier_qty") ?? 0);
  const availableAtOrder = Number(formData.get("available_at_order") ?? 0);
  if (!id || !orderId) throw new Error("Sipariş kalemi bulunamadı.");
  await assertCanModifyOrder(supabase, orderId);
  if (!fulfillmentSources.includes(fulfillmentSource as (typeof fulfillmentSources)[number])) throw new Error("Geçersiz karşılama kaynağı.");
  if (!Number.isFinite(warehouseQty) || warehouseQty < 0 || !Number.isFinite(supplierQty) || supplierQty < 0) throw new Error("Karşılama miktarları geçerli değil.");
  const current = await supabase.from("order_items").select("qty,reserved_qty").eq("id", id).maybeSingle();
  if (current.error || !current.data) throw new Error(current.error?.message ?? "Sipariş kalemi bulunamadı.");
  if (Number(current.data.reserved_qty ?? 0) > 0) throw new Error("Rezerve edilmiş kalemde önce sipariş rezervasyonunu kaldırın.");
  if (Math.abs(warehouseQty + supplierQty - Number(current.data.qty)) > 0.0001) throw new Error("Depo ve tedarikçi miktarı sipariş miktarına eşit olmalı.");
  const { error } = await supabase.from("order_items").update({ fulfillment_source: fulfillmentSource, warehouse_qty: warehouseQty, supplier_qty: supplierQty, available_at_order: availableAtOrder, fulfillment_locked: true }).eq("id", id);
  if (error) throw new Error(error.message);
  await planFulfillment(supabase, orderId);
  await supabase.from("order_logs").insert({ order_id: orderId, text: `Karşılama kaynağı manuel güncellendi: ${fulfillmentSource}.` });
  await writeAuditLog(supabase, "order_item", id, "fulfillment_update", { orderId, fulfillmentSource, warehouseQty, supplierQty });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel/stok");
}
