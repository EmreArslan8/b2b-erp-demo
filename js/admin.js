// ── Admin kabuğu: sidebar + topbar + bildirim zili + rol seçici ───────────
const NAV = [
  { href: "index.html", ico: "▦", label: "Panel" },
  { href: "siparisler.html", ico: "🧾", label: "Siparişler" },
  { href: "urunler.html", ico: "📦", label: "Ürünler" },
  { href: "cari.html", ico: "💳", label: "Cari & Tahsilat" },
  { href: "stok.html", ico: "🏭", label: "Stok & Depo" },
  { href: "raporlar.html", ico: "📈", label: "Raporlar" },
];

// roller: menü erişim simülasyonu
const ROLES = {
  "Süper Admin": NAV.map(n => n.href),
  "Admin": NAV.map(n => n.href).filter(h => h !== "raporlar.html"),
  "Satış Personeli": ["index.html", "siparisler.html", "cari.html"],
};

function currentRole() { return localStorage.getItem("b2bErpRole") || "Süper Admin"; }

function renderShell(title) {
  const page = location.pathname.split("/").pop() || "index.html";
  const role = currentRole();
  const allowed = ROLES[role];

  document.body.insertAdjacentHTML("afterbegin", `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><span class="dot"></span> TedarikPro</div>
      <nav>${NAV.map(n => {
        const ok = allowed.includes(n.href);
        return `<a href="${ok ? n.href : "#"}" class="${page === n.href ? "active" : ""}" ${ok ? "" : 'style="opacity:.35;pointer-events:none" title="Bu rol erişemez"'}><span class="ico">${n.ico}</span>${n.label}${ok ? "" : " 🔒"}</a>`;
      }).join("")}</nav>
      <div class="foot">Demo sürüm · v1.0<br><a href="../index.html" style="color:#a9c9cc">← Müşteri tarafına dön</a></div>
    </aside>
    <div class="main">
      <div class="topbar">
        <button class="menu-btn no-print" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
        <h1>${title}</h1>
        <div class="spacer"></div>
        <div class="role-pick no-print">Rol:
          <select onchange="localStorage.setItem('b2bErpRole',this.value);location.reload()">
            ${Object.keys(ROLES).map(r => `<option ${r === role ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </div>
        <div class="bell-wrap no-print">
          <button class="bell" onclick="toggleBell()">🔔<span class="cnt" id="bellCnt" style="display:none">0</span></button>
          <div class="card bell-panel" id="bellPanel"></div>
        </div>
      </div>
      <div id="content"></div>
    </div>
  </div>
  <div id="printArea"></div>`);

  // erişim kontrolü: rol bu sayfaya giremiyorsa panele yönlendir
  if (!allowed.includes(page)) { location.href = "index.html"; return; }

  updateBell();
  // "anlık" bildirim simülasyonu: başka sekmede sipariş verilirse yakala
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
    panel.innerHTML = db.notifications.slice(0, 8).map(n => {
      const o = Store.order(n.orderId); if (!o) return "";
      const c = Store.customer(o.customerId);
      const t = Store.orderTotal(o);
      return `<div class="item ${n.read ? "" : "unread"}">
        <b>🆕 ${esc(o.no)}</b> — ${esc(c.name)}<br>
        <span style="color:var(--ink-soft)">${fmtDateTime(n.date)} · <b>${tl(t.total)}</b></span>
        <div style="margin-top:4px"><a href="siparisler.html?ord=${o.id}" style="font-size:12.5px;font-weight:700">Siparişi aç →</a></div>
      </div>`;
    }).join("") || `<div class="item">Bildirim yok.</div>`;
  }
  if (announce && unread.length) toast("🔔 Yeni sipariş geldi: " + (Store.order(unread[0].orderId) || {}).no);
}

function toggleBell() {
  const p = document.getElementById("bellPanel");
  p.classList.toggle("open");
  if (p.classList.contains("open")) { Store.markNotificationsRead(); setTimeout(updateBell, 600); }
}

document.addEventListener("click", e => {
  if (!e.target.closest(".bell-wrap")) document.getElementById("bellPanel")?.classList.remove("open");
  if (!e.target.closest(".sidebar") && !e.target.closest(".menu-btn")) document.getElementById("sidebar")?.classList.remove("open");
});
