"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function updateProfileRole(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!["super_admin", "admin", "sales"].includes(role) || !id) throw new Error("Geçersiz rol bilgisi.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel");
  revalidatePath("/panel/ayarlar");
}
