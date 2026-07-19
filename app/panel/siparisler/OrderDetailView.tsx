"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, type MouseEvent } from "react";
import { ArrowLeft, MoreHorizontal, Printer, SlidersHorizontal } from "lucide-react";
import { ConfirmDialog, type ConfirmConfig } from "@/components";

type Product = { id?: string; name?: string; sku?: string; cost?: number; average_cost?: number; price?: number; sort_order?: number; product_prices?: { customer_id: string; price: number }[]; suppliers?: { name?: string } | { name?: string }[] | null };
type Order = {
  id: string; order_no: string; status: string; note: string; discount: number; shipping_cost?: number; other_costs?: number; manual_total: number | null; created_at: string;
  customers: { name?: string } | { name?: string }[] | null; customer_id: string;
  order_items: { id: string; qty: number; price: number; available_at_order?: number; fulfillment_source?: string; warehouse_qty?: number; supplier_qty?: number; reserved_qty?: number; unit_cost?: number; net_profit?: number; products: Product | Product[] | null }[];
};
type Action = (formData: FormData) => void | Promise<void>;
type State = { ok: boolean; message: string } | null;
type SupplierRow = { name: string; qty: number; total: number; sort_order: number };

const pipelineStatuses = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı"];
const statusClasses: Record<string, string> = { "Yeni Sipariş": "st-new", "Onaylandı": "st-approved", "Hazırlanıyor": "st-prep", "Tedarikçiye İletildi": "st-supplier", "Hazır": "st-ready", "Teslim Edildi": "st-delivered", "Tamamlandı": "st-done", "İptal Edildi": "st-cancel" };

const ALL_SUPPLIERS = "__all__";
const fulfillmentSources = ["Kendi depo", "Tedarikçi", "Depo + tedarikçi", "Başka depo"];

function first<T>(value: T | T[] | null): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }

function sourceClass(source: string) {
  if (source === "Kendi depo") return "own";
  if (source === "Depo + tedarikçi") return "split";
  if (source === "Başka depo") return "other";
  return "supplier";
}

function OrderItemRow({ orderId, item, updateAction, fulfillmentAction, deleteAction }: { orderId: string; item: Order["order_items"][number]; updateAction: Action; fulfillmentAction: Action; deleteAction: Action }) {
  const product = first(item.products);
  const [editing, setEditing] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [qty, setQty] = useState(String(item.qty));
  const [price, setPrice] = useState(String(item.price));
  const [deletePassword, setDeletePassword] = useState("");
  const [source, setSource] = useState(item.fulfillment_source ?? "Tedarikçi");
  const [warehouseQty, setWarehouseQty] = useState(String(item.warehouse_qty ?? 0));
  const [supplierQty, setSupplierQty] = useState(String(item.supplier_qty ?? item.qty));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const unitCost = Number(item.unit_cost ?? product?.average_cost ?? product?.cost ?? 0);
  const productProfit = Number(item.qty) * (Number(item.price) - unitCost);

  function startEdit() { setQty(String(item.qty)); setPrice(String(item.price)); setError(""); setDeleteMode(false); setEditing(true); }
  function cancel() { setEditing(false); setDeleteMode(false); setError(""); }
  async function save() {
    const qtyNum = Number(qty); const priceNum = Number(price);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) { setError("Adet sıfırdan büyük olmalı."); return; }
    if (!Number.isFinite(priceNum) || priceNum < 0) { setError("Fiyat geçerli değil."); return; }
    setPending(true); setError("");
    const data = new FormData(); data.set("id", item.id); data.set("order_id", orderId); data.set("qty", String(qtyNum)); data.set("price", String(priceNum));
    try { await updateAction(data); setEditing(false); } catch (err) { setError(err instanceof Error ? err.message : "Güncellenemedi."); } finally { setPending(false); }
  }
  async function saveFulfillment() {
    const own = Number(warehouseQty); const supplier = Number(supplierQty);
    if (!Number.isFinite(own) || own < 0 || !Number.isFinite(supplier) || supplier < 0) { setError("Karşılama miktarları geçerli değil."); return; }
    if (Math.abs(own + supplier - Number(item.qty)) > 0.0001) { setError("Depo ve tedarikçi miktarı sipariş miktarına eşit olmalı."); return; }
    setPending(true); setError("");
    const data = new FormData(); data.set("id", item.id); data.set("order_id", orderId); data.set("fulfillment_source", source); data.set("warehouse_qty", String(own)); data.set("supplier_qty", String(supplier)); data.set("available_at_order", String(item.available_at_order ?? 0));
    try { await fulfillmentAction(data); } catch (err) { setError(err instanceof Error ? err.message : "Karşılama güncellenemedi."); } finally { setPending(false); }
  }
  async function confirmDelete() {
    if (!deletePassword) { setError("Onay için şifrenizi girin."); return; }
    setPending(true); setError("");
    const data = new FormData(); data.set("id", item.id); data.set("order_id", orderId); data.set("current_password", deletePassword);
    try { await deleteAction(data); } catch (err) { setError(err instanceof Error ? err.message : "Silinemedi."); setPending(false); }
  }

  const metric = (label: string, value: string | number, extra?: string, tone?: string) => <div className={`order-line-metric${tone ? ` ${tone}` : ""}`}>
    <span>{label}</span>
    <b>{value}</b>
    {extra && <small>{extra}</small>}
  </div>;

  if (!editing) {
    return <article className="order-line-card">
      <div className="order-line-main">
        <div>
          <b className="order-line-product">{product?.name ?? "Ürün"}</b>
          <span className="sub mono">{product?.sku ?? ""}</span>
        </div>
        <span className={`fulfillment-source ${sourceClass(item.fulfillment_source ?? "Tedarikçi")}`}>{item.fulfillment_source ?? "Tedarikçi"}</span>
        <button type="button" className="btn btn-ghost btn-sm order-line-edit-btn" onClick={startEdit}>Düzenle</button>
      </div>
      <div className="order-line-metrics">
        {metric("Sipariş miktarı", item.qty)}
        {metric("Depodaki satılabilir miktar", Number(item.available_at_order ?? 0))}
        {metric("Depodan karşılanacak miktar", Number(item.warehouse_qty ?? 0), `Rezerve ${Number(item.reserved_qty ?? 0)}`, Number(item.warehouse_qty ?? 0) > 0 ? "stock-tone" : undefined)}
        {metric("Tedarikçiden karşılanacak miktar", Number(item.supplier_qty ?? 0), undefined, Number(item.supplier_qty ?? 0) > 0 ? "supplier-tone" : undefined)}
        {metric("Alış maliyeti", `₺${unitCost.toFixed(2)}`)}
        {metric("Müşteri satış fiyatı", `₺${Number(item.price).toFixed(2)}`)}
        {metric("Ürün kârı", `₺${productProfit.toFixed(2)}`, undefined, productProfit < 0 ? "loss-tone" : "profit-tone")}
        {metric("Toplam", `₺${(Number(item.qty) * Number(item.price)).toFixed(2)}`, undefined, "total-tone")}
      </div>
    </article>;
  }
  return <article className="order-line-card order-item-editing">
    <div className="order-line-main">
      <div>
        <b className="order-line-product">{product?.name ?? "Ürün"}</b>
        <span className="sub mono">{product?.sku ?? ""}</span>
      </div>
      <select className="input order-line-source-select" value={source} onChange={(event) => setSource(event.target.value)} disabled={deleteMode}>{fulfillmentSources.map((option) => <option key={option}>{option}</option>)}</select>
    </div>
    <div className="order-line-metrics order-line-edit-grid">
      <label className="order-line-field"><span>Sipariş miktarı</span><input className="input order-item-input" type="number" min="0.01" step="0.01" value={qty} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQty(event.target.value)} aria-label="Adet" disabled={deleteMode} /></label>
      {metric("Depodaki satılabilir miktar", Number(item.available_at_order ?? 0))}
      <label className="order-line-field"><span>Depodan karşılanacak miktar</span><input className="input order-item-input" type="number" min="0" step="0.01" value={warehouseQty} onChange={(event) => setWarehouseQty(event.target.value)} aria-label="Depodan karşılanacak miktar" disabled={deleteMode} /></label>
      <label className="order-line-field"><span>Tedarikçiden karşılanacak miktar</span><input className="input order-item-input" type="number" min="0" step="0.01" value={supplierQty} onChange={(event) => setSupplierQty(event.target.value)} aria-label="Tedarikçiden karşılanacak miktar" disabled={deleteMode} /></label>
      {metric("Alış maliyeti", `₺${unitCost.toFixed(2)}`)}
      <label className="order-line-field"><span>Müşteri satış fiyatı</span><input className="input order-item-input" type="number" min="0" step="0.01" value={price} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setPrice(event.target.value)} aria-label="Birim satış" disabled={deleteMode} /></label>
      {metric("Ürün kârı", `₺${productProfit.toFixed(2)}`, undefined, productProfit < 0 ? "loss-tone" : "profit-tone")}
      {metric("Toplam", `₺${(Number(qty || 0) * Number(price || 0)).toFixed(2)}`, undefined, "total-tone")}
    </div>
    <div className="order-item-edit-actions">
      {deleteMode ? <>
        <input className="input order-item-input" type="password" placeholder="Şifre" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} aria-label="Mevcut şifreniz" autoFocus />
        <button type="button" className="btn btn-danger btn-sm" onClick={confirmDelete} disabled={pending}>{pending ? "…" : "Sil"}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDeleteMode(false); setError(""); }} disabled={pending}>Vazgeç</button>
      </> : <>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>{pending ? "…" : "Kaydet"}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancel} disabled={pending}>Vazgeç</button>
        <button type="button" className="btn btn-danger btn-sm order-item-remove" onClick={() => { setError(""); setDeleteMode(true); }} disabled={pending}>Sil</button>
      </>}
      {error && <span className="form-error">{error}</span>}
      {!deleteMode && <button type="button" className="btn btn-ghost btn-sm" onClick={saveFulfillment} disabled={pending}>Karşılama kaydet</button>}
    </div>
  </article>;
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
    <label>Nakliye (₺)<input className="input" name="shipping_cost" type="number" min="0" step="0.01" defaultValue={order.shipping_cost ?? 0} /></label>
    <label>Diğer masraf (₺)<input className="input" name="other_costs" type="number" min="0" step="0.01" defaultValue={order.other_costs ?? 0} /></label>
    <label>Sipariş notu<textarea className="input" name="note" rows={2} defaultValue={order.note ?? ""} placeholder="Sipariş için not ekleyin" /></label>
    <button className="btn btn-ghost" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Bilgileri kaydet"}</button>
    {state && <span className={state.ok ? "form-success" : "form-error"}>{state.message}</span>}
  </form><form className="order-manual-total-form" action={manualAction}>
    <input type="hidden" name="id" value={order.id} />
    <label>Manuel toplam (₺)<input className="input" name="manual_total" type="number" min="0" step="0.01" defaultValue={order.manual_total ?? ""} placeholder="Otomatik hesapla" /></label>
    <button className="btn btn-ghost" type="submit">Toplamı kaydet</button>
  </form></>;
}

function SupplierPrint({ order, customerName, groups, target, brandName }: { order: Order; customerName: string; groups: Map<string, SupplierRow[]>; target: string | null; brandName: string }) {
  const printed = target === ALL_SUPPLIERS ? [...groups.keys()] : target ? [target] : [];
  const supplierCount = printed.length;
  return <div className={`supplier-print ${target ? "print-active" : ""}`}>
    {[...groups.entries()].filter(([supplier]) => !target || printed.includes(supplier)).map(([supplier, rows], index) => <section className="supplier-sheet" key={supplier}>
      <div className="supplier-sheet-head">
        <div className="pdf-brand">{brandName}</div>
        <div className="supplier-sheet-meta"><b>{order.order_no}</b><span>{new Date(order.created_at).toLocaleDateString("tr-TR")}</span></div>
      </div>
      <h3 className="supplier-sheet-title">Tedarikçi Adisyonu · {supplier}</h3>
      <p className="pdf-meta">Müşteri: {customerName}{supplierCount > 1 ? ` · Tedarikçi ${index + 1}/${supplierCount}` : ""}</p>
      <table>
        <thead><tr><th>Ürün</th><th>Miktar</th><th>Geliş Fiyatı</th><th className="supplier-payable-column">Ödenecek</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={`${supplier}-${row.name}`}>
          <td>{row.name}</td><td>{row.qty}</td>
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

export default function OrderDetailView({ order, products, brandName, updateAction, updateDetailsAction, updateManualTotalAction, copyAction, updateItemAction, updateFulfillmentAction, addItemAction, deleteItemAction, deleteAction }: { order: Order; products: Product[]; brandName: string; updateAction: Action; updateDetailsAction: Action; updateManualTotalAction: Action; copyAction: Action; updateItemAction: Action; updateFulfillmentAction: Action; addItemAction: Action; deleteItemAction: Action; deleteAction: Action }) {
  const router = useRouter();
  const customerName = first(order.customers)?.name ?? "—";
  const cancelled = order.status === "İptal Edildi";
  const [infoOpen, setInfoOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<State>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  const withRefresh = (action: Action): Action => async (formData: FormData) => { await action(formData); router.refresh(); };

  const subtotal = order.order_items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
  const discount = Number(order.discount ?? 0);
  const total = order.manual_total ?? subtotal - discount;
  const grossProfit = order.order_items.reduce((sum, item) => {
    const product = first(item.products);
    const unitCost = Number(item.unit_cost ?? product?.average_cost ?? product?.cost ?? 0);
    return sum + Number(item.qty) * (Number(item.price) - unitCost);
  }, 0);
  const netProfit = grossProfit - discount - Number(order.shipping_cost ?? 0) - Number(order.other_costs ?? 0);

  const supplierGroups = new Map<string, SupplierRow[]>();
  order.order_items.forEach((item) => {
    const product = first(item.products);
    const supplierName = first(product?.suppliers ?? null)?.name ?? "Tedarikçi belirtilmemiş";
    const rows = supplierGroups.get(supplierName) ?? [];
    const supplierQty = Number(item.supplier_qty ?? item.qty);
    if (supplierQty <= 0) return;
    const unitCost = Number(item.unit_cost ?? product?.average_cost ?? product?.cost ?? 0);
    rows.push({ name: product?.name ?? "Ürün", qty: supplierQty, total: supplierQty * unitCost, sort_order: Number(product?.sort_order ?? Number.MAX_SAFE_INTEGER) });
    supplierGroups.set(supplierName, rows);
  });
  for (const rows of supplierGroups.values()) rows.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "tr"));

  async function applyStatus(status: string) {
    setStatusPending(true); setStatusMessage(null);
    try { const data = new FormData(); data.set("id", order.id); data.set("status", status); await updateAction(data); router.refresh(); setStatusMessage({ ok: true, message: "Durum güncellendi." }); window.setTimeout(() => setStatusMessage(null), 2500); }
    catch (error) { setStatusMessage({ ok: false, message: error instanceof Error ? error.message : "Durum güncellenemedi." }); }
    finally { setStatusPending(false); }
  }
  function changeStatus(status: string) {
    if (statusPending || status === order.status) return;
    if (status === "Onaylandı") { setConfirmConfig({ title: "Siparişi onayla", message: "Sipariş onaylanacak ve depodan karşılanacak ürünler rezerve stok olarak ayrılacak.", confirmLabel: "Onayla", onConfirm: async () => { await applyStatus("Onaylandı"); } }); return; }
    if (["Teslim Edildi", "Tamamlandı"].includes(status)) { setConfirmConfig({ title: "Siparişi kapat", message: "Rezerve ürünler fiziksel stoktan düşülecek.", confirmLabel: "Stoktan düş", onConfirm: async () => { await applyStatus(status); } }); return; }
    void applyStatus(status);
  }

  function printSupplier(target: string) { setPrintTarget(target); window.setTimeout(() => { window.print(); window.setTimeout(() => setPrintTarget(null), 300); }, 50); }

  function closeMenu(event: MouseEvent<HTMLButtonElement>) { event.currentTarget.closest("details")?.removeAttribute("open"); }
  function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    closeMenu(event);
    setConfirmConfig({ title: "Siparişi kopyala", message: "Bu sipariş yeni bir sipariş olarak kopyalanacak.", confirmLabel: "Kopyala", onConfirm: async () => { const data = new FormData(); data.set("id", order.id); await copyAction(data); router.push("/panel/siparisler"); } });
  }
  function toggleCancel(event: MouseEvent<HTMLButtonElement>) {
    closeMenu(event);
    setConfirmConfig({ title: cancelled ? "Siparişi geri aç" : "Siparişi iptal et", message: cancelled ? "Sipariş yeniden açılacak (Yeni Sipariş durumuna alınır)." : "Sipariş iptal edilecek.", confirmLabel: cancelled ? "Geri aç" : "İptal et", danger: !cancelled, onConfirm: async () => { await applyStatus(cancelled ? "Yeni Sipariş" : "İptal Edildi"); } });
  }
  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    closeMenu(event);
    setConfirmConfig({ title: "Siparişi pasife al", message: "İşlem görmüş sipariş kalıcı silinmeyecek, iptal durumuna alınacak ve geçmişte korunacak.", confirmLabel: "İptal durumuna al", danger: true, needsPassword: true, onConfirm: async (password) => { const data = new FormData(); data.set("id", order.id); data.set("current_password", password); await deleteAction(data); router.push("/panel/siparisler"); } });
  }

  return <section className="order-page">
    <Link className="back-link" href="/panel/siparisler"><ArrowLeft size={15} /> Siparişler</Link>
    <div className="order-page-head">
      <div>
        <div className="crumb">Sipariş</div>
        <h2 className="mono order-page-no">{order.order_no}</h2>
        <p className="sub">{customerName} · {new Date(order.created_at).toLocaleDateString("tr-TR")}</p>
      </div>
      <span className={`badge ${statusClasses[order.status] ?? "st-new"} order-page-status`}>{order.status}</span>
    </div>

    <div className="order-toolbar">
      <div className="status-control">
        <label className="lbl" htmlFor="order-status-select">Durum</label>
        <div className="status-control-row">
          <select className="input status-select" id="order-status-select" value={order.status} disabled={statusPending} onChange={(event) => changeStatus(event.target.value)}>
            {pipelineStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            <option value="İptal Edildi">İptal Edildi</option>
          </select>
          {statusMessage && <span className={statusMessage.ok ? "form-success" : "form-error"}>{statusMessage.message}</span>}
        </div>
      </div>
      <div className="order-toolbar-actions">
        <button type="button" className={`btn btn-ghost btn-sm${infoOpen ? " active" : ""}`} onClick={() => setInfoOpen((open) => !open)}><SlidersHorizontal size={15} /> Bilgiler</button>
        {supplierGroups.size > 1 && [...supplierGroups.keys()].map((supplier) => <button key={supplier} type="button" className="btn btn-ghost btn-sm no-print" onClick={() => printSupplier(supplier)}><Printer size={15} /> {supplier}</button>)}
        <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => printSupplier(ALL_SUPPLIERS)}><Printer size={15} /> {supplierGroups.size > 1 ? "Tümünü Yazdır" : "Yazdır"}</button>
        <details className="row-menu">
          <summary className="btn btn-ghost btn-sm row-menu-trigger" aria-label="Diğer işlemler"><MoreHorizontal size={16} /></summary>
          <div className="row-menu-pop">
            <button type="button" className="row-menu-item" onClick={handleCopy}>Siparişi kopyala</button>
            <button type="button" className="row-menu-item" onClick={toggleCancel}>{cancelled ? "Siparişi geri aç" : "Siparişi iptal et"}</button>
            <div className="row-menu-sep" />
            <button type="button" className="row-menu-item danger" onClick={handleDelete}>Siparişi sil</button>
          </div>
        </details>
      </div>
    </div>

    {infoOpen && <div className="order-info-panel"><div className="order-info-title">Sipariş bilgileri</div><OrderMetaForm order={order} action={withRefresh(updateDetailsAction)} manualAction={withRefresh(updateManualTotalAction)} /></div>}

    <div className="order-lines-panel">
      {order.order_items.map((item) => <OrderItemRow key={item.id} orderId={order.id} item={item} updateAction={withRefresh(updateItemAction)} fulfillmentAction={withRefresh(updateFulfillmentAction)} deleteAction={withRefresh(deleteItemAction)} />)}
    </div>
    <div className="order-totals-panel">
      <div><span>Ara toplam</span><b>₺{subtotal.toFixed(2)}</b></div>
      {discount > 0 && <div><span>İndirim</span><b>−₺{discount.toFixed(2)}</b></div>}
      {order.manual_total != null && <div><span>Manuel toplam</span><b>₺{Number(order.manual_total).toFixed(2)}</b></div>}
      <div><span>Brüt kâr</span><b className={grossProfit < 0 ? "danger-text" : ""}>₺{grossProfit.toFixed(2)}</b></div>
      <div><span>Net kâr</span><b className={netProfit < 0 ? "danger-text" : ""}>₺{netProfit.toFixed(2)}</b></div>
      <div className="order-grandtotal"><span>Genel Toplam</span><b>₺{total.toFixed(2)}</b></div>
    </div>

    <AddOrderItem orderId={order.id} customerId={order.customer_id} products={products} addAction={withRefresh(addItemAction)} />
    {order.note && <p className="order-note"><b>Not:</b> {order.note}</p>}
    <SupplierPrint order={order} customerName={customerName} groups={supplierGroups} target={printTarget} brandName={brandName} />
    {confirmConfig && <ConfirmDialog config={confirmConfig} onClose={() => setConfirmConfig(null)} />}
  </section>;
}
