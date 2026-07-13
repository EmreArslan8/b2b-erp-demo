// ── Admin kabuğu: sidebar + appbar + bildirim + rol ───────────────────────
const NAV = [
  { group: "Operasyon", items: [
    { href: "index.html", ic: "grid", label: "Panel" },
    { href: "siparisler.html", ic: "orders", label: "Siparişler", badge: "openOrders" },
    { href: "cari.html", ic: "card", label: "Cari & Tahsilat" },
  ]},
  { group: "Envanter", items: [
    { href: "urunler.html", ic: "box", label: "Ürünler" },
    { href: "stok.html", ic: "warehouse", label: "Stok & Depo", badge: "critical" },
  ]},
  { group: "Yönetim", items: [
    { href: "raporlar.html", ic: "chart", label: "Raporlar" },
    { href: "ayarlar.html", ic: "settings", label: "Ayarlar" },
  ]},
];
const ALL_HREFS = NAV.flatMap(g => g.items.map(i => i.href));

const ROLES = {
  "Süper Admin": ALL_HREFS,
  "Admin": ALL_HREFS.filter(h => h !== "ayarlar.html"),
  "Satış Personeli": ["index.html", "siparisler.html", "cari.html"],
};
function currentRole() { return localStorage.getItem("b2bErpRole") || "Süper Admin"; }

function badgeVal(key) {
  const db = Store.load();
  if (key === "openOrders") return db.orders.filter(o => !["Tamamlandı", "Teslim Edildi", "İptal Edildi"].includes(o.status)).length;
  if (key === "critical") return Store.criticalProducts().length;
  return 0;
}

function renderShell(title, crumb) {
  const page = location.pathname.split("/").pop() || "index.html";
  const role = currentRole();
  const allowed = ROLES[role];

  const navHtml = NAV.map(g => `
    <div class="nav-group">
      <div class="lab">${g.group}</div>
      <nav>${g.items.map(n => {
        const ok = allowed.includes(n.href);
        const bv = n.badge ? badgeVal(n.badge) : 0;
        return `<a href="${ok ? n.href : "#"}" class="${page === n.href ? "active" : ""} ${ok ? "" : "locked"}" ${ok ? "" : 'title="Bu rol erişemez"'}>
          ${ic(n.ic)}<span>${n.label}</span>${ok && bv ? `<span class="badge-n">${bv}</span>` : ""}${ok ? "" : '<span style="margin-left:auto">🔒</span>'}
        </a>`;
      }).join("")}</nav>
    </div>`).join("");

  document.body.insertAdjacentHTML("afterbegin", `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><span class="logo-mark">${ic("box")}</span> TedarikPro</div>
      ${navHtml}
      <div class="foot">Demo · v1.0 &nbsp;·&nbsp; <a href="../index.html">${ic("logout")} Çıkış</a></div>
    </aside>
    <div class="main">
      <header class="appbar">
        <button class="menu-btn no-print" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
        <div>
          <div class="crumb">${crumb || "TedarikPro"}</div>
          <h1>${title}</h1>
        </div>
        <div class="spacer"></div>
        <div class="role-pick no-print">Rol
          <select onchange="localStorage.setItem('b2bErpRole',this.value);location.reload()">
            ${Object.keys(ROLES).map(r => `<option ${r === role ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </div>
        <div class="bell-wrap no-print">
          <button class="bell" onclick="toggleBell()">${ic("bell")}<span class="cnt" id="bellCnt" style="display:none">0</span></button>
          <div class="card bell-panel" id="bellPanel"></div>
        </div>
      </header>
      <div class="page-body" id="content"></div>
    </div>
  </div>
  <div id="printArea"></div>`);

  if (!allowed.includes(page)) { location.href = "index.html"; return; }

  updateBell();
  window.addEventListener("storage", e => {
    if (e.key === DB_KEY) { Store._db = null; updateBell(true); if (typeof onDataChange === "function") onDataChange(); }
  });
}

function updateBell(announce = false) {
  const db = Store.load();
  const unread = db.notifications.filter(n => !n.read);
  const cnt = document.getElementById("bellCnt");
  if (cnt) { cnt.style.display = unread.length ? "flex" : "none"; cnt.textContent = unread.length; }
  const panel = document.getElementById("bellPanel");
  if (panel) {
    panel.innerHTML = `<div class="ph">Bildirimler</div>` + (db.notifications.slice(0, 8).map(n => {
      const o = Store.order(n.orderId); if (!o) return "";
      const c = Store.customer(o.customerId);
      const t = Store.orderTotal(o);
      return `<div class="item ${n.read ? "" : "unread"}">
        <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(o.no)}</b><span class="mono" style="color:var(--accent-2)">${tl(t.total)}</span></div>
        <div style="color:var(--ink-3);font-size:12px">${esc(c.name)} · ${fmtDateTime(n.date)}</div>
        <a href="siparisler.html?ord=${o.id}" style="font-size:12px;font-weight:600">Siparişi aç →</a>
      </div>`;
    }).join("") || `<div class="item">Bildirim yok.</div>`);
  }
  if (announce && unread.length) toast("🔔 Yeni sipariş: " + (Store.order(unread[0].orderId) || {}).no);
}

function toggleBell() {
  const p = document.getElementById("bellPanel");
  p.classList.toggle("open");
  if (p.classList.contains("open")) { Store.markNotificationsRead(); setTimeout(updateBell, 700); }
}

document.addEventListener("click", e => {
  if (!e.target.closest(".bell-wrap")) document.getElementById("bellPanel")?.classList.remove("open");
  if (!e.target.closest(".sidebar") && !e.target.closest(".menu-btn")) document.getElementById("sidebar")?.classList.remove("open");
});
