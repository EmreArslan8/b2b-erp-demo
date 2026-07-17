"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function updateOwnProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Oturum bulunamadı.");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!fullName) throw new Error("Ad soyad boş olamaz.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Geçerli bir e-posta girin.");

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) throw new Error(error.message);
  await supabase.auth.updateUser({ data: { full_name: fullName } });

  const emailChanged = email !== user.email.toLowerCase();
  if (emailChanged) {
    const password = String(formData.get("current_password") ?? "");
    if (!password) throw new Error("E-posta değiştirmek için mevcut şifrenizi girin.");
    const verify = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (verify.error) throw new Error("Mevcut şifre doğrulanamadı.");
    const updated = await supabase.auth.updateUser({ email });
    if (updated.error) throw new Error(updated.error.message);
  }
  revalidatePath("/panel/hesabim");
  revalidatePath("/panel");
}

export async function updateOwnPassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Oturum bulunamadı.");
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (next.length < 6) throw new Error("Yeni şifre en az 6 karakter olmalı.");
  if (next !== confirm) throw new Error("Yeni şifreler eşleşmiyor.");
  const verify = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verify.error) throw new Error("Mevcut şifre doğrulanamadı.");
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/hesabim");
}
