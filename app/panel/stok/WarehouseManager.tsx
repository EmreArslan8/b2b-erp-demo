"use client";

import { useActionState, useEffect, useState } from "react";

type Warehouse = { id: string; name: string };
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

export default function WarehouseManager({ warehouses, createAction, updateAction }: { warehouses: Warehouse[]; createAction: Action; updateAction: Action }) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null | undefined>(undefined);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await (editing ? updateAction(formData) : createAction(formData)); return { ok: true, message: "Depo kaydedildi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Depo kaydedilemedi." }; }
  }, null);
  useEffect(() => { if (state?.ok) window.setTimeout(() => window.location.reload(), 500); }, [state]);
  return <><button className="btn btn-ghost" type="button" onClick={() => setManagerOpen(true)}>Depoları yönet</button>{managerOpen && <div className="modal-bg open"><div className="modal"><div className="modal-head"><div><div className="crumb">Envanter</div><h3>Depolar</h3></div><button className="icon-btn" type="button" onClick={() => setManagerOpen(false)}>×</button></div><div className="warehouse-modal-list">{warehouses.map((warehouse) => <div className="warehouse-row" key={warehouse.id}><b>{warehouse.name}</b><button className="btn btn-ghost btn-sm" type="button" onClick={() => { setManagerOpen(false); setEditing(warehouse); }}>Düzenle</button></div>)}</div><button className="btn btn-primary" type="button" onClick={() => { setManagerOpen(false); setEditing(null); }}>+ Depo ekle</button></div></div>}{editing !== undefined && <div className="modal-bg open"><div className="modal"><div className="modal-head"><div><div className="crumb">Envanter</div><h3>{editing ? "Depoyu düzenle" : "Yeni depo"}</h3></div><button className="icon-btn" type="button" onClick={() => setEditing(undefined)}>×</button></div><form action={formAction}><input type="hidden" name="id" value={editing?.id ?? ""} /><div className="field"><label className="lbl">Depo adı</label><input className="input" name="name" defaultValue={editing?.name ?? ""} required autoFocus /></div>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}<div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={() => setEditing(undefined)}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button></div></form></div></div>}</>;
}
