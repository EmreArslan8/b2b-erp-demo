"use client";

import { useMemo, useState } from "react";
import ProductActionForm from "./ProductActionForm";

type Product = { id: string; name: string; barcode: string; sku: string; category: string; brand: string; supplier_id: string | null; unit: string; price: number; cost: number; critical_level: number; stock: number; image_url?: string; product_prices?: { customer_id: string; price: number }[] };
type Supplier = { id: string; name: string };
type Customer = { id: string; name: string };
type Action = (formData: FormData) => void | Promise<void>;

function ProductFields({ product, suppliers, customers, includeExtras = false }: { product?: Product; suppliers: Supplier[]; customers: Customer[]; includeExtras?: boolean }) {
  const prices = new Map((product?.product_prices ?? []).map((item) => [item.customer_id, item.price]));
  return <><button type="button" className="popup-close" aria-label="Kapat" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>×</button>
    <div className="form-grid product-edit-grid">
      <div className="field wide"><label className="lbl">Ürün Adı</label><input className="input" name="name" defaultValue={product?.name ?? ""} required /></div>
      <div className="field"><label className="lbl">Barkod</label><input className="input" name="barcode" defaultValue={product?.barcode ?? ""} /></div>
      <div className="field"><label className="lbl">SKU</label><input className="input" name="sku" defaultValue={product?.sku ?? ""} required /></div>
      <div className="field"><label className="lbl">Marka</label><input className="input" name="brand" defaultValue={product?.brand ?? ""} /></div>
      <div className="field"><label className="lbl">Tedarikçi</label><select className="input" name="supplier_id" defaultValue={product?.supplier_id ?? suppliers[0]?.id ?? ""}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
      <div className="field"><label className="lbl">Birim</label><input className="input" name="unit" defaultValue={product?.unit ?? "Adet"} /></div>
      <div className="field wide"><label className="lbl">Birim Dönüşümü</label><input className="input" name="conversion" placeholder="ör. 1 Koli = 24 Adet" /></div>
      <div className="field"><label className="lbl">Son Alış Fiyatı (₺)</label><input className="input" name="cost" type="number" min="0" step="0.01" defaultValue={product?.cost ?? 0} /></div>
      <div className="field"><label className="lbl">Satış Fiyatı (₺)</label><input className="input" name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? 0} /></div>
      <div className="field"><label className="lbl">Kritik Stok Eşiği</label><input className="input" name="critical_level" type="number" min="0" step="1" defaultValue={product?.critical_level ?? 0} /></div>
      <div className="field wide"><label className="lbl">Ürün Görseli</label><input className="input" name="image" type="file" accept="image/*" /><span className="sub">Yeni görsel seçerseniz mevcut görsel değiştirilir.</span></div>
      <div className="field wide"><label className="lbl">Ürün Görseli</label><input className="input" name="image" type="file" accept="image/*" /><span className="sub">Yeni görsel seçerseniz mevcut görsel değiştirilir.</span></div>
    </div>
    <h3 className="popup-subtitle">Müşteriye Özel Fiyatlar</h3>
    <div className="customer-price-grid">{customers.map((customer) => <div className="field" key={customer.id}><label className="lbl normal-case">{customer.name}</label><input className="input" name={`customer_price_${customer.id}`} type="number" min="0" step="0.01" defaultValue={prices.get(customer.id) ?? ""} placeholder={String(product?.price ?? 0)} /></div>)}</div>
    {includeExtras && <><h3 className="popup-subtitle">Alış Fiyatı Geçmişi</h3><p className="sub">Yeni alış fiyatları kaydedildikçe geçmiş kayıtları burada tutulacak.</p></>}
  </>;
}

export default function ProductCatalog({ products, suppliers, customers, error, createAction, updateAction, deleteAction }: { products: Product[]; suppliers: Supplier[]; customers: Customer[]; error: string | null; createAction: Action; updateAction: Action; deleteAction: Action }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => products.filter((product) => !query || [product.name, product.barcode, product.sku, product.brand].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [products, query]);
  function exportCsv() { const rows = [["Ad", "Barkod", "SKU", "Tedarikçi", "Birim", "Son Alış", "Satış", "Toplam Stok"], ...filtered.map((p) => [p.name, p.barcode, p.sku, suppliers.find((s) => s.id === p.supplier_id)?.name ?? "", p.unit, p.cost, p.price, p.stock])]; const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); link.download = "urunler.csv"; link.click(); }
  return <>
    <details className="filter-menu" open><summary>⌕ Ara ve Filtreler</summary><div className="filters no-print"><div className="grow"><label className="lbl">Ara</label><input className="input" placeholder="Ürün adı, barkod, SKU, marka…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div style={{ alignSelf: "end", display: "flex", gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={exportCsv}>⬇ Excel/CSV</button><details><summary className="btn btn-primary btn-sm">+ Yeni Ürün</summary><ProductActionForm action={createAction} submitLabel="Kaydet"><div className="card card-pad product-form"><ProductFields suppliers={suppliers} customers={customers} /></div></ProductActionForm></details></div></div></details>
    <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Ürün</th><th>SKU / Barkod</th><th>Tedarikçi</th><th>Birim</th><th className="num">Son Alış</th><th className="num">Satış</th><th className="num">Stok</th><th></th></tr></thead><tbody>{error ? <tr><td colSpan={8}><div className="empty">{error}</div></td></tr> : filtered.length ? filtered.map((product) => { const low = product.stock <= Number(product.critical_level); return <tr key={product.id}><td><b>{product.name}</b><br /><span className="sub">{product.brand}</span></td><td><span className="mono">{product.sku}</span><br /><span className="sub">{product.barcode}</span></td><td>{suppliers.find((item) => item.id === product.supplier_id)?.name ?? "—"}</td><td>{product.unit}</td><td className="num">₺{Number(product.cost).toFixed(2)}</td><td className="num"><b>₺{Number(product.price).toFixed(2)}</b></td><td className="num"><b className={low ? "danger-text" : ""}>{product.stock}</b>{low && <span className="badge st-new">kritik</span>}</td><td><details><summary className="btn btn-ghost btn-sm">Düzenle</summary><ProductActionForm action={updateAction} submitLabel="Güncelle"><div className="card card-pad product-form edit-form"><input type="hidden" name="id" value={product.id} /><ProductFields product={product} suppliers={suppliers} customers={customers} includeExtras /></div></ProductActionForm></details><form action={deleteAction} style={{ display: "inline-block", marginLeft: 5 }}><input type="hidden" name="id" value={product.id} /><button className="btn btn-danger btn-sm" type="submit">Sil</button></form></td></tr>; }) : <tr><td colSpan={8}><div className="empty">Ürün bulunamadı.</div></td></tr>}</tbody></table></div></div><p className="catalog-foot">{filtered.length} ürün gösteriliyor · Excel/CSV dışa aktarma aktif.</p>
  </>;
}
