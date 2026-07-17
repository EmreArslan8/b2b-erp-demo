"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient, isServiceRoleConfigured } from "../../../lib/supabase/service";

const roles = ["super_admin", "admin", "sales"] as const;

// Süper admin kimliğini + şifresini doğrular; işlem yapan kullanıcının id'sini döndürür.
async function requireSuperAdmin(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Oturum bulunamadı.");
  const password = String(formData.get("current_password") ?? "");
  if (!password) throw new Error("İşlem için mevcut şifrenizi girin.");
  const verify = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (verify.error) throw new Error("Mevcut şifre doğrulanamadı.");
  const { data: profile } = await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
  if (!profile?.active || profile.role !== "super_admin") throw new Error("Bu işlem için Süper Admin yetkisi gerekir.");
  return { supabase, userId: user.id };
}

export async function createUser(formData: FormData) {
  if (!isServiceRoleConfigured()) throw new Error("Kullanıcı oluşturmak için sunucu yönetici erişimi tanımlı olmalı. Lütfen sistem yöneticinizle iletişime geçin.");
  await requireSuperAdmin(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "sales");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Geçerli bir e-posta girin.");
  if (password.length < 6) throw new Error("Şifre en az 6 karakter olmalı.");
  if (!roles.includes(role as (typeof roles)[number])) throw new Error("Geçersiz rol.");
  const admin = createServiceClient();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Kullanıcı oluşturulamadı.");
  const { error } = await admin.from("profiles").upsert({ id: created.data.user.id, full_name: fullName, role, active: true }, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/ayarlar");
}

export async function updateUser(formData: FormData) {
  const { supabase, userId } = await requireSuperAdmin(formData);
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const active = String(formData.get("active") ?? "true") === "true";
  if (!id) throw new Error("Kullanıcı bulunamadı.");
  if (!roles.includes(role as (typeof roles)[number])) throw new Error("Geçersiz rol.");
  if (id === userId && (role !== "super_admin" || !active)) throw new Error("Kendi süper admin yetkinizi veya erişiminizi kaldıramazsınız.");
  const { error } = await supabase.from("profiles").update({ role, full_name: fullName, active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/ayarlar");
  revalidatePath("/panel");
}

export async function deleteUser(formData: FormData) {
  if (!isServiceRoleConfigured()) throw new Error("Kullanıcı silmek için sunucu yönetici erişimi tanımlı olmalı. Lütfen sistem yöneticinizle iletişime geçin.");
  const { userId } = await requireSuperAdmin(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Kullanıcı bulunamadı.");
  if (id === userId) throw new Error("Kendi hesabınızı silemezsiniz.");
  const admin = createServiceClient();
  const remaining = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin").eq("active", true);
  const target = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  if (target.data?.role === "super_admin" && (remaining.count ?? 0) <= 1) throw new Error("Son süper admin silinemez.");
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/ayarlar");
}

// Marka adı ayarı
export async function updateBrandName(formData: FormData) {
  const brand = String(formData.get("brand_name") ?? "").trim();
  if (!brand) throw new Error("Marka adı boş olamaz.");
  if (brand.length > 60) throw new Error("Marka adı en fazla 60 karakter olabilir.");
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert({ key: "brand_name", value: brand, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// Geriye dönük uyumluluk: yalnızca rol güncelleme.
export async function updateProfileRole(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!roles.includes(role as (typeof roles)[number]) || !id) throw new Error("Geçersiz rol bilgisi.");
  const { supabase } = await requireSuperAdmin(formData);
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel");
  revalidatePath("/panel/ayarlar");
}
