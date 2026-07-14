"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const { error: loginError } = await createClient().auth.signInWithPassword({ email, password });
    if (loginError) { setError(loginError.message); setLoading(false); return; }
    window.location.assign(searchParams.get("next") || "/panel");
  }

  return <main className="auth-page"><div className="auth-card card"><div className="brand"><span className="logo-mark">▣</span> TedarikPro</div><p className="crumb">Yönetim erişimi</p><h1>Tekrar hoş geldin</h1><p className="sub">Operasyon konsoluna giriş yap.</p><form onSubmit={submit} style={{ marginTop: 22 }}><div className="field"><label className="lbl" htmlFor="email">E-posta</label><input className="input" id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="field"><label className="lbl" htmlFor="password">Şifre</label><input className="input" id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error && <p className="auth-error">{error}</p>}<button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={loading}>{loading ? "Giriş yapılıyor…" : "Giriş yap"}</button></form></div></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-page"><div className="auth-card card">Yükleniyor…</div></main>}><LoginForm /></Suspense>;
}
