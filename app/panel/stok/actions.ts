"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function createWarehouse(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Depo adı zorunludur.");
  const { error } = await supabase.from("warehouses").insert({ name });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/stok");
}

export async function updateWarehouse(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Depo bilgileri eksik.");
  const { error } = await supabase.from("warehouses").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/stok");
}

export async function createStockMovement(formData: FormData) {
  const supabase = await createClient();
  const type = String(formData.get("type") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const warehouseId = String(formData.get("warehouse_id") ?? "");
  const fromWarehouse = String(formData.get("from_warehouse") ?? "");
  const toWarehouse = String(formData.get("to_warehouse") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const ref = String(formData.get("ref") ?? "").trim();
  if (!["Giriş", "Çıkış", "Transfer"].includes(type) || !productId || !Number.isFinite(qty) || qty <= 0) throw new Error("Hareket bilgilerini eksiksiz girin.");
  if (type !== "Transfer" && !warehouseId) throw new Error("Depo seçin.");
  if (type === "Transfer" && (!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse)) throw new Error("Transfer için farklı kaynak ve hedef depo seçin.");
  const source = type === "Transfer" ? fromWarehouse : warehouseId;
  const currentResult = await supabase.from("product_stock").select("quantity").eq("product_id", productId).eq("warehouse_id", source).maybeSingle();
  if (currentResult.error) throw new Error(currentResult.error.message);
  const current = Number(currentResult.data?.quantity ?? 0);
  if ((type === "Çıkış" || type === "Transfer") && current < qty) throw new Error(`Yetersiz stok. Mevcut miktar: ${current}`);
  async function setStock(warehouse: string, quantity: number) {
    const { error } = await supabase.from("product_stock").upsert({ product_id: productId, warehouse_id: warehouse, quantity }, { onConflict: "product_id,warehouse_id" });
    if (error) throw new Error(error.message);
  }
  if (type === "Giriş") await setStock(warehouseId, current + qty);
  if (type === "Çıkış") await setStock(warehouseId, current - qty);
  if (type === "Transfer") {
    const destinationResult = await supabase.from("product_stock").select("quantity").eq("product_id", productId).eq("warehouse_id", toWarehouse).maybeSingle();
    if (destinationResult.error) throw new Error(destinationResult.error.message);
    await setStock(fromWarehouse, current - qty);
    await setStock(toWarehouse, Number(destinationResult.data?.quantity ?? 0) + qty);
  }
  const { error } = await supabase.from("stock_movements").insert({ type, product_id: productId, qty, from_warehouse: type === "Transfer" ? fromWarehouse : null, to_warehouse: type === "Transfer" ? toWarehouse : type === "Giriş" ? warehouseId : null, ref });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/stok");
  revalidatePath("/panel");
}
