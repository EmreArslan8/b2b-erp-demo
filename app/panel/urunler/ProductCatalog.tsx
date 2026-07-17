"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { ConfirmDialog, type ConfirmConfig } from "@/components";
import ProductActionForm from "./ProductActionForm";

type Product = { id: string; name: string; barcode: string; sku: string; category_id: string | null; category: string; subcategory?: string; brand: string; supplier_id: string | null; unit: string; price: number; cost: number; critical_level: number; stock: number; sort_order: number; active?: boolean; image_url?: string; product_prices?: { customer_id: string; price: number }[]; cost_history?: { id: string; cost: number; changed_at: string }[] };
type Supplier = { id: string; name: string };
type Customer = { id: string; name: string };
type CategoryOption = { id: string; name: string; parent_id: string | null; active?: boolean; sort_order?: number };
type Action = (formData: FormData) => void | Promise<void>;

function ProductFields({ product, suppliers, customers, categories, includeExtras = false }: { product?: Product; suppliers: Supplier[]; customers: Customer[]; categories: CategoryOption[]; includeExtras?: boolean }) {
  const prices = new Map((product?.product_prices ?? []).map((item) => [item.customer_id, item.price]));
  const selectedCategory = categories.find((category) => category.id === product?.category_id);
  const [parentCategoryId, setParentCategoryId] = useState(selectedCategory?.parent_id ?? selectedCategory?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(selectedCategory?.parent_id ? selectedCategory.id : "");
  const rootCategories = categories.filter((category) => !category.parent_id);
  const subcategories = categories.filter((category) => category.parent_id === parentCategoryId);
  return <><button type="button" className="popup-close" aria-label="Kapat" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>×</button>
    <div className="form-grid product-edit-grid">
      <div className="field wide"><label className="lbl">Ürün Adı</label><input className="input" name="name" defaultValue={product?.name ?? ""} required /></div>
      <div className="field"><label className="lbl">Kategori</label><select className="input" name="parent_category_id" value={parentCategoryId} onChange={(event) => { setParentCategoryId(event.target.value); setSubcategoryId(""); }}><option value="">Kategorisiz</option>{rootCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div className="field"><label className="lbl">Alt kategori</label><select className="input" name="subcategory_id" value={subcategoryId} disabled={!parentCategoryId || subcategories.length === 0} onChange={(event) => setSubcategoryId(event.target.value)}><option value="">Alt kategori yok</option>{subcategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div className="field"><label className="lbl">Barkod</label><input className="input" name="barcode" defaultValue={product?.barcode ?? ""} /></div>
      <div className="field"><label className="lbl">SKU</label><input className="input" name="sku" defaultValue={product?.sku ?? ""} required /></div>
      <div className="field"><label className="lbl">Marka</label><input className="input" name="brand" defaultValue={product?.brand ?? ""} /></div>
      <div className="field"><label className="lbl">Tedarikçi</label><select className="input" name="supplier_id" defaultValue={product?.supplier_id ?? suppliers[0]?.id ?? ""}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
      <div className="field product-unit-field"><label className="lbl">Birim</label><input className="input" name="unit" defaultValue={product?.unit ?? "Adet"} /></div>
      <div className="field product-conversion-field"><label className="lbl">Birim Dönüşümü</label><input className="input" name="conversion" placeholder="ör. 1 Koli = 24 Adet" /></div>
      <div className="field"><label className="lbl">Son Alış Fiyatı (₺)</label><input className="input" name="cost" type="number" min="0" step="0.01" defaultValue={product?.cost ?? 0} /></div>
      <div className="field"><label className="lbl">Satış Fiyatı (₺)</label><input className="input" name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? 0} /></div>
      <div className="field"><label className="lbl">Kritik Stok Eşiği</label><input className="input" name="critical_level" type="number" min="0" step="1" defaultValue={product?.critical_level ?? 0} /></div>
      <div className="field wide"><label className="lbl">Ürün Görseli</label><input className="input" name="image" type="file" accept="image/*" /><span className="sub">Yeni görsel seçerseniz mevcut görsel değiştirilir.</span></div>
    </div>
    <h3 className="popup-subtitle">Müşteriye Özel Fiyatlar</h3>
    <div className="customer-price-grid">{customers.map((customer) => <div className="field" key={customer.id}><label className="lbl normal-case">{customer.name}</label><input className="input" name={`customer_price_${customer.id}`} type="number" min="0" step="0.01" defaultValue={prices.get(customer.id) ?? ""} placeholder={String(product?.price ?? 0)} /></div>)}</div>
    {includeExtras && <><h3 className="popup-subtitle">Alış Fiyatı Geçmişi</h3>{product?.cost_history?.length ? <div className="cost-history">{product.cost_history.slice(0, 8).map((entry) => <div key={entry.id}><span>₺{Number(entry.cost).toFixed(2)}</span><small>{new Date(entry.changed_at).toLocaleDateString("tr-TR")}</small></div>)}</div> : <p className="sub">Henüz alış fiyatı geçmişi yok.</p>}</>}
  </>;
}

export default function ProductCatalog({ products, suppliers, customers, categories, error, createAction, updateAction, deleteAction, importAction, toggleAction }: { products: Product[]; suppliers: Supplier[]; customers: Customer[]; categories: CategoryOption[]; error: string | null; createAction: Action; updateAction: Action; deleteAction: Action; importAction: Action; toggleAction: Action }) {
  const [query, setQuery] = useState("");
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  function askDelete(product: Product) { setConfirmConfig({ title: "Ürünü sil", message: `“${product.name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`, confirmLabel: "Kalıcı olarak sil", danger: true, needsPassword: true, onConfirm: async (password) => { const data = new FormData(); data.set("id", product.id); data.set("current_password", password); await deleteAction(data); } }); }
  const filtered = useMemo(() => products.filter((product) => !query || [product.name, product.barcode, product.sku, product.brand].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [products, query]);
  function exportCsv() { const rows = [["Ad", "Barkod", "SKU", "Tedarikçi", "Birim", "Son Alış", "Satış", "Toplam Stok"], ...filtered.map((p) => [p.name, p.barcode, p.sku, suppliers.find((s) => s.id === p.supplier_id)?.name ?? "", p.unit, p.cost, p.price, p.stock])]; const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); link.download = "urunler.csv"; link.click(); }
  return <>
    <details className="filter-menu"><summary>⌕ Ara ve Filtreler</summary><div className="filters no-print"><div className="grow"><label className="lbl">Ara</label><input className="input" placeholder="Ürün adı, barkod, SKU, marka…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="product-toolbar-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={exportCsv}>⬇ Excel/CSV</button><form action={importAction} className="product-import-form"><input className="input" name="file" type="file" accept=".csv,text/csv" required /><button className="btn btn-ghost btn-sm" type="submit">CSV içe aktar</button></form><details><summary className="btn btn-primary btn-sm">+ Yeni Ürün</summary><ProductActionForm action={createAction} submitLabel="Kaydet"><div className="card card-pad product-form"><ProductFields suppliers={suppliers} customers={customers} categories={categories} /></div></ProductActionForm></details></div></div></details>
    <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Ürün</th><th>SKU / Barkod</th><th>Tedarikçi</th><th>Birim</th><th className="num">Son Alış</th><th className="num">Satış</th><th className="num">Stok</th><th></th></tr></thead><tbody>{error ? <tr><td colSpan={8}><div className="empty">{error}</div></td></tr> : filtered.length ? filtered.map((product) => {
      const low = product.stock <= Number(product.critical_level);
      const hidden = product.active === false;
      const supplierName = suppliers.find((item) => item.id === product.supplier_id)?.name ?? "—";
      return <tr key={product.id} className={hidden ? "product-row-hidden" : undefined}>
        <td className="product-main-cell"><div className="product-desktop-summary"><b>{product.name}</b>{hidden && <span className="badge st-cancel" style={{ marginLeft: 6 }}>Gizli</span>}<br /><span className="sub">{product.brand}</span></div><div className="product-mobile-summary"><div className="product-mobile-title"><div><b>{product.name}</b><span>{product.sku} · {product.unit}</span></div>{low && <span className="badge st-new">Kritik</span>}</div><div className="product-mobile-metrics"><div><span>Son alış</span><b>₺{Number(product.cost).toFixed(2)}</b></div><div><span>Satış</span><b>₺{Number(product.price).toFixed(2)}</b></div><div><span>Stok</span><b className={low ? "danger-text" : ""}>{product.stock}</b></div><div><span>Tedarikçi</span><b>{supplierName}</b></div></div></div></td>
        <td><span className="mono">{product.sku}</span><br /><span className="sub">{product.barcode}</span></td><td>{supplierName}</td><td>{product.unit}</td><td className="num">₺{Number(product.cost).toFixed(2)}</td><td className="num"><b>₺{Number(product.price).toFixed(2)}</b></td><td className="num"><b className={low ? "danger-text" : ""}>{product.stock}</b>{low && <span className="badge st-new">kritik</span>}</td>
        <td className="product-actions-cell"><details className="product-edit-action"><summary className="btn btn-ghost btn-sm">Düzenle</summary><ProductActionForm action={updateAction} submitLabel="Güncelle"><div className="card card-pad product-form edit-form"><input type="hidden" name="id" value={product.id} /><ProductFields product={product} suppliers={suppliers} customers={customers} categories={categories} includeExtras /></div></ProductActionForm></details><form action={toggleAction} className="product-desktop-toggle" style={{ display: "inline-block", marginLeft: 5 }}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="active" value={hidden ? "true" : "false"} /><button className="btn btn-ghost btn-sm" type="submit" title={hidden ? "Müşteri ekranında göster" : "Müşteri ekranından gizle"}>{hidden ? "Göster" : "Gizle"}</button></form><button className="btn btn-danger btn-sm product-desktop-delete" type="button" style={{ marginLeft: 5 }} onClick={() => askDelete(product)}>Sil</button><details className="row-menu product-mobile-menu"><summary className="icon-btn row-menu-trigger" aria-label={`${product.name} işlemleri`}><MoreHorizontal size={20} /></summary><div className="row-menu-pop"><form action={toggleAction}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="active" value={hidden ? "true" : "false"} /><button className="row-menu-item" type="submit">{hidden ? "Göster" : "Gizle"}</button></form><button className="row-menu-item danger" type="button" onClick={() => askDelete(product)}>Sil</button></div></details></td>
      </tr>;
    }) : <tr><td colSpan={8}><div className="empty">Ürün bulunamadı.</div></td></tr>}</tbody></table></div></div><p className="catalog-foot">{filtered.length} ürün gösteriliyor · Sıralamayı Envanter → Ürün Sıralaması ekranından değiştirebilirsiniz · Excel/CSV dışa aktarma aktif.</p>
    {confirmConfig && <ConfirmDialog config={confirmConfig} onClose={() => setConfirmConfig(null)} />}
  </>;
}
