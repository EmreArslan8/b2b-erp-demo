"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

async function verifyPassword(supabase: Awaited<ReturnType<typeof createClient>>, password: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !password) throw new Error("Silme işlemi için şifre doğrulaması gerekli.");
  const result = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (result.error) throw new Error("Şifre doğrulanamadı.");
}

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name || !code) throw new Error("Cari adı ve kodu zorunludur.");
  const slug = `${slugify(name) || "musteri"}-${Date.now().toString(36)}`;
  const { error } = await supabase.from("customers").insert({ code, name, contact: String(formData.get("contact") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim(), link_slug: slug });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/cari");
}

export async function updateCustomer(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!id || !name || !code) throw new Error("Cari adı ve kodu zorunludur.");
  const { error } = await supabase.from("customers").update({ code, name, contact: String(formData.get("contact") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/cari");
}

export async function createPayment(formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("amount") ?? 0);
  const customerId = String(formData.get("customer_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "") || null;
  if (!customerId || !Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli bir tahsilat tutarı girin.");
  const { error } = await supabase.from("payments").insert({ customer_id: customerId, order_id: orderId, amount, method: String(formData.get("method") ?? "Havale"), note: String(formData.get("note") ?? "").trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/cari");
  revalidatePath("/panel");
}

export async function deletePayment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Tahsilat bulunamadı.");
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/cari");
  revalidatePath("/panel");
}

export async function updatePayment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!id || !Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli bir tahsilat tutarı girin.");
  const { error } = await supabase.from("payments").update({ amount, method: String(formData.get("method") ?? "Havale"), note: String(formData.get("note") ?? "").trim() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/cari");
  revalidatePath("/panel");
}
