"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

const taskStatuses = ["acik", "devam", "tamam"] as const;

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Görev başlığı zorunludur.");
  const { error } = await supabase.from("tasks").insert({ title, description: String(formData.get("description") ?? "").trim(), assigned_to: String(formData.get("assigned_to") ?? "") || null, due_date: String(formData.get("due_date") ?? "") || null });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/gorevler");
}

export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !taskStatuses.includes(status as (typeof taskStatuses)[number])) throw new Error("Geçersiz görev durumu.");
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("task_logs").insert({ task_id: id, status });
  revalidatePath("/panel/gorevler");
}
