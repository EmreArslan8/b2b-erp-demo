import "server-only";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Sunucu tarafı yönetici istemcisi. SADECE server action / route handler içinde kullanılır.
// service_role anahtarı RLS'i baypas eder; asla istemciye sızdırılmamalıdır.
// Yalnızca sunucuya özel (NEXT_PUBLIC_ önekSİZ) anahtar kullanılır.
function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

export function isServiceRoleConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey());
}

export function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
