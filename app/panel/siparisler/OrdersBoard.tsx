"use client";

import { useActionState, useEffect, useRef, useState } from "react";

type Product = { id?: string; name?: string; sku?: string; cost?: number; price?: number; sort_order?: number; product_prices?: { customer_id: string; price: number }[]; suppliers?: { name?: string } | { name?: string }[] | null };
type Order = {
  id: string;
  order_no: string;
  status: string;
  note: string;
  discount: number;
  manual_total: number | null;
  created_at: string;
  customers: { name?: string } | { name?: string }[] | null;
  customer_id: string;
  order_items: { id: string; qty: number; price: number; products: Product | Product[] | null }[];
};
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;
type SupplierRow = { name: string; qty: number; total: number; sort_order: number };

const statuses = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"];

const statusClasses: Record<string, string> = {
  "Yeni Sipariş": "st-new",
  "Onaylandı": "st-approved",
  "Hazırlanıyor": "st-prep",
  "Tedarikçiye İletildi": "st-supplier",
  "Hazır": "st-ready",
  "Teslim Edildi": "st-delivered",
  "Tamamlandı": "st-done",
  "İptal Edildi": "st-cancel",
};

function first<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function ItemEdit({ orderId, item, updateAction, deleteAction }: { orderId: string; item: Order["order_items"][number]; updateAction: Action; deleteAction: Action }) {
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await updateAction(formData); return { ok: true, message: "Ürün güncellendi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Ürün güncellenemedi." }; }
  }, null);
  return <details className="order-item-edit"><summary>Düzenle</summary><form action={formAction}>
    <input type="hidden" name="id" value={item.id} /><input type="hidden" name="order_id" value={orderId} />
    <label>Adet<input className="input" name="qty" type="number" min="0.01" step="0.01" defaultValue={item.qty} /></label>
    <label>Birim satış<input className="input" name="price" type="number" min="0" step="0.01" defaultValue={item.price} /></label>
    <button className="btn btn-ghost" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</button><button className="btn btn-ghost" type="button" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>Vazgeç</button>
    {state && <span className={state.ok ? "form-success" : "form-error"}>{state.message}</span>}
  </form><form className="order-item-delete" action={deleteAction} onSubmit={(event) => { if (!window.confirm("Bu ürün siparişten silinsin mi?")) event.preventDefault(); else { const password = window.prompt("Onay için mevcut şifrenizi girin:"); if (!password) event.preventDefault(); else (event.currentTarget.elements.namedItem("current_password") as HTMLInputElement).value = password; } }}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="order_id" value={orderId} /><input type="hidden" name="current_password" /><button className="btn btn-danger" type="submit">Ürünü Sil</button></form></details>;
}

function AddOrderItem({ orderId, customerId, products, addAction }: { orderId: string; customerId: string; products: Product[]; addAction: Action }) {
  const firstProduct = products[0];
  const customerPrice = (product: Product) => product.product_prices?.find((item) => item.customer_id === customerId)?.price ?? product.price ?? 0;
  const [productId, setProductId] = useState(firstProduct?.id ?? "");
  const [price, setPrice] = useState(firstProduct ? customerPrice(firstProduct) : 0);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await addAction(formData); return { ok: true, message: "Ürün siparişe eklendi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Ürün eklenemedi." }; }
  }, null);
  if (!products.length) return <p className="order-add-empty">Eklenebilecek aktif ürün bulunamadı.</p>;
  return <details className="order-add-item"><summary>+ Siparişe ürün ekle</summary><form action={formAction}>
    <input type="hidden" name="order_id" value={orderId} /><input type="hidden" name="product_id" value={productId} /><input type="hidden" name="price" value={price} />
    <label className="order-add-product">Ürün<select className="input" value={productId} onChange={(event) => { const selected = products.find((product) => product.id === event.target.value); setProductId(event.target.value); setPrice(selected ? customerPrice(selected) : 0); }}>
      {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}
    </select></label>
    <label className="order-add-qty">Adet<input className="input" name="qty" type="number" min="0.01" step="0.01" defaultValue="1" /></label>
    <label className="order-add-price">Birim satış<input className="input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
    <span className="order-add-actions"><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Ekleniyor…" : "Ürünü ekle"}</button><button className="btn btn-ghost" type="button" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>Vazgeç</button></span>
    {state && <span className={state.ok ? "form-success" : "form-error"}>{state.message}</span>}
  </form></details>;
}

function OrderMetaForm({ order, action, manualAction }: { order: Order; action: Action; manualAction: Action }) {
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await action(formData); return { ok: true, message: "Sipariş bilgileri güncellendi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Sipariş bilgileri güncellenemedi." }; }
  }, null);
  return <><form className="order-meta-form" action={formAction}>
    <input type="hidden" name="id" value={order.id} />
    <label>İndirim (₺)<input className="input" name="discount" type="number" min="0" step="0.01" defaultValue={order.discount ?? 0} /></label>
    <label>Sipariş notu<textarea className="input" name="note" rows={2} defaultValue={order.note ?? ""} placeholder="Sipariş için not ekleyin" /></label>
    <button className="btn btn-ghost" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Bilgileri kaydet"}</button>
    {state && <span className={state.ok ? "form-success" : "form-error"}>{state.message}</span>}
  </form><form className="order-manual-total-form" action={manualAction}>
    <input type="hidden" name="id" value={order.id} />
    <label>Manuel toplam (₺)<input className="input" name="manual_total" type="number" min="0" step="0.01" defaultValue={order.manual_total ?? ""} placeholder="Otomatik hesapla" /></label>
    <button className="btn btn-ghost" type="submit">Toplamı kaydet</button>
  </form></>;
}

function OrderActions({ order, updateAction, updateDetailsAction, updateManualTotalAction, copyAction, deleteAction }: { order: Order; updateAction: Action; updateDetailsAction: Action; updateManualTotalAction: Action; copyAction: Action; deleteAction: Action }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await updateAction(formData); return { ok: true, message: "Durum güncellendi." }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "İşlem başarısız." }; }
  }, null);
  useEffect(() => { if (state?.ok) window.setTimeout(() => formRef.current?.closest("details")?.removeAttribute("open"), 500); }, [state]);
  return <div className="order-detail-actions">
    <form ref={formRef} action={formAction} className="order-status-form">
      <input type="hidden" name="id" value={order.id} />
      <label className="order-detail-title" htmlFor={`status-${order.id}`}>Sipariş durumu</label>
      <div className="inline-form"><select className="input" id={`status-${order.id}`} name="status" defaultValue={order.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Güncelle"}</button></div>
      {state && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
    </form>
    <details className="order-meta"><summary>Sipariş bilgilerini düzenle</summary><OrderMetaForm order={order} action={updateDetailsAction} manualAction={updateManualTotalAction} /></details>
    <form className="order-copy-form" action={copyAction} onSubmit={(event) => { if (!window.confirm("Bu sipariş yeni bir sipariş olarak kopyalansın mı?")) event.preventDefault(); }}><input type="hidden" name="id" value={order.id} /><button className="btn btn-ghost" type="submit">Siparişi kopyala</button></form>
    <div className="order-danger-zone"><span className="order-danger-label">Tehlikeli işlem</span><p>Sipariş ve işlem geçmişi kalıcı olarak silinir.</p><form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Bu sipariş ve geçmiş kayıtları kalıcı olarak silinsin mi?")) event.preventDefault(); else { const password = window.prompt("Onay için mevcut şifrenizi girin:"); if (!password) event.preventDefault(); else (event.currentTarget.elements.namedItem("current_password") as HTMLInputElement).value = password; } }}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="current_password" /><button className="btn btn-danger" type="submit">Siparişi Sil</button></form></div>
  </div>;
}

function SupplierPrint({ order, customerName, groups, active }: { order: Order; customerName: string; groups: Map<string, SupplierRow[]>; active: boolean }) {
  return <div className={`supplier-print ${active ? "print-active" : ""}`}>
    <div className="pdf-brand">TedarikPro</div>
    <h2>Tedarikçi Sipariş Listesi · {order.order_no}</h2>
    <p className="pdf-meta">Müşteri: {customerName}<br />Tarih: {new Date(order.created_at).toLocaleDateString("tr-TR")}</p>
    {[...groups.entries()].map(([supplier, rows]) => <section className="supplier-sheet" key={supplier}>
      <h3>{supplier}</h3>
      <table>
        <thead><tr><th>Ürün</th><th>Miktar</th><th>Geliş Fiyatı</th><th className="supplier-payable-column">Ödenecek</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={`${supplier}-${row.name}`}>
          <td>{row.name}</td>
          <td>{row.qty}</td>
          <td className="supplier-price-cell">₺{(row.total / row.qty).toFixed(2)}<small className="supplier-price-total">Toplam: ₺{row.total.toFixed(2)}</small></td>
          <td className="supplier-payable-column">₺{row.total.toFixed(2)}</td>
        </tr>)}</tbody>
        <tfoot>
          <tr className="supplier-screen-footer"><th colSpan={3}>Tedarikçiye Ödenecek Toplam</th><th>₺{rows.reduce((sum, row) => sum + row.total, 0).toFixed(2)}</th></tr>
          <tr className="supplier-print-footer"><th colSpan={2}>Tedarikçiye Ödenecek Toplam</th><th>₺{rows.reduce((sum, row) => sum + row.total, 0).toFixed(2)}</th></tr>
        </tfoot>
      </table>
    </section>)}
  </div>;
}

export default function OrdersBoard({ orders, products, updateAction, updateDetailsAction, updateManualTotalAction, copyAction, updateItemAction, addItemAction, deleteItemAction, deleteAction }: { orders: Order[]; products: Product[]; updateAction: Action; updateDetailsAction: Action; updateManualTotalAction: Action; copyAction: Action; updateItemAction: Action; addItemAction: Action; deleteItemAction: Action; deleteAction: Action }) {
  const [printId, setPrintId] = useState<string | null>(null);
  function printSupplierOrder(id: string) { setPrintId(id); window.setTimeout(() => { window.print(); window.setTimeout(() => setPrintId(null), 300); }, 50); }

  return <div className="card"><div className="tbl-wrap"><table className="tbl">
    <thead><tr><th>Sipariş</th><th>Müşteri</th><th>Tarih</th><th>Durum</th><th className="num">Tutar</th><th></th></tr></thead>
    <tbody>{orders.map((order) => {
      const customerName = first(order.customers)?.name ?? "—";
      const total = order.manual_total ?? order.order_items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0) - Number(order.discount ?? 0);
      const supplierGroups = new Map<string, SupplierRow[]>();
      order.order_items.forEach((item) => {
        const product = first(item.products);
        const supplier = first(product?.suppliers ?? null);
        const supplierName = supplier?.name ?? "Tedarikçi belirtilmemiş";
        const rows = supplierGroups.get(supplierName) ?? [];
        rows.push({ name: product?.name ?? "Ürün", qty: Number(item.qty), total: Number(item.qty) * Number(product?.cost ?? 0), sort_order: Number(product?.sort_order ?? Number.MAX_SAFE_INTEGER) });
        supplierGroups.set(supplierName, rows);
      });
      for (const rows of supplierGroups.values()) rows.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "tr"));
      return <tr key={order.id}><td colSpan={6}><details className="order-row">
        <summary><span className="order-row-main"><span className="mono"><b>{order.order_no}</b></span><span>{customerName}</span><span className="sub">{new Date(order.created_at).toLocaleDateString("tr-TR")}</span><span><span className={`badge ${statusClasses[order.status] ?? "st-new"}`}>{order.status}</span></span><b className="order-row-total">₺{total.toFixed(2)}</b><span className="order-row-chevron">⌄</span></span></summary>
        <div className="order-detail"><div className="order-detail-main">
          <div className="order-detail-title">Ürünler</div>
          <div className="order-items">{order.order_items.map((item) => { const product = first(item.products); return <div className="order-item" key={item.id}><span className="order-item-identity"><b>{product?.name ?? "Ürün"}</b><small>{product?.sku ?? ""} · {item.qty} adet</small><ItemEdit orderId={order.id} item={item} updateAction={updateItemAction} deleteAction={deleteItemAction} /></span><span className="order-item-pricing"><small>Geliş <b>₺{Number(product?.cost ?? 0).toFixed(2)}</b></small><small>Birim satış <b>₺{Number(item.price).toFixed(2)}</b></small><strong>Toplam ₺{(Number(item.qty) * Number(item.price)).toFixed(2)}</strong></span></div>; })}</div>
          {order.note && <p className="order-note"><b>Not:</b> {order.note}</p>}
          <AddOrderItem orderId={order.id} customerId={order.customer_id} products={products} addAction={addItemAction} />
          <div className="supplier-actions"><span><b>Tedarikçi sipariş listesi</b><small>Ürünleri tedarikçiye göre ayırıp yazdırır.</small></span><button className="btn btn-ghost no-print" type="button" onClick={() => printSupplierOrder(order.id)}>Listeyi Görüntüle / Yazdır</button></div>
          <SupplierPrint order={order} customerName={customerName} groups={supplierGroups} active={printId === order.id} />
        </div><OrderActions order={order} updateAction={updateAction} updateDetailsAction={updateDetailsAction} updateManualTotalAction={updateManualTotalAction} copyAction={copyAction} deleteAction={deleteAction} /></div>
      </details></td></tr>;
    })}</tbody>
  </table></div></div>;
}
