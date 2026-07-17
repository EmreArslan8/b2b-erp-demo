"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "") || null;
  if (!name) throw new Error("Kategori adı boş olamaz.");
  let existingQuery = supabase.from("categories").select("id").ilike("name", name).limit(1);
  existingQuery = parentId ? existingQuery.eq("parent_id", parentId) : existingQuery.is("parent_id", null);
  const existing = await existingQuery.maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) throw new Error("Bu kategori zaten mevcut.");
  const { error } = await supabase.from("categories").insert({ name, parent_id: parentId });
  if (error) throw new Error(error.message);
  revalidatePath("/panel/urunler/kategoriler");
  revalidatePath("/panel/urunler");
}

export async function renameCategory(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  if (!id) throw new Error("Kategori bulunamadı.");
  if (!to) throw new Error("Yeni kategori adı boş olamaz.");
  const { error } = await supabase.from("categories").update({ name: to, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/urunler/kategoriler");
  revalidatePath("/panel/urunler");
  revalidatePath("/siparis/[slug]", "page");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Kategori bulunamadı.");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/urunler/kategoriler");
  revalidatePath("/panel/urunler");
  revalidatePath("/siparis/[slug]", "page");
}
