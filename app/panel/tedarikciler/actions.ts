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

export async function deleteSupplier(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) throw new Error(error.message);
  revalidatePath("/panel/tedarikciler");
  revalidatePath("/panel/urunler");
}
