"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";

type Product = { id: string; name: string; sku: string; category: string; brand: string; unit: string; price: number; image_url?: string };

export default function OrderExperience({ customerName, customerSlug, products, brandName }: { customerName: string; customerSlug: string; products: Product[]; brandName: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const previousCartUnits = useRef(0);
  const categories = ["Tümü", ...new Set(products.map((product) => product.category).filter(Boolean))];
  const filtered = useMemo(() => products.filter((product) => (category === "Tümü" || product.category === category) && (!query || [product.name, product.sku, product.brand].some((value) => value?.toLowerCase().includes(query.toLowerCase())))), [products, query, category]);
  function setQuantity(productId: string, quantity: number) { setCart((current) => ({ ...current, [productId]: Math.max(0, quantity) })); }
  function removeFromCart(productId: string) { setCart((current) => { const next = { ...current }; delete next[productId]; return next; }); }
  const cartItems = products.filter((product) => (cart[product.id] ?? 0) > 0);
  const cartUnits = cartItems.reduce((sum, product) => sum + cart[product.id], 0);
  const cartTotal = cartItems.reduce((sum, product) => sum + cart[product.id] * product.price, 0);
  useEffect(() => {
    if (previousCartUnits.current === 0 && cartUnits > 0) setCartOpen(true);
    previousCartUnits.current = cartUnits;
  }, [cartUnits]);
  async function submitOrder() {
    setSending(true); setResult(null);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkSlug: customerSlug, note, items: cartItems.map((product) => ({ productId: product.id, qty: cart[product.id] })) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Sipariş oluşturulamadı.");
      setCartOpen(false); setResult({ ok: true, text: `${payload.orderNo} numaralı siparişiniz alındı.` }); setCart({}); setNote("");
    } catch (error) { setResult({ ok: false, text: error instanceof Error ? error.message : "Sipariş oluşturulamadı." }); }
    finally { setSending(false); }
  }
  function renderCartContents(noteId: string) {
    if (cartItems.length === 0) return <div className="empty desktop-cart-empty"><ShoppingCart size={28} aria-hidden="true" /><b>Sepetiniz boş</b><span>Ürün kartlarındaki + butonuyla siparişinizi oluşturun.</span></div>;
    return <>
      <div className="cart-panel-items">{cartItems.map((product) => <div className="cart-panel-row" key={product.id}>
        <div className="cart-row-main"><b>{product.name}</b><small>₺{product.price.toFixed(2)} / {product.unit}</small></div>
        <div className="cart-row-qty">
          <button aria-label="Azalt" onClick={() => setQuantity(product.id, cart[product.id] - 1)}><Minus size={15} /></button>
          <input aria-label={`${product.name} adet`} type="number" inputMode="numeric" min="0" value={cart[product.id] === 0 ? "" : cart[product.id]} placeholder="0" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantity(product.id, event.target.value === "" ? 0 : Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
          <button aria-label="Artır" onClick={() => setQuantity(product.id, cart[product.id] + 1)}><Plus size={15} /></button>
        </div>
        <div className="cart-row-total">₺{(product.price * cart[product.id]).toFixed(2)}</div>
        <button className="cart-row-remove" aria-label="Sepetten çıkar" onClick={() => removeFromCart(product.id)}><Trash2 size={16} /></button>
      </div>)}</div>
      <div className="cart-panel-total"><span>Genel Toplam</span><b>₺{cartTotal.toFixed(2)}</b></div>
      <label className="lbl" htmlFor={noteId}>Sipariş notu</label>
      <textarea className="input" id={noteId} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Teslimat veya sipariş notu…" />
      {result && !result.ok && <p className="form-error">{result.text}</p>}
      <button className="btn btn-primary cart-panel-submit" onClick={submitOrder} disabled={sending}>{sending ? "Gönderiliyor…" : "Siparişi Onayla"}</button>
    </>;
  }
  return <>
    <header className="shop-head"><button className="hamburger-btn" type="button" aria-label="Filtre menüsünü aç" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" /></button><div className="shop-head-identity"><span className="logo-mark" aria-hidden="true">▣</span><div className="shop-brand-text"><b>{brandName}</b><span className="shop-customer-name">{customerName}</span></div></div><label className="shop-header-search"><span className="sr-only">Ürün ara</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün adı, SKU veya marka ara…" /></label><div className="shop-head-actions"><div className="shop-header-customer"><span>Müşteri</span><b>{customerName}</b></div><button className="shop-cart-btn" type="button" aria-label={`Sepeti aç, ${cartUnits} birim ürün`} onClick={() => setCartOpen(true)}><ShoppingCart aria-hidden="true" />{cartUnits > 0 && <span aria-hidden="true">{cartUnits}</span>}</button></div></header>
    {menuOpen && <><button className="order-drawer-backdrop" aria-label="Menüyü kapat" onClick={() => setMenuOpen(false)} /><aside className="order-drawer" aria-label="Ürün filtreleri"><div className="drawer-head"><h3>Ürünleri Filtrele</h3><button className="icon-btn" aria-label="Kapat" onClick={() => setMenuOpen(false)}><X className="ic" /></button></div><input className="input" aria-label="Ürün ara" placeholder="Ürün adı, SKU veya marka…" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="drawer-label">Kategori</div><div className="cat-chips">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><button className="btn btn-primary drawer-apply" onClick={() => setMenuOpen(false)}>Filtreleri Uygula</button></aside></>}
    <div className="shop-desktop-layout"><aside className="desktop-category-panel"><div className="desktop-panel-kicker">Katalog</div><h2>Kategoriler</h2><div className="desktop-category-list">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><span>{item}</span><small>{item === "Tümü" ? products.length : products.filter((product) => product.category === item).length}</small></button>)}</div></aside><main className="shop-wrap"><div className="desktop-catalog-head"><div><span>Ürün kataloğu</span><h1>{category === "Tümü" ? "Tüm ürünler" : category}</h1></div><small>{filtered.length} ürün</small></div><div className="prod-grid">{filtered.map((product) => {
      const quantity = cart[product.id] ?? 0;
      return <article className={`card prod ${quantity ? "in-cart" : ""}`} key={product.id}>
        <div className="product-card-media"><img className="product-card-image" src={product.image_url || "/placeholder-product.svg"} alt={product.name} /></div>
        <div className="product-card-info"><div className="cat-tag">{product.category || "Ürün"} · {product.brand}</div><div className="nm">{product.name}</div><div className="meta">SKU: {product.sku}</div><div className="price-row"><span className="price">₺{product.price.toFixed(2)}</span><span className="unit">{product.unit}</span></div></div>
        <div className="qty-ctrl">
          <button aria-label={`${product.name} azalt`} onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
          <input aria-label={`${product.name} adet`} type="number" inputMode="numeric" min="0" value={quantity === 0 ? "" : quantity} placeholder="0" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantity(product.id, event.target.value === "" ? 0 : Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
          <button aria-label={`${product.name} artır`} onClick={() => setQuantity(product.id, quantity + 1)}>+</button>
        </div>
      </article>;
    })}</div>{filtered.length === 0 && <div className="empty">Ürün bulunamadı.</div>}<p className="note">{filtered.length} ürün listeleniyor.</p></main></div>
    {cartOpen && <><button className="cart-panel-backdrop" aria-label="Sepeti kapat" onClick={() => setCartOpen(false)} /><aside className="cart-panel" aria-label="Sipariş sepeti">
      <div className="cart-panel-head"><h3><ShoppingCart className="ic" style={{ marginRight: 8 }} />Sipariş Sepeti</h3><button className="icon-btn" aria-label="Kapat" onClick={() => setCartOpen(false)}><X className="ic" /></button></div>
      {renderCartContents("order-note-drawer")}
    </aside></>}
    {result?.ok && <div className="modal-bg open"><div className="modal" style={{ textAlign: "center" }}><div style={{ fontSize: 48 }}>✅</div><h3>{result.text}</h3><p className="sub">Siparişiniz yönetim paneline iletildi.</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setResult(null)}>Kapat</button></div></div>}
  </>;
}
