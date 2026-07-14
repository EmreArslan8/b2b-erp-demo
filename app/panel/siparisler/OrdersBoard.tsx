"use client";

import { useActionState, useEffect, useRef, useState } from "react";

type Order = {
  id: string;
  order_no: string;
  status: string;
  note: string;
  discount: number;
  manual_total: number | null;
  created_at: string;
  customers: { name?: string } | { name?: string }[] | null;
  order_items: { id: string; qty: number; price: number; products: { name?: string; sku?: string; cost?: number; suppliers?: { name?: string } | { name?: string }[] | null } | { name?: string; sku?: string; cost?: number; suppliers?: { name?: string } | { name?: string }[] | null }[] | null }[];
};
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;
const statuses = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"];

function OrderActions({ order, updateAction, deleteAction }: { order: Order; updateAction: Action; deleteAction: Action }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await updateAction(formData); return { ok: true, message: "Durum güncellendi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "İşlem başarısız." }; }
  }, null);
  useEffect(() => { if (state?.ok) window.setTimeout(() => formRef.current?.closest("details")?.removeAttribute("open"), 500); }, [state]);
  return <div className="order-detail-actions"><form ref={formRef} action={formAction} className="order-status-form"><input type="hidden" name="id" value={order.id} /><label className="lbl" htmlFor={`status-${order.id}`}>Sipariş durumu</label><div className="inline-form"><select className="input" id={`status-${order.id}`} name="status" defaultValue={order.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Güncelle"}</button></div>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}</form><form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Bu sipariş ve geçmiş kayıtları kalıcı olarak silinsin mi?")) event.preventDefault(); }}><input type="hidden" name="id" value={order.id} /><button className="btn btn-danger" type="submit">Siparişi Sil</button></form></div>;
}

export default function OrdersBoard({ orders, updateAction, deleteAction }: { orders: Order[]; updateAction: Action; deleteAction: Action }) {
  const [printId, setPrintId] = useState<string | null>(null);
  function printSupplierOrder(id: string) { setPrintId(id); window.setTimeout(() => { window.print(); window.setTimeout(() => setPrintId(null), 300); }, 50); }
  return <div className="card card-pad"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Sipariş</th><th>Müşteri</th><th>Tarih</th><th>Durum</th><th className="num">Tutar</th><th></th></tr></thead><tbody>{orders.map((order) => { const customers = order.customers; const customerName = Array.isArray(customers) ? customers[0]?.name : customers?.name; const total = order.manual_total ?? order.order_items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0) - Number(order.discount ?? 0); const supplierGroups = new Map<string, { name: string; qty: number; total: number }[]>(); order.order_items.forEach((item) => { const products = item.products; const product = Array.isArray(products) ? products[0] : products; const suppliers = product?.suppliers; const supplier = Array.isArray(suppliers) ? suppliers[0] : suppliers; const name = supplier?.name ?? "Tedarikçi belirtilmemiş"; const rows = supplierGroups.get(name) ?? []; rows.push({ name: product?.name ?? "Ürün", qty: Number(item.qty), total: Number(item.qty) * Number(product?.cost ?? 0) }); supplierGroups.set(name, rows); }); return <tr key={order.id}><td colSpan={6}><details className="order-row"><summary><span className="order-row-main"><span className="mono"><b>{order.order_no}</b></span><span>{customerName ?? "—"}</span><span className="sub">{new Date(order.created_at).toLocaleDateString("tr-TR")}</span><span><span className={`badge ${order.status === "İptal Edildi" ? "st-cancel" : order.status === "Tamamlandı" ? "st-done" : "st-new"}`}>{order.status}</span></span><b className="order-row-total">₺{total.toFixed(2)}</b><span className="order-row-chevron">⌄</span></span></summary><div className="order-detail"><div><div className="lbl">Ürünler</div><div className="order-items">{order.order_items.map((item) => { const products = item.products; const product = Array.isArray(products) ? products[0] : products; return <div className="order-item" key={item.id}><span><b>{product?.name ?? "Ürün"}</b><small>{product?.sku ?? ""} · {item.qty} adet</small></span><span><small>Geliş ₺{Number(product?.cost ?? 0).toFixed(2)}</small><b>₺{(Number(item.qty) * Number(item.price)).toFixed(2)}</b></span></div>; })}</div>{order.note && <p className="order-note"><b>Not:</b> {order.note}</p>}<div className="supplier-actions"><span className="sub">Tedarikçiye gönderilecek tutarları göster</span><button className="btn btn-ghost btn-sm no-print" type="button" onClick={() => printSupplierOrder(order.id)}>Tedarikçi listesi / Yazdır</button></div><div className={`supplier-print ${printId === order.id ? "print-active" : ""}`}><div className="pdf-brand">TedarikPro</div><h2>Tedarikçi Sipariş Listesi · {order.order_no}</h2><p className="pdf-meta">Müşteri: {customerName ?? "—"}<br />Tarih: {new Date(order.created_at).toLocaleDateString("tr-TR")}</p>{[...supplierGroups.entries()].map(([supplier, rows]) => <section className="supplier-sheet" key={supplier}><h3>{supplier}</h3><table><thead><tr><th>Ürün</th><th>Miktar</th><th>Geliş Fiyatı</th><th>Ödenecek</th></tr></thead><tbody>{rows.map((row) => <tr key={`${supplier}-${row.name}`}><td>{row.name}</td><td>{row.qty}</td><td>₺{(row.total / row.qty).toFixed(2)}</td><td>₺{row.total.toFixed(2)}</td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Tedarikçiye Ödenecek Toplam</th><th>₺{rows.reduce((sum, row) => sum + row.total, 0).toFixed(2)}</th></tr></tfoot></table></section>)}</div></div><OrderActions order={order} updateAction={updateAction} deleteAction={deleteAction} /></div></details></td></tr>; })}</tbody></table></div></div>;
}
