"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, X } from "lucide-react";

type Profile = { id: string; full_name: string; role: string; active: boolean; created_at: string };
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

const roleLabels: Record<string, string> = { super_admin: "Süper Admin", admin: "Admin", sales: "Satış Personeli" };
const roleBadge: Record<string, string> = { super_admin: "st-supplier", admin: "st-approved", sales: "st-prep" };

function RoleOptions() {
  return <>
    <option value="sales">Satış Personeli</option>
    <option value="admin">Admin</option>
    <option value="super_admin">Süper Admin</option>
  </>;
}

function Banner({ state }: { state: State }) {
  if (!state) return null;
  return <div className={`save-banner ${state.ok ? "ok" : "err"}`}>{state.ok ? <Check size={16} /> : <AlertCircle size={16} />}<span>{state.message || (state.ok ? "İşlem başarılı." : "İşlem başarısız.")}</span></div>;
}

function useModalForm(action: Action, successText: string, onDone: () => void) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: successText }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "İşlem başarısız." }; }
  }, null);
  useEffect(() => { if (state?.ok) { router.refresh(); const timer = window.setTimeout(onDone, 900); return () => window.clearTimeout(timer); } }, [state, router, onDone]);
  return { state, formAction, pending };
}

function Modal({ crumb, title, onClose, children }: { crumb: string; title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-bg open"><div className="modal payment-modal"><div className="modal-head"><div><div className="crumb">{crumb}</div><h3>{title}</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={onClose}><X className="ic" /></button></div>{children}</div></div>;
}

function CreateUserForm({ action, onClose }: { action: Action; onClose: () => void }) {
  const { state, formAction, pending } = useModalForm(action, "Kullanıcı oluşturuldu.", onClose);
  return <form action={formAction} className="payment-modal-form"><Banner state={state} />
    <div className="field"><label className="lbl">Ad Soyad</label><input className="input" name="full_name" autoComplete="off" placeholder="Örn. Ahmet Yılmaz" /></div>
    <div className="field"><label className="lbl">E-posta</label><input className="input" name="email" type="email" autoComplete="off" placeholder="kullanici@firma.com" required /></div>
    <div className="field"><label className="lbl">Şifre</label><input className="input" name="password" type="text" autoComplete="off" placeholder="En az 6 karakter" required /></div>
    <div className="field"><label className="lbl">Rol</label><select className="input" name="role" defaultValue="sales"><RoleOptions /></select></div>
    <div className="field"><label className="lbl">Mevcut şifreniz <span className="sub" style={{ textTransform: "none", fontWeight: 400 }}>(onay)</span></label><input className="input" name="current_password" type="password" autoComplete="current-password" required /></div>
    <div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Oluşturuluyor…" : "Kullanıcı oluştur"}</button></div>
  </form>;
}

function EditUserForm({ profile, action, onClose }: { profile: Profile; action: Action; onClose: () => void }) {
  const { state, formAction, pending } = useModalForm(action, "Kullanıcı güncellendi.", onClose);
  return <form action={formAction} className="payment-modal-form"><Banner state={state} /><input type="hidden" name="id" value={profile.id} />
    <div className="field"><label className="lbl">Ad Soyad</label><input className="input" name="full_name" defaultValue={profile.full_name} autoComplete="off" placeholder="Ad Soyad" /></div>
    <div className="field"><label className="lbl">Rol</label><select className="input" name="role" defaultValue={profile.role}><RoleOptions /></select></div>
    <div className="field"><label className="lbl">Durum</label><select className="input" name="active" defaultValue={profile.active ? "true" : "false"}><option value="true">Aktif</option><option value="false">Pasif</option></select></div>
    <div className="field"><label className="lbl">Mevcut şifreniz <span className="sub" style={{ textTransform: "none", fontWeight: 400 }}>(onay)</span></label><input className="input" name="current_password" type="password" autoComplete="current-password" required /></div>
    <div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button></div>
  </form>;
}

function DeleteUserForm({ profile, action, onClose }: { profile: Profile; action: Action; onClose: () => void }) {
  const { state, formAction, pending } = useModalForm(action, "Kullanıcı silindi.", onClose);
  return <form action={formAction} className="delete-payment-form"><Banner state={state} /><input type="hidden" name="id" value={profile.id} />
    <div className="danger-callout"><b>{profile.full_name || "Bu kullanıcı"}</b><span>Kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.</span></div>
    <div className="field"><label className="lbl">Mevcut şifreniz</label><input className="input" name="current_password" type="password" autoComplete="current-password" required autoFocus /></div>
    <div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-danger" type="submit" disabled={pending}>{pending ? "Siliniyor…" : "Kalıcı olarak sil"}</button></div>
  </form>;
}

export default function RoleManager({ profiles, createAction, updateAction, deleteAction, canManage, serviceConfigured, currentUserId }: { profiles: Profile[]; createAction: Action; updateAction: Action; deleteAction: Action; canManage: boolean; serviceConfigured: boolean; currentUserId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  if (!canManage) return null;
  return <div className="card card-pad" style={{ marginTop: 14 }}>
    <div className="section-head"><div><h3>Kullanıcılar ve roller</h3><p className="sub">Kullanıcı ekleme, rol atama ve silme yalnızca Süper Admin tarafından yapılır.</p></div><div className="spacer" /><button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)} disabled={!serviceConfigured} title={serviceConfigured ? "" : "Sunucu yönetici anahtarı gerekli"}>+ Yeni Kullanıcı</button></div>
    {!serviceConfigured && <div className="save-banner err" style={{ marginTop: 8 }}><AlertCircle size={16} /><span>Yeni kullanıcı ekleme ve silme şu an kapalı — sunucu yönetici erişimi tanımlı değil. Rol ve durum güncelleme çalışır. Etkinleştirmek için sistem yöneticinize başvurun.</span></div>}
    <div className="tbl-wrap" style={{ marginTop: 14 }}><table className="tbl">
      <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>Kayıt</th><th></th></tr></thead>
      <tbody>{profiles.map((profile) => <tr key={profile.id} className={profile.active ? undefined : "product-row-hidden"}>
        <td><b>{profile.full_name || "İsimsiz"}</b>{profile.id === currentUserId && <span className="badge st-ready" style={{ marginLeft: 6 }}>Siz</span>}<div className="sub mono">{profile.id.slice(0, 8)}…</div></td>
        <td><span className={`badge ${roleBadge[profile.role] ?? "st-prep"}`}>{roleLabels[profile.role] ?? profile.role}</span></td>
        <td><span className={`badge ${profile.active ? "st-done" : "st-cancel"}`}>{profile.active ? "Aktif" : "Pasif"}</span></td>
        <td className="sub">{new Date(profile.created_at).toLocaleDateString("tr-TR")}</td>
        <td><div className="customer-link-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditTarget(profile)}>Düzenle</button><button className="btn btn-danger btn-sm" type="button" onClick={() => setDeleteTarget(profile)} disabled={!serviceConfigured || profile.id === currentUserId} title={profile.id === currentUserId ? "Kendinizi silemezsiniz" : ""}>Sil</button></div></td>
      </tr>)}</tbody>
    </table></div>
    {createOpen && <Modal crumb="Kullanıcı" title="Yeni kullanıcı" onClose={() => setCreateOpen(false)}><CreateUserForm action={createAction} onClose={() => setCreateOpen(false)} /></Modal>}
    {editTarget && <Modal crumb="Kullanıcı" title="Kullanıcıyı düzenle" onClose={() => setEditTarget(null)}><EditUserForm profile={editTarget} action={updateAction} onClose={() => setEditTarget(null)} /></Modal>}
    {deleteTarget && <Modal crumb="Kullanıcı silme" title="Silme işlemini onayla" onClose={() => setDeleteTarget(null)}><DeleteUserForm profile={deleteTarget} action={deleteAction} onClose={() => setDeleteTarget(null)} /></Modal>}
  </div>;
}
