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
  const { error } = await supabase.rpc("apply_stock_movement", { p_type: type, p_product_id: productId, p_warehouse_id: warehouseId || null, p_from_warehouse: fromWarehouse || null, p_to_warehouse: toWarehouse || null, p_qty: qty, p_ref: ref });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/stok");
  revalidatePath("/panel");
}
