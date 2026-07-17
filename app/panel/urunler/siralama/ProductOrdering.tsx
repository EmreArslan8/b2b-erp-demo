"use client";

import { useActionState, useState } from "react";
import { ListOrdered } from "lucide-react";

type Product = { id: string; name: string; sku: string; category: string; brand: string; sort_order: number };
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;

export default function ProductOrdering({ initialProducts, action }: { initialProducts: Product[]; action: Action }) {
  const [products, setProducts] = useState(initialProducts);
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); setDirty(false); return { ok: true, message: "Sıralama kaydedildi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Sıralama kaydedilemedi." }; }
  }, null);
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;
    setProducts((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
    setDirty(true);
  }
  return <div className="card card-pad product-ordering"><div className="ordering-note"><span className="ordering-note-icon" aria-hidden="true"><ListOrdered size={17} strokeWidth={2} /></span><div><b>Gösterim önceliği</b><span>Oklarla yerel sıralamayı değiştirin. Veritabanına yazmak için en son kaydedin.</span></div></div><form action={formAction}><input type="hidden" name="ordered_ids" value={JSON.stringify(products.map((product) => product.id))} /><div className="ordering-footer ordering-footer-top"><span className={dirty ? "ordering-dirty" : "ordering-clean"}>{dirty ? "Kaydedilmemiş değişiklikler var" : state?.ok ? state.message : "Sıra güncel"}</span><button className="btn btn-primary" type="submit" disabled={!dirty || pending}>{pending ? "Kaydediliyor…" : "Sıralamayı Kaydet"}</button></div><div className="ordering-list">{products.length ? products.map((product, index) => <div className={`ordering-row${dirty ? " ordering-row-pending" : ""}`} key={product.id}><span className="ordering-index">{String(index + 1).padStart(2, "0")}</span><span className="ordering-product"><b>{product.name}</b><small>{product.sku} · {product.category || "Kategorisiz"}{product.brand ? ` · ${product.brand}` : ""}</small></span><span className="ordering-actions"><button className="btn btn-ghost sort-move-btn" type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${product.name} yukarı taşı`}>↑</button><button className="btn btn-ghost sort-move-btn" type="button" onClick={() => move(index, 1)} disabled={index === products.length - 1} aria-label={`${product.name} aşağı taşı`}>↓</button></span></div>) : <div className="empty">Henüz ürün yok.</div>}</div>{state && !state.ok && <p className="form-error">{state.message}</p>}</form></div>;
}
