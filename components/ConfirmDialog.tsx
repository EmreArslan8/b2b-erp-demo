"use client";

import { useState } from "react";
import Modal from "./Modal";

export type ConfirmConfig = { title: string; message: string; confirmLabel: string; danger?: boolean; needsPassword?: boolean; onConfirm: (password: string) => Promise<void> };

// Ortak onay modalı. window.confirm/prompt/alert yerine her yerde bu kullanılır.
export default function ConfirmDialog({ config, onClose }: { config: ConfirmConfig; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (config.needsPassword && !password) { setError("Onay için mevcut şifrenizi girin."); return; }
    setPending(true); setError("");
    try { await config.onConfirm(password); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "İşlem başarısız."); setPending(false); }
  }
  return <Modal title={config.title} onClose={onClose}>
    <p className="sub" style={{ margin: "6px 0 4px" }}>{config.message}</p>
    {config.needsPassword && <div className="field" style={{ marginTop: 10 }}><label className="lbl" htmlFor="confirm-dialog-password">Mevcut şifreniz</label><input className="input" id="confirm-dialog-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /></div>}
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose} disabled={pending}>Vazgeç</button><button className={`btn ${config.danger ? "btn-danger" : "btn-primary"}`} type="button" onClick={confirm} disabled={pending}>{pending ? "İşleniyor…" : config.confirmLabel}</button></div>
  </Modal>;
}
