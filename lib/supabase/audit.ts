import type { createClient } from "./server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function writeAuditLog(supabase: SupabaseClient, entityType: string, entityId: string | null, action: string, details: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({ entity_type: entityType, entity_id: entityId, action, details, actor_id: user?.id ?? null });
  } catch {
    // Audit logging is non-blocking so operational writes do not fail on older schemas.
  }
}
