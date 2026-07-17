"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";

type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

function useForm(action: Action, successText: string, refresh = false) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: successText }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "İşlem başarısız." }; }
  }, null);
  useEffect(() => {
    if (!state?.ok) return;
    setSaved(true);
    if (refresh) router.refresh();
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [state, refresh, router]);
  return { state, formAction, pending, saved };
}

function Banner({ state }: { state: State }) {
  if (!state) return null;
  return <div className={`save-banner ${state.ok ? "ok" : "err"}`}>{state.ok ? <Check size={16} /> : <AlertCircle size={16} />}<span>{state.message}</span></div>;
}

function SaveButton({ pending, saved, label }: { pending: boolean; saved: boolean; label: string }) {
  return <button className={`btn ${saved ? "btn-saved" : "btn-primary"}`} type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : saved ? "Kaydedildi ✓" : label}</button>;
}

export default function AccountManager({ fullName, email, roleLabel, profileAction, passwordAction }: { fullName: string; email: string; roleLabel: string; profileAction: Action; passwordAction: Action }) {
  const profile = useForm(profileAction, "Profil bilgileri kaydedildi.", true);
  const pass = useForm(passwordAction, "Şifreniz güncellendi.");
  const [emailValue, setEmailValue] = useState(email);
  const emailChanged = emailValue.trim().toLowerCase() !== email.toLowerCase();

  return <div className="account-grid">
    <div className="card card-pad">
      <div className="account-head"><div><h3>Profil bilgileri</h3><p className="sub">Ad soyad ve giriş e-postanız.</p></div><span className="pill">{roleLabel}</span></div>
      <form action={profile.formAction} className="account-form" autoComplete="off">
        <Banner state={profile.state} />
        <div className="field"><label className="lbl" htmlFor="acc-name">Ad Soyad</label><input className="input" id="acc-name" name="full_name" defaultValue={fullName} autoComplete="name" placeholder="Örn. Ahmet Yılmaz" required /></div>
        <div className="field"><label className="lbl" htmlFor="acc-email">E-posta</label><input className="input" id="acc-email" name="email" type="email" value={emailValue} onChange={(event) => setEmailValue(event.target.value)} autoComplete="email" required /></div>
        {emailChanged && <div className="field"><label className="lbl" htmlFor="acc-email-pass">Mevcut şifreniz <span className="sub" style={{ textTransform: "none", fontWeight: 400 }}>(e-posta değişikliği için)</span></label><input className="input" id="acc-email-pass" name="current_password" type="password" autoComplete="current-password" required /></div>}
        <div className="account-actions"><SaveButton pending={profile.pending} saved={profile.saved} label="Kaydet" /></div>
      </form>
    </div>

    <div className="card card-pad">
      <div className="account-head"><div><h3>Şifre değiştir</h3><p className="sub">Güvenliğiniz için mevcut şifrenizi doğrulayın.</p></div></div>
      <form action={pass.formAction} className="account-form" autoComplete="off">
        <Banner state={pass.state} />
        <div className="field"><label className="lbl" htmlFor="acc-cur">Mevcut şifre</label><input className="input" id="acc-cur" name="current_password" type="password" autoComplete="current-password" required /></div>
        <div className="field"><label className="lbl" htmlFor="acc-new">Yeni şifre</label><input className="input" id="acc-new" name="new_password" type="password" autoComplete="new-password" required /></div>
        <div className="field"><label className="lbl" htmlFor="acc-confirm">Yeni şifre (tekrar)</label><input className="input" id="acc-confirm" name="confirm_password" type="password" autoComplete="new-password" required /></div>
        <div className="account-actions"><SaveButton pending={pass.pending} saved={pass.saved} label="Şifreyi güncelle" /></div>
      </form>
    </div>
  </div>;
}
