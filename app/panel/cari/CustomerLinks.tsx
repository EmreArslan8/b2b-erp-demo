"use client";

import { useActionState, useEffect, useState } from "react";

type Customer = {
  id: string; code: string; name: string; contact: string; phone: string; link_slug: string; active: boolean;
  orders?: { manual_total: number | null; discount: number; order_items: { qty: number; price: number }[] }[];
  payments?: { id: string; amount: number; method: string; note: string; created_at: string }[];
};
type Action = (formData: FormData) => void | Promise<void>;
type PaymentState = { ok: boolean; message: string } | null;

function PaymentForm({ customer, action, onClose }: { customer: Customer; action: Action; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(async (_previous: PaymentState, formData: FormData): Promise<PaymentState> => {
    try { await action(formData); return { ok: true, message: "Tahsilat kaydedildi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Tahsilat kaydedilemedi." }; }
  }, null);
  useEffect(() => { if (state?.ok) window.setTimeout(onClose, 650); }, [state, onClose]);
  return <form action={formAction} className="payment-modal-form"><input type="hidden" name="customer_id" value={customer.id} /><div className="field"><label className="lbl">Tutar</label><input className="input" name="amount" type="number" min="0.01" step="0.01" required autoFocus /></div><div className="field"><label className="lbl">Yöntem</label><select className="input" name="method"><option>Nakit</option><option>Havale</option><option>Kredi Kartı</option></select></div><div className="field"><label className="lbl">Not</label><input className="input" name="note" placeholder="Ödeme açıklaması…" /></div>{state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}<div className="modal-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Tahsilatı Kaydet"}</button></div></form>;
}

export default function CustomerLinks({ customers, paymentAction }: { customers: Customer[]; paymentAction: Action }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  function getLink(slug: string) { return `${origin}/siparis/${slug}`; }
  async function copyLink(slug: string) { await navigator.clipboard.writeText(getLink(slug)); setCopied(slug); window.setTimeout(() => setCopied(null), 1800); }
  return <><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Kod</th><th>Firma</th><th>Satış</th><th>Tahsilat</th><th>Bakiye</th><th>Link</th></tr></thead><tbody>{customers.map((customer) => {
    const sales = (customer.orders ?? []).reduce((sum, order) => sum + (order.manual_total ?? order.order_items.reduce((total, item) => total + Number(item.qty) * Number(item.price), 0) - Number(order.discount ?? 0)), 0);
    const paid = (customer.payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
    return <tr key={customer.id}><td className="mono">{customer.code}</td><td><b>{customer.name}</b><div className="sub">{customer.contact || "Yetkili belirtilmemiş"}</div></td><td className="num">₺{sales.toFixed(2)}</td><td className="num">₺{paid.toFixed(2)}</td><td className={`num ${sales - paid > 0 ? "danger-text" : ""}`}><b>₺{(sales - paid).toFixed(2)}</b></td><td><div className="customer-link-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={() => copyLink(customer.link_slug)}>{copied === customer.link_slug ? "Kopyalandı ✓" : "Linki Kopyala"}</button><a className="btn btn-primary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${customer.name} sipariş linkiniz: ${getLink(customer.link_slug)}`)}`} target="_blank" rel="noreferrer">WhatsApp</a><button className="btn btn-ghost btn-sm" type="button" onClick={() => setPaymentCustomer(customer)}>Tahsilat</button></div></td></tr>;
  })}</tbody></table></div>{paymentCustomer && <div className="modal-bg open"><div className="modal payment-modal"><div className="modal-head"><div><div className="crumb">Cari tahsilat</div><h3>{paymentCustomer.name}</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={() => setPaymentCustomer(null)}>×</button></div><section><h4>Tahsilat Geçmişi</h4>{paymentCustomer.payments?.length ? <div className="payment-history">{paymentCustomer.payments.map((payment) => <div className="payment-history-row" key={payment.id}><div><b>₺{Number(payment.amount).toFixed(2)}</b><span>{payment.method}</span></div><div className="sub">{new Date(payment.created_at).toLocaleDateString("tr-TR")}{payment.note && <><br />{payment.note}</>}</div></div>)}</div> : <div className="empty">Henüz tahsilat kaydı yok.</div>}</section><div className="payment-divider" /><section><h4>Yeni Tahsilat Ekle</h4><PaymentForm customer={paymentCustomer} action={paymentAction} onClose={() => setPaymentCustomer(null)} /></section></div></div>}</>;
}
