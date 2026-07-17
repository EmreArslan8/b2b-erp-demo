"use client";

import { useActionState, useEffect, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";

type Category = { id: string; name: string; total: number; active: number; subcategories: string[] };
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

function useFeedback(action: Action, successText: string) {
  return useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: successText }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "İşlem başarısız." }; }
  }, null);
}

function RenameForm({ category, action, onClose }: { category: Category; action: Action; onClose: () => void }) {
  const [state, formAction, pending] = useFeedback(action, "Kategori güncellendi.");
  return <form action={formAction} className="payment-modal-form"><input type="hidden" name="id" value={category.id} /><div className="field"><label className="lbl">Yeni kategori adı</label><input className="input" name="to" defaultValue={category.name} required autoFocus /></div><p className="sub">{category.total} ürünün kategori adı ilişkili olarak güncellenecek.</p>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}<div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button></div></form>;
}

function CreateForm({ action, categories, onClose }: { action: Action; categories: Category[]; onClose: () => void }) {
  const [state, formAction, pending] = useFeedback(action, "Kategori eklendi.");
  useEffect(() => { if (state?.ok) window.setTimeout(onClose, 500); }, [state, onClose]);
  return <form action={formAction} className="payment-modal-form"><div className="field"><label className="lbl">Üst kategori</label><select className="input" name="parent_id" defaultValue=""><option value="">Ana kategori olarak oluştur</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="field"><label className="lbl">Kategori adı</label><input className="input" name="name" placeholder="Örn. Medikal" required autoFocus /></div><p className="sub">Üst kategori seçerseniz kayıt alt kategori olarak oluşturulur.</p>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}<div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Ekleniyor…" : "Kategori Ekle"}</button></div></form>;
}

function DeleteForm({ category, action, onClose }: { category: Category; action: Action; onClose: () => void }) {
  const [state, formAction, pending] = useFeedback(action, "Kategori kaldırıldı.");
  return <form action={formAction} className="payment-modal-form"><input type="hidden" name="id" value={category.id} /><div className="danger-callout"><b>Kategoriyi kaldır</b><span>“{category.name}” kategorisi ve alt kategorileri silinecek. {category.total} ürün <b>kategorisiz</b> kalacak (ürünler silinmez).</span></div>{state && !state.ok && <p className="form-error">{state.message}</p>}<div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-danger" type="submit" disabled={pending}>{pending ? "Kaldırılıyor…" : "Kategoriyi kaldır"}</button></div></form>;
}

export default function CategoryManager({ categories, createAction, renameAction, deleteAction }: { categories: Category[]; createAction: Action; renameAction: Action; deleteAction: Action }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  return <>
    <div className="section-head category-page-head"><div><div className="crumb">Envanter</div><h2>Kategoriler</h2></div><div className="spacer" /><span className="pill">{categories.length} kategori</span><button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}>+ Yeni Kategori</button></div>
    <div className="card category-list-card"><div className="tbl-wrap"><table className="tbl category-table">
      <thead><tr><th>Kategori</th><th>Alt kategoriler</th><th className="num">Ürün</th><th></th></tr></thead>
      <tbody>{categories.length ? categories.map((category) => <tr key={category.name}>
        <td><b>{category.name}</b><div className="category-mobile-meta"><span>{category.total} ürün{category.active < category.total ? ` · ${category.active} aktif` : ""}</span><span>{category.subcategories.length ? category.subcategories.join(", ") : "Alt kategori yok"}</span></div></td>
        <td>{category.subcategories.length ? <span className="sub">{category.subcategories.join(", ")}</span> : <span className="sub">—</span>}</td>
        <td className="num"><b>{category.total}</b>{category.active < category.total && <span className="sub"> ({category.active} aktif)</span>}</td>
        <td className="category-actions"><div className="category-desktop-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={() => setRenameTarget(category)}>Düzenle</button><button className="btn btn-danger btn-sm" style={{ marginLeft: 5 }} type="button" onClick={() => setDeleteTarget(category)}>Sil</button></div><details className="row-menu category-mobile-menu"><summary className="icon-btn row-menu-trigger" aria-label={`${category.name} işlemleri`}><MoreHorizontal size={20} /></summary><div className="row-menu-pop"><button className="row-menu-item" type="button" onClick={() => setRenameTarget(category)}>Düzenle</button><button className="row-menu-item danger" type="button" onClick={() => setDeleteTarget(category)}>Sil</button></div></details></td>
      </tr>) : <tr><td colSpan={4}><div className="empty">Henüz kategori yok. Ürünlere kategori ekleyince burada listelenir.</div></td></tr>}</tbody>
    </table></div></div>
    <p className="catalog-foot">{categories.length} kategori · Kategori adını değiştirmek o kategorideki tüm ürünleri günceller.</p>
    {createOpen && <div className="modal-bg open"><div className="modal payment-modal"><div className="modal-head"><div><div className="crumb">Envanter</div><h3>Yeni kategori</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={() => setCreateOpen(false)}><X className="ic" /></button></div><CreateForm action={createAction} categories={categories} onClose={() => setCreateOpen(false)} /></div></div>}
    {renameTarget && <div className="modal-bg open"><div className="modal payment-modal"><div className="modal-head"><div><div className="crumb">Kategori</div><h3>Kategoriyi düzenle</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={() => setRenameTarget(null)}><X className="ic" /></button></div><RenameForm category={renameTarget} action={renameAction} onClose={() => setRenameTarget(null)} /></div></div>}
    {deleteTarget && <div className="modal-bg open"><div className="modal payment-modal"><div className="modal-head"><div><div className="crumb">Kategori</div><h3>Kategoriyi kaldır</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={() => setDeleteTarget(null)}><X className="ic" /></button></div><DeleteForm category={deleteTarget} action={deleteAction} onClose={() => setDeleteTarget(null)} /></div></div>}
  </>;
}
