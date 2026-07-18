"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function createSupplier(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({ name: String(formData.get("name") ?? "").trim(), contact: String(formData.get("contact") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim(), email: String(formData.get("email") ?? "").trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
  revalidatePath("/panel/urunler");
}

export async function updateSupplier(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("suppliers").update({ name: String(formData.get("name") ?? "").trim(), contact: String(formData.get("contact") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim(), email: String(formData.get("email") ?? "").trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
  revalidatePath("/panel/urunler");
}

async function verifyPassword(supabase: Awaited<ReturnType<typeof createClient>>, password: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !password) throw new Error("Silme işlemi için şifre doğrulaması gerekli.");
  const result = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (result.error) throw new Error("Şifre doğrulanamadı.");
}

export async function createSupplierPayment(formData: FormData) {
  const supabase = await createClient();
  const supplierId = String(formData.get("supplier_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!supplierId || !Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli bir ödeme tutarı girin.");
  const { error } = await supabase.from("supplier_payments").insert({ supplier_id: supplierId, amount, method: String(formData.get("method") ?? "Havale"), note: String(formData.get("note") ?? "").trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
}

export async function updateSupplierPayment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!id || !Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli bir ödeme tutarı girin.");
  const { error } = await supabase.from("supplier_payments").update({ amount, method: String(formData.get("method") ?? "Havale"), note: String(formData.get("note") ?? "").trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
}

export async function deleteSupplierPayment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Ödeme kaydı bulunamadı.");
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const { error } = await supabase.from("supplier_payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
}

export async function deleteSupplier(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
  revalidatePath("/panel/urunler");
}
