"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function createPayment(formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("amount") ?? 0);
  const customerId = String(formData.get("customer_id") ?? "");
  if (!customerId || !Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli bir tahsilat tutarı girin.");
  const { error } = await supabase.from("payments").insert({ customer_id: customerId, amount, method: String(formData.get("method") ?? "Havale"), note: String(formData.get("note") ?? "").trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/cari");
  revalidatePath("/panel");
}
