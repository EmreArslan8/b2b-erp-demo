"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function updateProfileRole(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!["super_admin", "admin", "sales"].includes(role) || !id) throw new Error("Geçersiz rol bilgisi.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const password = String(formData.get("current_password") ?? "");
  if (!user?.email || !password) throw new Error("Rol değişikliği için mevcut şifrenizi girin.");
  const verification = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (verification.error) throw new Error("Mevcut şifre doğrulanamadı.");
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel");
  revalidatePath("/panel/ayarlar");
}
