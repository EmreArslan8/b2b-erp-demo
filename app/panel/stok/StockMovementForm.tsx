"use client";

import { useActionState, useEffect, useState } from "react";

type Action = (formData: FormData) => void | Promise<void>;
type Option = { id: string; name: string; sku?: string; unit?: string };
type State = { ok: boolean; message: string } | null;

export default function StockMovementForm({ products, warehouses, action }: { products: Option[]; warehouses: Option[]; action: Action }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Giriş");
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: "Stok hareketi kaydedildi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Stok hareketi kaydedilemedi." }; }
  }, null);
  useEffect(() => { if (state?.ok) window.setTimeout(() => { setOpen(false); window.location.reload(); }, 650); }, [state]);
  return <><button className="btn btn-ghost" type="button" onClick={() => setOpen(true)}>Stok hareketi</button>{open && <div className="modal-bg open"><div className="modal stock-modal"><div className="modal-head"><div><div className="crumb">Envanter</div><h3>Stok hareketi</h3></div><button className="icon-btn" type="button" onClick={() => setOpen(false)}>×</button></div><form action={formAction} className="stock-form"><div className="field"><label className="lbl">Hareket türü</label><select className="input" name="type" value={type} onChange={(event) => setType(event.target.value)}><option>Giriş</option><option>Çıkış</option><option>Transfer</option></select></div><div className="field"><label className="lbl">Ürün</label><select className="input" name="product_id" required><option value="">Ürün seçin</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></div>{type === "Transfer" ? <><div className="field"><label className="lbl">Kaynak depo</label><select className="input" name="from_warehouse" required><option value="">Kaynak seçin</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div><div className="field"><label className="lbl">Hedef depo</label><select className="input" name="to_warehouse" required><option value="">Hedef seçin</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div></> : <div className="field"><label className="lbl">Depo</label><select className="input" name="warehouse_id" required><option value="">Depo seçin</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div>}<div className="field"><label className="lbl">Miktar</label><input className="input" name="qty" type="number" min="0.01" step="0.01" required /></div><div className="field"><label className="lbl">Referans / Not</label><input className="input" name="ref" placeholder="Fatura no veya açıklama…" /></div>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}<div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Hareketi Kaydet"}</button></div></form></div></div>}</>;
}
