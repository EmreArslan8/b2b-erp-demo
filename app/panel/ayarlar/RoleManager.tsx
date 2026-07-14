"use client";

import { useActionState, useEffect } from "react";

type Profile = { id: string; full_name: string; role: string; active: boolean; created_at: string };
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

export default function RoleManager({ profiles, action, canManage }: { profiles: Profile[]; action: Action; canManage: boolean }) {
  if (!canManage) return null;
  return <div className="card card-pad" style={{ marginTop: 14 }}><div className="section-head"><div><h3>Kullanıcı ve roller</h3><p className="sub">Rol değişiklikleri yalnızca Süper Admin tarafından yapılabilir.</p></div></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th></th></tr></thead><tbody>{profiles.map((profile) => <RoleRow key={profile.id} profile={profile} action={action} />)}</tbody></table></div></div>;
}

function RoleRow({ profile, action }: { profile: Profile; action: Action }) {
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => { try { await action(formData); return { ok: true, message: "Güncellendi." }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Güncellenemedi." }; } }, null);
  useEffect(() => { if (state?.ok) window.setTimeout(() => window.location.reload(), 450); }, [state]);
  return <tr><td><b>{profile.full_name || "İsimsiz kullanıcı"}</b><div className="sub mono">{profile.id.slice(0, 8)}…</div></td><td><form action={formAction} className="role-form"><input type="hidden" name="id" value={profile.id} /><select className="input" name="role" defaultValue={profile.role}><option value="sales">Satış Personeli</option><option value="admin">Admin</option><option value="super_admin">Süper Admin</option></select><button className="btn btn-ghost btn-sm" type="submit" disabled={pending}>{pending ? "…" : "Kaydet"}</button></form>{state && <span className={state.ok ? "form-success" : "form-error"}>{state.message}</span>}</td><td><span className="pill">{profile.active ? "Aktif" : "Pasif"}</span></td><td className="sub">{new Date(profile.created_at).toLocaleDateString("tr-TR")}</td></tr>;
}
