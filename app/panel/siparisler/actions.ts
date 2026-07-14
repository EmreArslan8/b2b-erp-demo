"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

const statuses = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"] as const;

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !statuses.includes(status as (typeof statuses)[number])) throw new Error("Geçersiz sipariş durumu.");
  const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("order_logs").insert({ order_id: id, text: `Sipariş durumu “${status}” olarak güncellendi.` });
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}

export async function deleteOrder(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Sipariş bulunamadı.");
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/siparisler");
  revalidatePath("/panel");
}
