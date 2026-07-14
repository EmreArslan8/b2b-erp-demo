# TedarikPro — Next.js + Supabase Mimarisi (MVP)

> Bu belge **1 haftalık MVP** için teknik mimariyi tanımlar. Kod içermez; geliştirme
> başlamadan önceki plandır. Mevcut statik demo (`/admin`, `/js`, `/css`) tasarım ve
> iş mantığı referansı olarak kullanılır.

---

## 1. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + React + TypeScript** | Sunucu bileşenleri, hızlı, tek repo |
| Stil | **Mevcut `style.css` → global CSS** | Tasarım korunur, sıfırdan çizilmez |
| Backend / DB | **Supabase (Postgres)** | Auth + DB + Realtime + Storage hazır |
| Kimlik | **Supabase Auth** (email/şifre) | Kod yazmadan giriş + oturum |
| Güvenlik | **Row Level Security (RLS)** | Rol ve müşteri bazlı veri izolasyonu |
| Bildirim | **Supabase Realtime** | Anlık sipariş bildirimi |
| PDF | **@react-pdf/renderer** veya server-side print | Tedarikçi sipariş formu |
| Deploy | **Vercel** (frontend) + **Supabase Cloud** (DB) | Otomatik yedek, 7/24 canlı |

---

## 2. İki Ayrı Erişim Modeli (kritik karar)

Sistemde iki tür kullanıcı var ve **bunlar farklı güvenlik yollarından geçer:**

### A) Yönetim (personel) — giriş yapar
- Supabase Auth ile **email/şifre** girişi.
- `profiles` tablosunda **rol**: `super_admin` / `admin` / `sales`.
- Tüm `/panel/*` sayfaları korumalı; RLS + rol kontrolü.

### B) Müşteri — giriş yapmaz, özel link ile gelir
- `/siparis/[slug]` — herkese açık ama **sadece o müşteriye ait** veriyi görür.
- Giriş yok (ilan gereği "özel link üzerinden").
- **Güvenlik:** Müşteri ekranı, anon anahtarla tüm veriye erişmez. Bunun yerine
  **Next.js sunucu tarafı (route handler / server action) + Supabase service role**
  üzerinden çalışır: slug'a göre müşteri bulunur, yalnızca o müşterinin fiyatları
  döner, sipariş sunucu tarafında oluşturulur. Böylece diğer müşterilerin fiyatları
  hiçbir zaman tarayıcıya sızmaz.

---

## 3. Veritabanı Şeması (Supabase / Postgres)

> Mevcut `js/data.js` seed verisi birebir bu tablolara oturur.

```
profiles          (auth.users'ı genişletir)
  id (uuid, FK auth.users)   full_name   role(super_admin|admin|sales)   active

customers
  id   code   name   contact   phone   link_slug (unique)   created_at

suppliers
  id   name   contact   phone   email

warehouses
  id   name

products
  id   name   barcode   sku   category   subcategory   brand
  supplier_id (FK)   unit   conversion   cost   price   critical_level

product_prices                    -- müşteriye özel fiyat
  id   product_id (FK)   customer_id (FK)   price
  UNIQUE(product_id, customer_id)

product_stock                     -- depo bazlı stok
  product_id (FK)   warehouse_id (FK)   quantity
  PRIMARY KEY(product_id, warehouse_id)

cost_history                      -- son alış fiyatı geçmişi (silinmez)
  id   product_id (FK)   cost   changed_at   changed_by

orders
  id   order_no   customer_id (FK)   status   note   discount
  manual_total (nullable)           -- talep #9: elle düzenlenen toplam
  created_by (FK profiles)   created_at

order_items
  id   order_id (FK)   product_id (FK)   qty   price

order_logs                        -- işlem geçmişi (kim neyi değiştirdi)
  id   order_id (FK)   user_id   text   created_at

payments
  id   customer_id (FK)   order_id (nullable FK)   amount
  method   note              -- talep #11: ödeme notu
  created_at   created_by

stock_movements
  id   type(giris|cikis|transfer)   product_id (FK)   qty
  from_warehouse   to_warehouse   ref   user_id   created_at

notifications
  id   order_id (FK)   read   created_at

tasks                             -- talep #12: görev modülü
  id   title   description   assigned_to (FK profiles)
  status(acik|devam|tamam)   due_date   created_by   created_at
```

**Sipariş durumları (enum):** Yeni Sipariş, Onaylandı, Hazırlanıyor, Tedarikçiye
İletildi, Hazır, Teslim Edildi, Tamamlandı, İptal Edildi.

---

## 4. Güvenlik / RLS Politikaları

| Tablo | Kural (özet) |
|---|---|
| `products`, `customers`, `suppliers`, `warehouses`, `orders`, ... | Giriş yapmış personel **okur**. |
| `orders` DELETE | Sadece `super_admin` (talep #3). |
| `products` DELETE | Sadece `super_admin` / `admin` (talep #4). |
| `ayarlar` / kullanıcı yönetimi | Sadece `super_admin`. |
| Müşteri ekranı | RLS'e **hiç girmez** — service role ile sunucu tarafı, slug'a kilitli. |
| `tasks` | Personel kendi atanan görevini görür; admin hepsini. |

**Rol geçiş doğrulaması (talep #2):** Süper Admin, Admin görünümüne geçerken
tekrar şifre sorulur — bu uygulama katmanında (server action ile `reauthenticate`)
çözülür.

---

## 5. Klasör Yapısı (Next.js App Router)

```
/app
  /(customer)
    /siparis/[slug]/page.tsx        # müşteri sipariş ekranı (public, sunucu tarafı veri)
  /(admin)
    /login/page.tsx                 # personel girişi (talep #1)
    /panel/
      layout.tsx                    # sidebar + appbar + bildirim zili (mevcut renderShell)
      page.tsx                      # dashboard
      siparisler/page.tsx
      cari/page.tsx
      urunler/page.tsx
      stok/page.tsx
      raporlar/page.tsx
      gorevler/page.tsx             # yeni modül
      ayarlar/page.tsx
  /api/                             # gerekli route handler'lar (PDF, müşteri sipariş)

/components
  /ui        Button, Card, Table, Modal, Badge, Toast, Input   # style.css sınıfları
  /admin     Sidebar, Appbar, NotificationBell, RoleGuard
  /order     ProductCard, CartBar, ConfirmScreen, NotesField   # müşteri ekranı

/lib
  /supabase  client.ts (browser), server.ts (SSR), service.ts (service role)
  /queries   orders.ts, products.ts, customers.ts, payments.ts, stock.ts, tasks.ts
  /utils     format.ts (tl, fmtDate — mevcut store.js'den taşınır), constants.ts

/styles
  globals.css                       # mevcut css/style.css buraya taşınır

/supabase
  /migrations                       # şema SQL
  seed.sql                          # data.js → SQL seed
```

---

## 6. Müşteri Talepleri → Mimarideki Yeri

| # | Talep | Nerede çözülür |
|---|---|---|
| 1 | Kullanıcı adı/şifre giriş | Supabase Auth + `/login` |
| 2 | Rol geçişinde şifre doğrulama | Server action `reauthenticate` |
| 3 | Süper Admin sipariş silebilir | RLS DELETE politikası |
| 4 | Ürün silme yetkisi | RLS DELETE politikası |
| 5 | Tedarikçi PDF'inde geliş fiyat listesi | `/api/pdf` — cost bilgisi dahil |
| 6 | Müşteri ekranı sade/hızlı (mobil) | `/order` bileşenleri, yeniden tasarım |
| 7 | Sipariş ekranına Notlar | `order_items` yanında `orders.note` + NotesField |
| 8 | Sipariş sonrası admin linki gizli | Müşteri layout'unda admin linki hiç yok |
| 9 | Toplam tutar elle düzenleme | `orders.manual_total` alanı |
| 10 | Müşteri son onay ekranı | `ConfirmScreen` bileşeni |
| 11 | Ödeme notu | `payments.note` alanı |
| 12 | Görevler modülü | `tasks` tablosu + `/panel/gorevler` |

---

## 7. Anlık Bildirim Akışı (Realtime)

1. Müşteri sipariş verir → sunucu `orders` + `notifications` satırı ekler.
2. Supabase Realtime, `notifications` tablosunu dinleyen panele **anlık** olay yollar.
3. Panelde zil güncellenir + toast: "Yeni sipariş: SIP-xxxx".

Mevcut demodaki `storage` event mantığının gerçek çok kullanıcılı karşılığı budur.

---

## 8. Deploy & Yedekleme

- **Frontend:** Vercel — her git push'ta otomatik deploy, ücretsiz SSL, domain.
- **DB:** Supabase Cloud — **günlük otomatik yedek** (Pro planda point-in-time).
- **Ortam değişkenleri:** `SUPABASE_URL`, `ANON_KEY` (public), `SERVICE_ROLE_KEY` (sadece sunucu).

---

## 9. Geliştirme Sırası (1 haftalık plan)

| Gün | İş |
|---|---|
| **1** | Supabase şeması + RLS + seed. Next.js iskelet, `style.css` taşıma, Auth/login. |
| **2** | Panel kabuğu (sidebar/appbar/rol/bildirim) + Ürün & Stok ekranları (gerçek veri). |
| **3** | Müşteri sipariş ekranı (`/siparis/[slug]`) — sade/mobil, notlar, son onay ekranı. |
| **4** | Sipariş yönetimi (durum, düzenle, kopyala, manuel tutar, silme yetkisi) + Realtime bildirim. |
| **5** | Cari & Tahsilat (ödeme notu) + Tedarikçi PDF (geliş fiyatlı) + Görevler modülü. |
| **6** | Roller/yetki testleri, mobil kontrol, hata ayıklama. |
| **7** | Deploy (Vercel + Supabase), domain, yedek doğrulama, müşteriye teslim. |

**Kapsam dışı (2. faz):** 10 detaylı rapor, Excel çift yönlü, çoklu depo transfer
gelişmiş senaryoları, e-fatura, WhatsApp API, mobil uygulama.

---

## 10. Tasarım Taşıma Notu

- `css/style.css` → `styles/globals.css` **neredeyse değişmeden** taşınır.
- `js/store.js` içindeki yardımcılar (`tl`, `fmtDate`, `statusBadge`, durum sabitleri)
  → `lib/utils` içine TypeScript olarak taşınır.
- `js/icons.js` ikon seti → `components/ui/Icon.tsx`.
- HTML üreten fonksiyonlar (`renderShell`, tablo/kart blokları) → React bileşenlerine
  dönüştürülür. **Görünüm birebir korunur**, yalnızca markup JSX olur.
```
```
