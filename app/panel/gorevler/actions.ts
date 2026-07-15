"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

const taskStatuses = ["acik", "devam", "tamam"] as const;

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const assignedTo = String(formData.get("assigned_to") ?? "").trim();
  if (!title) throw new Error("Görev başlığı zorunludur.");
  if (!assignedTo) throw new Error("Görev için bir kullanıcı atanmalıdır.");
  const { error } = await supabase.from("tasks").insert({ title, description: String(formData.get("description") ?? "").trim(), assigned_to: assignedTo, due_date: String(formData.get("due_date") ?? "") || null });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/gorevler");
}

export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !taskStatuses.includes(status as (typeof taskStatuses)[number])) throw new Error("Geçersiz görev durumu.");
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || !profile?.active) throw new Error("Oturum bulunamadı.");
  if (profile.role === "sales") {
    const { data: task } = await supabase.from("tasks").select("assigned_to").eq("id", id).maybeSingle();
    if (task?.assigned_to !== user.id) throw new Error("Bu görev size atanmamış.");
  }
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("task_logs").insert({ task_id: id, status });
  revalidatePath("/panel/gorevler");
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Görev bulunamadı.");
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || !profile?.active || !["admin", "super_admin"].includes(profile.role)) throw new Error("Görev silme yetkiniz yok.");
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/gorevler");
}
