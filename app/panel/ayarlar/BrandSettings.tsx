"use client";

import { useActionState } from "react";

type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

export default function BrandSettings({ brandName, action, canManage }: { brandName: string; action: Action; canManage: boolean }) {
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: "Marka adı güncellendi. Panel, giriş ekranı, müşteri linki ve PDF'lerde geçerli olur." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Marka adı güncellenemedi." }; }
  }, null);
  return <div className="card card-pad" style={{ marginTop: 14 }}>
    <h3>Marka adı</h3>
    <p className="sub" style={{ marginTop: 4 }}>Uygulama genelinde görünen isim (ör. “Sağlık Tedarik”). Panel başlığı, giriş ekranı, müşteri sipariş linki ve tedarikçi PDF'lerinde kullanılır.</p>
    {canManage ? <form action={formAction} className="brand-settings-form" style={{ marginTop: 12 }}>
      <div className="field"><label className="lbl" htmlFor="brand_name">Marka / uygulama adı</label><input className="input" id="brand_name" name="brand_name" defaultValue={brandName} maxLength={60} required /></div>
      {state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ marginTop: 8 }}>{pending ? "Kaydediliyor…" : "Kaydet"}</button>
    </form> : <p className="sub" style={{ marginTop: 10 }}>Yalnızca Admin/Süper Admin marka adını değiştirebilir. Mevcut ad: <b>{brandName}</b></p>}
  </div>;
}
