"use client";

import { useActionState, useEffect, useRef } from "react";

type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

export default function ProductActionForm({ action, children, submitLabel }: { action: Action; children: React.ReactNode; submitLabel: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: "Ürün güncellendi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "İşlem sırasında hata oluştu." }; }
  }, null);

  useEffect(() => {
    if (state?.ok) {
      const details = formRef.current?.closest("details");
      if (details) window.setTimeout(() => details.removeAttribute("open"), 450);
    }
  }, [state]);

  return <form ref={formRef} className="product-action-form card card-pad" action={formAction}>{children}{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}<button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Güncelleniyor…" : submitLabel}</button></form>;
}
