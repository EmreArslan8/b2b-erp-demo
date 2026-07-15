"use client";

import { useActionState, useMemo, useState } from "react";

type Task = { id: string; title: string; description: string; status: string; due_date: string | null; assigned_to: string | null; profiles?: { full_name?: string } | { full_name?: string }[] | null };
type Profile = { id: string; full_name: string; role: string };
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

function TaskForm({ profiles, action }: { profiles: Profile[]; action: Action }) {
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => { try { await action(formData); return { ok: true, message: "Görev oluşturuldu." }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Görev oluşturulamadı." }; } }, null);
  return <form className="task-form" action={formAction}><div className="field"><label className="lbl">Başlık</label><input className="input" name="title" required placeholder="Görev başlığı" /></div><div className="field"><label className="lbl">Açıklama</label><textarea className="input" name="description" rows={2} placeholder="Görev detayları" /></div><div className="field"><label className="lbl">Atanan kullanıcı</label><select className="input" name="assigned_to"><option value="">Atanmamış</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || profile.role}</option>)}</select></div><div className="field"><label className="lbl">Son tarih</label><input className="input" name="due_date" type="date" /></div><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Ekleniyor…" : "Görev oluştur"}</button>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}</form>;
}

export default function TaskBoard({ tasks, profiles, createAction, statusAction }: { tasks: Task[]; profiles: Profile[]; createAction: Action; statusAction: Action }) {
  const [filter, setFilter] = useState("tumu");
  const filtered = useMemo(() => filter === "tumu" ? tasks : tasks.filter((task) => task.status === filter), [filter, tasks]);
  const statusLabel = (status: string) => status === "devam" ? "Devam Ediyor" : status === "tamam" ? "Tamamlandı" : "Açık";
  return <><div className="card card-pad"><div className="section-head"><div><div className="crumb">Yönetim</div><h3>Yeni görev</h3></div></div><TaskForm profiles={profiles} action={createAction} /></div><div className="card card-pad task-list-card"><div className="section-head"><div><h3>Görevler</h3><span className="sub">{filtered.length} görev</span></div><select className="input task-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="tumu">Tümü</option><option value="acik">Açık</option><option value="devam">Devam Ediyor</option><option value="tamam">Tamamlandı</option></select></div>{filtered.length ? <div className="task-list">{filtered.map((task) => { const assigned = Array.isArray(task.profiles) ? task.profiles[0]?.full_name : task.profiles?.full_name; return <div className="task-row" key={task.id}><div><b>{task.title}</b>{task.description && <p>{task.description}</p>}<small>{assigned || "Atanmamış"}{task.due_date ? ` · Son tarih: ${new Date(task.due_date).toLocaleDateString("tr-TR")}` : ""}</small></div><form action={statusAction}><input type="hidden" name="id" value={task.id} /><select className="input" name="status" defaultValue={task.status} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="acik">Açık</option><option value="devam">Devam Ediyor</option><option value="tamam">Tamamlandı</option></select><span className={`pill task-${task.status}`}>{statusLabel(task.status)}</span></form></div>; })}</div> : <div className="empty">Bu filtrede görev yok.</div>}</div></>;
}
