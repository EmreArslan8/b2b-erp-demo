"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { writeAuditLog } from "../../../lib/supabase/audit";

async function verifyPassword(supabase: Awaited<ReturnType<typeof createClient>>, password: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !password) throw new Error("Silme işlemi için şifre doğrulaması gerekli.");
  const result = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (result.error) throw new Error("Şifre doğrulanamadı.");
}

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function ensureUniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string, excludeId?: string) {
  const root = slugify(base) || "musteri";
  let candidate = root;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let query = supabase.from("customers").select("id").eq("link_slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name || !code) throw new Error("Cari adı ve kodu zorunludur.");
  const requested = String(formData.get("link_slug") ?? "").trim();
  const slug = await ensureUniqueSlug(supabase, requested || name);
  const { data, error } = await supabase.from("customers").insert({ code, name, contact: String(formData.get("contact") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim(), link_slug: slug }).select("id").single();
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "customer", data?.id ?? null, "create", { code });
  revalidatePath("/panel/cari");
  revalidatePath("/", "layout");
}

export async function updateCustomer(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!id || !name || !code) throw new Error("Cari adı ve kodu zorunludur.");
  const requested = String(formData.get("link_slug") ?? "").trim();
  const update: Record<string, string> = { code, name, contact: String(formData.get("contact") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim() };
  if (requested) update.link_slug = await ensureUniqueSlug(supabase, requested, id);
  const { error } = await supabase.from("customers").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "customer", id, "update", {});
  revalidatePath("/panel/cari");
  revalidatePath("/", "layout");
}

export async function deleteCustomer(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Cari bulunamadı.");
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const [orders, payments] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", id),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("customer_id", id),
  ]);
  if (orders.error) throw new Error(orders.error.message);
  if (payments.error) throw new Error(payments.error.message);
  const hasHistory = (orders.count ?? 0) > 0 || (payments.count ?? 0) > 0;
  if (hasHistory) {
    const { error } = await supabase.from("customers").update({ active: false }).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAuditLog(supabase, "customer", id, "soft_delete", { hasHistory });
  } else {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await writeAuditLog(supabase, "customer", id, "delete", { hasHistory });
  }
  revalidatePath("/panel/cari");
  revalidatePath("/", "layout");
}

export async function reactivateCustomer(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Cari bulunamadı.");
  const { error } = await supabase.from("customers").update({ active: true }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "customer", id, "reactivate", {});
  revalidatePath("/panel/cari");
  revalidatePath("/", "layout");
}

export async function createPayment(formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("amount") ?? 0);
  const customerId = String(formData.get("customer_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "") || null;
  if (!customerId || !Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli bir tahsilat tutarı girin.");
  const { data, error } = await supabase.from("payments").insert({ customer_id: customerId, order_id: orderId, amount, method: String(formData.get("method") ?? "Havale"), note: String(formData.get("note") ?? "").trim() }).select("id").single();
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "payment", data?.id ?? null, "create", { customerId, orderId, amount });
  revalidatePath("/panel/cari");
  revalidatePath("/panel");
}

export async function deletePayment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Tahsilat bulunamadı.");
  await verifyPassword(supabase, String(formData.get("current_password") ?? ""));
  const { error } = await supabase.from("payments").update({ status: "İptal", cancelled_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, "payment", id, "cancel", {});
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
  await writeAuditLog(supabase, "payment", id, "update", { amount });
  revalidatePath("/panel/cari");
  revalidatePath("/panel");
}
