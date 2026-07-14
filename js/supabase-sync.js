// Küçük statik uygulama için Supabase REST veri senkronizasyonu.
// Uygulamanın mevcut senkron Store API'sini bozmadan arka planda çalışır.
const SupabaseSync = {
  started: false,
  ready: false,
  dirty: false,
  async start() {
    if (this.started) return;
    this.started = true;
    const cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey) return;

    try {
      const response = await fetch(`${cfg.url.replace(/\/$/, "")}/rest/v1/app_state?id=eq.${cfg.stateId || 1}&select=payload`, {
        headers: this.headers(cfg),
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}`);
      const rows = await response.json();
      if (rows[0]?.payload && !this.dirty) {
        Store._db = rows[0].payload;
        localStorage.setItem(DB_KEY, JSON.stringify(Store._db));
        window.dispatchEvent(new CustomEvent("supabase-data-ready"));
      } else {
        await this.push(Store._db || Store.load());
      }
      this.ready = true;
    } catch (error) {
      console.warn("Supabase bağlantısı kurulamadı; yerel önbellek kullanılıyor.", error);
      window.dispatchEvent(new CustomEvent("supabase-error", { detail: error }));
    }
  },
  headers(cfg) {
    return { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, "Content-Type": "application/json" };
  },
  async push(payload) {
    const cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || !payload) return;
    this.dirty = false;
    const response = await fetch(`${cfg.url.replace(/\/$/, "")}/rest/v1/app_state?on_conflict=id`, {
      method: "POST",
      headers: { ...this.headers(cfg), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: cfg.stateId || 1, payload, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Supabase yazma hatası ${response.status}`);
  },
  schedule(payload) {
    const cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey) return;
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(payload).catch(console.warn), 150);
  },
};

window.addEventListener("supabase-data-ready", () => {
  if (typeof onDataChange === "function") onDataChange();
});
