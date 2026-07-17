"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

type Customer = { id: string; name: string };
type Product = { id: string; name: string; sku?: string; price?: number; product_prices?: { customer_id: string; price: number }[] };
type Action = (formData: FormData) => void | Promise<void>;
type Line = { key: string; productId: string; qty: number };

export default function ManualOrderForm({ customers, products, action }: { customers: Customer[]; products: Product[]; action: Action }) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: crypto.randomUUID(), productId: products[0]?.id ?? "", qty: 1 }]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const priceOf = useMemo(() => {
    return (productId: string) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return 0;
      const custom = customerId ? product.product_prices?.find((row) => row.customer_id === customerId)?.price : undefined;
      return Number(custom ?? product.price ?? 0);
    };
  }, [products, customerId]);

  const total = lines.reduce((sum, line) => sum + priceOf(line.productId) * (Number(line.qty) || 0), 0);

  function reset() { setCustomerId(""); setNote(""); setLines([{ key: crypto.randomUUID(), productId: products[0]?.id ?? "", qty: 1 }]); setError(""); }
  function close() { setOpen(false); reset(); }
  function addLine() { setLines((current) => [...current, { key: crypto.randomUUID(), productId: products[0]?.id ?? "", qty: 1 }]); }
  function removeLine(key: string) { setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current)); }
  function updateLine(key: string, patch: Partial<Line>) { setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line))); }

  async function submit() {
    setError("");
    if (!customerId) { setError("Müşteri seçin."); return; }
    const items = lines.filter((line) => line.productId && Number(line.qty) > 0).map((line) => ({ productId: line.productId, qty: Number(line.qty) }));
    if (!items.length) { setError("En az bir ürün ve adet girin."); return; }
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("customer_id", customerId);
      formData.set("note", note);
      formData.set("items", JSON.stringify(items));
      await action(formData);
      close();
    } catch (err) { setError(err instanceof Error ? err.message : "Sipariş oluşturulamadı."); }
    finally { setPending(false); }
  }

  return <>
    <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>+ Manuel Sipariş</button>
    {open && <div className="modal-bg open"><div className="modal manual-order-modal">
      <div className="modal-head"><div><div className="crumb">Sipariş</div><h3>Manuel sipariş oluştur</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={close}><X className="ic" /></button></div>
      <div className="field"><label className="lbl">Müşteri</label><select className="input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Müşteri seçin…</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
      <div className="manual-order-lines">
        <div className="manual-order-line manual-order-line-head"><span>Ürün</span><span>Adet</span><span>Birim</span><span>Tutar</span><span /></div>
        {lines.map((line) => { const unit = priceOf(line.productId); return <div className="manual-order-line" key={line.key}>
          <select className="input" value={line.productId} onChange={(event) => updateLine(line.key, { productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}</select>
          <input className="input" type="number" min="0" step="1" value={line.qty} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateLine(line.key, { qty: Math.max(0, Number(event.target.value) || 0) })} />
          <span className="manual-order-unit">₺{unit.toFixed(2)}</span>
          <span className="manual-order-linetotal">₺{(unit * (Number(line.qty) || 0)).toFixed(2)}</span>
          <button className="cart-row-remove" type="button" aria-label="Satırı sil" onClick={() => removeLine(line.key)}><Trash2 size={16} /></button>
        </div>; })}
      </div>
      <button className="btn btn-ghost btn-sm" type="button" onClick={addLine} style={{ marginTop: 8 }}><Plus size={14} style={{ marginRight: 4 }} /> Satır ekle</button>
      <div className="field" style={{ marginTop: 12 }}><label className="lbl">Sipariş notu</label><textarea className="input" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="İsteğe bağlı not…" /></div>
      <div className="manual-order-total"><span>Genel Toplam</span><b>₺{total.toFixed(2)}</b></div>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={close}>Vazgeç</button><button className="btn btn-primary" type="button" onClick={submit} disabled={pending}>{pending ? "Oluşturuluyor…" : "Siparişi oluştur"}</button></div>
    </div></div>}
  </>;
}
