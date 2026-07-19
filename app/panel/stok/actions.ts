"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { writeAuditLog } from "../../../lib/supabase/audit";

const movementTypes = ["Satın alma girişi", "Satış çıkışı", "Rezervasyon", "Rezervasyon iptali", "Müşteri iadesi", "Tedarikçiye iade", "Fire/hasarlı ürün", "Sayım düzeltmesi", "Depolar arası transfer", "Giriş", "Çıkış", "Transfer"] as const;

export async function createWarehouse(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Depo adı zorunludur.");
  const { data, error } = await supabase.from("warehouses").insert({ name }).select("id").single();
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "warehouse", data?.id ?? null, "create", { name });
  revalidatePath("/panel/stok");
}

export async function updateWarehouse(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Depo bilgileri eksik.");
  const { error } = await supabase.from("warehouses").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "warehouse", id, "update", { name });
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
  const unitCost = Number(formData.get("unit_cost") ?? 0);
  const supplierId = String(formData.get("supplier_id") ?? "");
  const ref = String(formData.get("ref") ?? "").trim();
  const normalizedType = type === "Giriş" ? "Satın alma girişi" : type === "Çıkış" ? "Satış çıkışı" : type === "Transfer" ? "Depolar arası transfer" : type;
  if (!movementTypes.includes(type as (typeof movementTypes)[number]) || !productId || !Number.isFinite(qty) || qty <= 0) throw new Error("Hareket bilgilerini eksiksiz girin.");
  if (normalizedType !== "Depolar arası transfer" && !warehouseId) throw new Error("Depo seçin.");
  if (normalizedType === "Depolar arası transfer" && (!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse)) throw new Error("Transfer için farklı kaynak ve hedef depo seçin.");

  const movementRef = ref || normalizedType;
  if (normalizedType === "Depolar arası transfer") {
    const movement = await supabase.rpc("apply_stock_movement", { p_type: "Transfer", p_product_id: productId, p_warehouse_id: null, p_from_warehouse: fromWarehouse, p_to_warehouse: toWarehouse, p_qty: qty, p_ref: movementRef });
    if (movement.error) throw new Error(movement.error.message);
    const latest = await supabase.from("stock_movements").select("id").eq("product_id", productId).eq("type", "Transfer").eq("qty", qty).eq("ref", movementRef).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw new Error(latest.error.message);
    if (latest.data) {
      const updated = await supabase.from("stock_movements").update({ type: normalizedType }).eq("id", latest.data.id);
      if (updated.error) throw new Error(updated.error.message);
    }
  } else {
    const direction = ["Satın alma girişi", "Müşteri iadesi", "Sayım düzeltmesi"].includes(normalizedType) ? "Giriş" : "Çıkış";
    const movement = await supabase.rpc("apply_stock_movement", { p_type: direction, p_product_id: productId, p_warehouse_id: warehouseId || null, p_from_warehouse: direction === "Çıkış" ? warehouseId : null, p_to_warehouse: direction === "Giriş" ? warehouseId : null, p_qty: qty, p_ref: movementRef });
    if (movement.error) throw new Error(movement.error.message);
    const latest = await supabase.from("stock_movements").select("id").eq("product_id", productId).eq("type", direction).eq("qty", qty).eq("ref", movementRef).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw new Error(latest.error.message);
    if (latest.data) {
      const updated = await supabase.from("stock_movements").update({ type: normalizedType }).eq("id", latest.data.id);
      if (updated.error) throw new Error(updated.error.message);
    }
  }

  if (normalizedType === "Satın alma girişi") {
    if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("Alış maliyeti geçerli değil.");
    const current = await supabase.from("products").select("cost,average_cost").eq("id", productId).maybeSingle();
    if (current.error) throw new Error(current.error.message);
    const stock = await supabase.from("product_stock").select("quantity").eq("product_id", productId);
    if (stock.error) throw new Error(stock.error.message);
    const totalQty = (stock.data ?? []).reduce((sum, row) => sum + Number(row.quantity), 0);
    const previousQty = Math.max(totalQty - qty, 0);
    const previousAverage = Number(current.data?.average_cost ?? current.data?.cost ?? 0);
    const averageCost = totalQty > 0 ? ((previousAverage * previousQty) + (unitCost * qty)) / totalQty : unitCost;
    const productUpdate = await supabase.from("products").update({ cost: averageCost, average_cost: averageCost, last_purchase_price: unitCost }).eq("id", productId);
    if (productUpdate.error) throw new Error(productUpdate.error.message);
    if (supplierId) {
      const debt = await supabase.from("supplier_debts").insert({ supplier_id: supplierId, product_id: productId, amount: qty * unitCost, note: ref || "Satın alma girişi" });
      if (debt.error) throw new Error(debt.error.message);
    }
    await supabase.from("cost_history").insert({ product_id: productId, cost: unitCost });
  }
  await writeAuditLog(supabase, "stock_movement", productId, "create", { type: normalizedType, qty, warehouseId, fromWarehouse, toWarehouse, unitCost, supplierId });
  revalidatePath("/panel/stok");
  revalidatePath("/panel/tedarikciler");
  revalidatePath("/panel/raporlar");
  revalidatePath("/panel");
}
