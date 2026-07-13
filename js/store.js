// ── localStorage veri katmanı ─────────────────────────────────────────────
const DB_KEY = "b2bErpDemo_v1";

const Store = {
  _db: null,

  load() {
    if (this._db) return this._db;
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { this._db = JSON.parse(raw); return this._db; }
    const dyn = seedDynamic();
    this._db = {
      suppliers: SEED.suppliers, warehouses: SEED.warehouses, customers: SEED.customers,
      products: JSON.parse(JSON.stringify(SEED.products)), costHistory: SEED.costHistory,
      ...dyn,
    };
    this.save();
    return this._db;
  },

  save() { localStorage.setItem(DB_KEY, JSON.stringify(this._db)); },
  reset() { localStorage.removeItem(DB_KEY); this._db = null; this.load(); },

  // ── lookup helpers ──
  product(id) { return this.load().products.find(p => p.id === id); },
  customer(id) { return this.load().customers.find(c => c.id === id); },
  customerByLink(link) { return this.load().customers.find(c => c.link === link); },
  supplier(id) { return this.load().suppliers.find(s => s.id === id); },
  warehouse(id) { return this.load().warehouses.find(w => w.id === id); },
  order(id) { return this.load().orders.find(o => o.id === id); },

  priceFor(product, customerId) {
    return (product.prices && product.prices[customerId]) || product.price;
  },
  totalStock(product) {
    return Object.values(product.stock).reduce((a, b) => a + b, 0);
  },
  orderTotal(order) {
    const sub = order.items.reduce((s, i) => s + i.qty * i.price, 0);
    return { sub, discount: order.discount || 0, total: sub - (order.discount || 0) };
  },
  orderCost(order) {
    return order.items.reduce((s, i) => {
      const p = this.product(i.productId);
      return s + i.qty * (p ? p.cost : 0);
    }, 0);
  },

  // ── sipariş ──
  createOrder(customerId, items, note = "") {
    const db = this.load();
    db.orderSeq += 1;
    const order = {
      id: "ord" + db.orderSeq, no: "SIP-" + db.orderSeq, customerId,
      date: new Date().toISOString(), status: "Yeni Sipariş", note, discount: 0,
      items: items.map(i => ({ productId: i.productId, qty: i.qty, price: i.price })),
      log: [{ date: new Date().toISOString(), user: "Müşteri", text: "Sipariş oluşturuldu" }],
    };
    db.orders.unshift(order);
    db.notifications.unshift({ id: "ntf" + Date.now(), date: order.date, orderId: order.id, read: false });
    this.save();
    return order;
  },

  copyOrder(orderId) {
    const src = this.order(orderId);
    const copy = this.createOrder(src.customerId, src.items, src.note);
    copy.log.push({ date: new Date().toISOString(), user: currentUser(), text: src.no + " numaralı siparişten kopyalandı" });
    this.save();
    return copy;
  },

  setStatus(orderId, status) {
    const o = this.order(orderId);
    const prev = o.status;
    o.status = status;
    o.log.push({ date: new Date().toISOString(), user: currentUser(), text: "Durum: " + status });
    // Tamamlandı → stok düş (Ana Depo'dan) + hareket kaydı
    if (status === "Tamamlandı" && prev !== "Tamamlandı") {
      const db = this.load();
      o.items.forEach(i => {
        const p = this.product(i.productId);
        if (p) {
          p.stock.wh1 = Math.max(0, (p.stock.wh1 || 0) - i.qty);
          db.movements.unshift({ id: "mv" + Date.now() + Math.random().toString(36).slice(2, 5), date: new Date().toISOString(), type: "Çıkış", productId: i.productId, qty: i.qty, from: "wh1", to: null, ref: o.no, user: currentUser() });
        }
      });
    }
    this.save();
  },

  logOrder(orderId, text) {
    const o = this.order(orderId);
    o.log.push({ date: new Date().toISOString(), user: currentUser(), text });
    this.save();
  },

  // ── tahsilat / cari ──
  addPayment(customerId, orderId, amount, method, note = "") {
    const db = this.load();
    db.payments.unshift({ id: "pay" + Date.now(), customerId, orderId, date: new Date().toISOString(), amount, method, note });
    this.save();
  },

  cariSummary(customerId) {
    const db = this.load();
    const orders = db.orders.filter(o => o.customerId === customerId && o.status !== "İptal Edildi");
    const sales = orders.reduce((s, o) => s + this.orderTotal(o).total, 0);
    const paid = db.payments.filter(p => p.customerId === customerId).reduce((s, p) => s + p.amount, 0);
    return { sales, paid, balance: sales - paid, orders };
  },

  // ── stok ──
  transferStock(productId, fromWh, toWh, qty) {
    const db = this.load();
    const p = this.product(productId);
    if (!p || (p.stock[fromWh] || 0) < qty) return false;
    p.stock[fromWh] -= qty;
    p.stock[toWh] = (p.stock[toWh] || 0) + qty;
    db.movements.unshift({ id: "mv" + Date.now(), date: new Date().toISOString(), type: "Transfer", productId, qty, from: fromWh, to: toWh, ref: "TRF-" + (db.movements.length + 10), user: currentUser() });
    this.save();
    return true;
  },

  criticalProducts() {
    return this.load().products.filter(p => this.totalStock(p) <= p.critical);
  },

  unreadCount() {
    return this.load().notifications.filter(n => !n.read).length;
  },
  markNotificationsRead() {
    this.load().notifications.forEach(n => n.read = true);
    this.save();
  },
};

// ── ortak yardımcılar ──
const ORDER_STATUSES = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"];

const STATUS_CLASS = {
  "Yeni Sipariş": "st-new", "Onaylandı": "st-approved", "Hazırlanıyor": "st-prep",
  "Tedarikçiye İletildi": "st-supplier", "Hazır": "st-ready", "Teslim Edildi": "st-delivered",
  "Tamamlandı": "st-done", "İptal Edildi": "st-cancel",
};

function currentUser() { return localStorage.getItem("b2bErpUser") || "admin"; }
function setCurrentUser(u) { localStorage.setItem("b2bErpUser", u); }

function tl(n) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(n);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) + " " +
         new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function statusBadge(status) {
  return `<span class="badge ${STATUS_CLASS[status] || ''}">${esc(status)}</span>`;
}
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove("show"), 2600);
}
