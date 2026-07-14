// ── Seed veri: Gıda / toptan bakkaliye senaryosu ──────────────────────────
// Tüm veri localStorage'da tutulur; bu dosya ilk açılışta yüklenen demo verisidir.

const SEED = {
  suppliers: [
    { id: "sup1", name: "Anadolu Gıda Dağıtım", phone: "0532 111 22 33", email: "siparis@anadolugida.com", contact: "Hasan Demir" },
    { id: "sup2", name: "Marmara İçecek A.Ş.", phone: "0533 444 55 66", email: "toptan@marmaraicecek.com", contact: "Elif Kaya" },
    { id: "sup3", name: "Ege Temizlik Ürünleri", phone: "0534 777 88 99", email: "satis@egetemizlik.com", contact: "Murat Öz" },
    { id: "sup4", name: "Medikal Ürünler Tedarikçisi", phone: "", email: "", contact: "" },
  ],

  warehouses: [
    { id: "wh1", name: "Ana Depo" },
    { id: "wh2", name: "Şube Deposu" },
    { id: "wh3", name: "Mağaza Deposu" },
  ],

  customers: [
    { id: "custA", code: "CARI-001", name: "Yıldız Market Zinciri", contact: "Ahmet Yıldız", phone: "0542 100 10 10", link: "yildiz-market" },
    { id: "custB", code: "CARI-002", name: "Güneş Bakkaliye", contact: "Fatma Güneş", phone: "0543 200 20 20", link: "gunes-bakkaliye" },
    { id: "custC", code: "CARI-003", name: "Kardeşler Şarküteri", contact: "Ali Kardeş", phone: "0544 300 30 30", link: "kardesler-sarkuteri" },
  ],

  // units: temel birim + dönüşümler (1 koli = X kutu, 1 kutu = Y adet)
  products: [
    // ── Bakliyat & Temel Gıda (sup1) ──
    { id: "p01", name: "Pirinç Baldo 1kg", barcode: "8690001000017", sku: "BKL-001", cat: "Bakliyat", brand: "Duru", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 68, price: 89, prices: { custA: 85, custB: 92, custC: 82 }, stock: { wh1: 48, wh2: 20, wh3: 12 }, critical: 15 },
    { id: "p02", name: "Bulgur Pilavlık 1kg", barcode: "8690001000024", sku: "BKL-002", cat: "Bakliyat", brand: "Duru", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 32, price: 45, prices: { custA: 42, custB: 47, custC: 41 }, stock: { wh1: 60, wh2: 25, wh3: 10 }, critical: 20 },
    { id: "p03", name: "Kırmızı Mercimek 1kg", barcode: "8690001000031", sku: "BKL-003", cat: "Bakliyat", brand: "Yayla", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 41, price: 56, prices: { custA: 53, custB: 58, custC: 51 }, stock: { wh1: 34, wh2: 14, wh3: 8 }, critical: 12 },
    { id: "p04", name: "Nohut 1kg", barcode: "8690001000048", sku: "BKL-004", cat: "Bakliyat", brand: "Yayla", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 45, price: 62, prices: { custA: 59, custB: 64, custC: 57 }, stock: { wh1: 8, wh2: 4, wh3: 2 }, critical: 12 },
    { id: "p05", name: "Makarna Burgu 500g", barcode: "8690001000055", sku: "MKR-001", cat: "Makarna & Un", brand: "Filiz", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 20 Adet", cost: 11, price: 16.5, prices: { custA: 15, custB: 17, custC: 14.5 }, stock: { wh1: 120, wh2: 40, wh3: 25 }, critical: 40 },
    { id: "p06", name: "Makarna Spagetti 500g", barcode: "8690001000062", sku: "MKR-002", cat: "Makarna & Un", brand: "Filiz", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 20 Adet", cost: 11, price: 16.5, prices: { custA: 15, custB: 17, custC: 14.5 }, stock: { wh1: 96, wh2: 30, wh3: 18 }, critical: 40 },
    { id: "p07", name: "Un Buğday 2kg", barcode: "8690001000079", sku: "MKR-003", cat: "Makarna & Un", brand: "Söke", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 10 Adet", cost: 38, price: 52, prices: { custA: 49, custB: 54, custC: 47 }, stock: { wh1: 44, wh2: 16, wh3: 6 }, critical: 15 },
    { id: "p08", name: "Ayçiçek Yağı 5L", barcode: "8690001000086", sku: "YAG-001", cat: "Yağ & Sos", brand: "Yudum", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 4 Adet", cost: 285, price: 345, prices: { custA: 330, custB: 355, custC: 325 }, stock: { wh1: 26, wh2: 10, wh3: 5 }, critical: 10 },
    { id: "p09", name: "Zeytinyağı Sızma 1L", barcode: "8690001000093", sku: "YAG-002", cat: "Yağ & Sos", brand: "Komili", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 6 Adet", cost: 210, price: 265, prices: { custA: 255, custB: 272, custC: 248 }, stock: { wh1: 18, wh2: 8, wh3: 4 }, critical: 8 },
    { id: "p10", name: "Domates Salçası 830g", barcode: "8690001000109", sku: "YAG-003", cat: "Yağ & Sos", brand: "Tat", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 42, price: 58, prices: { custA: 55, custB: 60, custC: 53 }, stock: { wh1: 52, wh2: 22, wh3: 12 }, critical: 18 },
    { id: "p11", name: "Toz Şeker 5kg", barcode: "8690001000116", sku: "SKR-001", cat: "Şeker & Tatlı", brand: "Torku", supplierId: "sup1", unit: "Çuval", conv: "1 Çuval = 5 Adet", cost: 155, price: 189, prices: { custA: 182, custB: 195, custC: 178 }, stock: { wh1: 30, wh2: 12, wh3: 6 }, critical: 10 },
    { id: "p12", name: "Çay Siyah 1kg", barcode: "8690001000123", sku: "CAY-001", cat: "Çay & Kahve", brand: "Çaykur", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 10 Adet", cost: 168, price: 210, prices: { custA: 200, custB: 215, custC: 195 }, stock: { wh1: 40, wh2: 15, wh3: 10 }, critical: 12 },
    { id: "p13", name: "Türk Kahvesi 500g", barcode: "8690001000130", sku: "CAY-002", cat: "Çay & Kahve", brand: "Kurukahveci", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 195, price: 245, prices: { custA: 235, custB: 252, custC: 230 }, stock: { wh1: 14, wh2: 6, wh3: 3 }, critical: 8 },

    // ── İçecek (sup2) ──
    { id: "p14", name: "Su 0.5L (24'lü)", barcode: "8690002000016", sku: "ICK-001", cat: "İçecek", brand: "Erikli", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 24 Adet", cost: 58, price: 78, prices: { custA: 74, custB: 80, custC: 72 }, stock: { wh1: 140, wh2: 60, wh3: 30 }, critical: 50 },
    { id: "p15", name: "Su 1.5L (6'lı)", barcode: "8690002000023", sku: "ICK-002", cat: "İçecek", brand: "Erikli", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 6 Adet", cost: 42, price: 57, prices: { custA: 54, custB: 59, custC: 52 }, stock: { wh1: 110, wh2: 45, wh3: 22 }, critical: 40 },
    { id: "p16", name: "Kola 1L (12'li)", barcode: "8690002000030", sku: "ICK-003", cat: "İçecek", brand: "Cola Turka", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 210, price: 264, prices: { custA: 252, custB: 270, custC: 246 }, stock: { wh1: 55, wh2: 20, wh3: 14 }, critical: 20 },
    { id: "p17", name: "Gazoz 250ml (24'lü)", barcode: "8690002000047", sku: "ICK-004", cat: "İçecek", brand: "Uludağ", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 24 Adet", cost: 175, price: 222, prices: { custA: 212, custB: 228, custC: 206 }, stock: { wh1: 38, wh2: 15, wh3: 8 }, critical: 15 },
    { id: "p18", name: "Meyve Suyu Vişne 1L", barcode: "8690002000054", sku: "ICK-005", cat: "İçecek", brand: "Dimes", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 285, price: 348, prices: { custA: 335, custB: 356, custC: 328 }, stock: { wh1: 24, wh2: 10, wh3: 6 }, critical: 10 },
    { id: "p19", name: "Ayran 200ml (20'li)", barcode: "8690002000061", sku: "ICK-006", cat: "İçecek", brand: "Sütaş", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 20 Adet", cost: 95, price: 126, prices: { custA: 120, custB: 130, custC: 117 }, stock: { wh1: 6, wh2: 3, wh3: 2 }, critical: 12 },
    { id: "p20", name: "Soda Sade (24'lü)", barcode: "8690002000078", sku: "ICK-007", cat: "İçecek", brand: "Beypazarı", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 24 Adet", cost: 118, price: 152, prices: { custA: 145, custB: 156, custC: 141 }, stock: { wh1: 46, wh2: 18, wh3: 9 }, critical: 18 },
    { id: "p21", name: "Enerji İçeceği 250ml (24'lü)", barcode: "8690002000085", sku: "ICK-008", cat: "İçecek", brand: "Burn", supplierId: "sup2", unit: "Koli", conv: "1 Koli = 24 Adet", cost: 380, price: 468, prices: { custA: 450, custB: 480, custC: 440 }, stock: { wh1: 16, wh2: 6, wh3: 4 }, critical: 8 },

    // ── Atıştırmalık (sup1) ──
    { id: "p22", name: "Gofret Çikolatalı (24'lü)", barcode: "8690001000147", sku: "ATS-001", cat: "Atıştırmalık", brand: "Ülker", supplierId: "sup1", unit: "Kutu", conv: "1 Koli = 6 Kutu · 1 Kutu = 24 Adet", cost: 96, price: 126, prices: { custA: 120, custB: 130, custC: 117 }, stock: { wh1: 70, wh2: 28, wh3: 16 }, critical: 24 },
    { id: "p23", name: "Bisküvi Pötibör (24'lü)", barcode: "8690001000154", sku: "ATS-002", cat: "Atıştırmalık", brand: "Eti", supplierId: "sup1", unit: "Kutu", conv: "1 Koli = 6 Kutu · 1 Kutu = 24 Adet", cost: 84, price: 110, prices: { custA: 105, custB: 113, custC: 102 }, stock: { wh1: 58, wh2: 22, wh3: 12 }, critical: 24 },
    { id: "p24", name: "Cips Klasik 110g (20'li)", barcode: "8690001000161", sku: "ATS-003", cat: "Atıştırmalık", brand: "Lay's", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 20 Adet", cost: 340, price: 420, prices: { custA: 402, custB: 430, custC: 395 }, stock: { wh1: 22, wh2: 9, wh3: 5 }, critical: 10 },
    { id: "p25", name: "Çikolata Sütlü 80g (12'li)", barcode: "8690001000178", sku: "ATS-004", cat: "Atıştırmalık", brand: "Nestlé", supplierId: "sup1", unit: "Kutu", conv: "1 Kutu = 12 Adet", cost: 264, price: 330, prices: { custA: 315, custB: 338, custC: 308 }, stock: { wh1: 30, wh2: 12, wh3: 8 }, critical: 12 },
    { id: "p26", name: "Kuruyemiş Karışık 1kg", barcode: "8690001000185", sku: "ATS-005", cat: "Atıştırmalık", brand: "Tadım", supplierId: "sup1", unit: "Adet", conv: "—", cost: 240, price: 298, prices: { custA: 285, custB: 305, custC: 278 }, stock: { wh1: 25, wh2: 10, wh3: 6 }, critical: 10 },

    // ── Kahvaltılık (sup1) ──
    { id: "p27", name: "Beyaz Peynir 1kg", barcode: "8690001000192", sku: "KHV-001", cat: "Kahvaltılık", brand: "Pınar", supplierId: "sup1", unit: "Adet", conv: "—", cost: 185, price: 232, prices: { custA: 222, custB: 238, custC: 216 }, stock: { wh1: 20, wh2: 8, wh3: 5 }, critical: 8 },
    { id: "p28", name: "Zeytin Siyah 1kg", barcode: "8690001000208", sku: "KHV-002", cat: "Kahvaltılık", brand: "Marmarabirlik", supplierId: "sup1", unit: "Adet", conv: "—", cost: 148, price: 186, prices: { custA: 178, custB: 191, custC: 173 }, stock: { wh1: 28, wh2: 11, wh3: 7 }, critical: 10 },
    { id: "p29", name: "Bal Süzme 850g", barcode: "8690001000215", sku: "KHV-003", cat: "Kahvaltılık", brand: "Balparmak", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 6 Adet", cost: 310, price: 385, prices: { custA: 368, custB: 395, custC: 360 }, stock: { wh1: 12, wh2: 5, wh3: 3 }, critical: 6 },
    { id: "p30", name: "Reçel Çilek 380g (12'li)", barcode: "8690001000222", sku: "KHV-004", cat: "Kahvaltılık", brand: "Tamek", supplierId: "sup1", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 385, price: 470, prices: { custA: 450, custB: 480, custC: 442 }, stock: { wh1: 15, wh2: 6, wh3: 4 }, critical: 6 },

    // ── Temizlik & Kağıt (sup3) ──
    { id: "p31", name: "Bulaşık Deterjanı 750ml (12'li)", barcode: "8690003000015", sku: "TMZ-001", cat: "Temizlik", brand: "Fairy", supplierId: "sup3", unit: "Koli", conv: "1 Koli = 12 Adet", cost: 420, price: 516, prices: { custA: 495, custB: 528, custC: 485 }, stock: { wh1: 26, wh2: 10, wh3: 6 }, critical: 10 },
    { id: "p32", name: "Çamaşır Deterjanı 6kg", barcode: "8690003000022", sku: "TMZ-002", cat: "Temizlik", brand: "Omo", supplierId: "sup3", unit: "Adet", conv: "1 Koli = 3 Adet", cost: 285, price: 352, prices: { custA: 338, custB: 360, custC: 330 }, stock: { wh1: 32, wh2: 12, wh3: 8 }, critical: 12 },
    { id: "p33", name: "Yüzey Temizleyici 2.5L (6'lı)", barcode: "8690003000039", sku: "TMZ-003", cat: "Temizlik", brand: "Cif", supplierId: "sup3", unit: "Koli", conv: "1 Koli = 6 Adet", cost: 310, price: 384, prices: { custA: 368, custB: 393, custC: 360 }, stock: { wh1: 18, wh2: 7, wh3: 4 }, critical: 8 },
    { id: "p34", name: "Tuvalet Kağıdı 32'li", barcode: "8690003000046", sku: "KGT-001", cat: "Kağıt Ürünleri", brand: "Selpak", supplierId: "sup3", unit: "Koli", conv: "1 Koli = 3 Paket", cost: 265, price: 328, prices: { custA: 315, custB: 336, custC: 308 }, stock: { wh1: 40, wh2: 16, wh3: 10 }, critical: 15 },
    { id: "p35", name: "Kağıt Havlu 12'li", barcode: "8690003000053", sku: "KGT-002", cat: "Kağıt Ürünleri", brand: "Selpak", supplierId: "sup3", unit: "Koli", conv: "1 Koli = 4 Paket", cost: 178, price: 222, prices: { custA: 212, custB: 228, custC: 208 }, stock: { wh1: 5, wh2: 2, wh3: 1 }, critical: 12 },
    { id: "p36", name: "Çöp Poşeti Battal (20'li rulo)", barcode: "8690003000060", sku: "KGT-003", cat: "Kağıt Ürünleri", brand: "Koroplast", supplierId: "sup3", unit: "Koli", conv: "1 Koli = 20 Rulo", cost: 145, price: 184, prices: { custA: 176, custB: 189, custC: 172 }, stock: { wh1: 34, wh2: 14, wh3: 8 }, critical: 12 },

    // ── Medikal ürünler (görselden aktarıldı) ──
    { id: "med01", name: "Avil", sku: "MED-001", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 36, price: 36, prices: { custA: 36, custB: 36, custC: 36 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med02", name: "Dekort (Deksametazon)", sku: "MED-002", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 28, price: 28, prices: { custA: 28, custB: 28, custC: 28 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med03", name: "Arveles", sku: "MED-003", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 70, price: 70, prices: { custA: 70, custB: 70, custC: 70 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med04", name: "Vitamin C", sku: "MED-004", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 60, price: 60, prices: { custA: 60, custB: 60, custC: 60 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med05", name: "Dikloron", sku: "MED-005", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 75, price: 75, prices: { custA: 75, custB: 75, custC: 75 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med06", name: "Muscoril", sku: "MED-006", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 85, price: 85, prices: { custA: 85, custB: 85, custC: 85 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med07", name: "Novaljin", sku: "MED-007", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 75, price: 75, prices: { custA: 75, custB: 75, custC: 75 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med08", name: "Bemix", sku: "MED-008", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 135, price: 135, prices: { custA: 135, custB: 135, custC: 135 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med09", name: "Buscopan", sku: "MED-009", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 56, price: 56, prices: { custA: 56, custB: 56, custC: 56 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med10", name: "Linkosol", sku: "MED-010", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 50, price: 50, prices: { custA: 50, custB: 50, custC: 50 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med11", name: "Tilkotil", sku: "MED-011", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 65, price: 65, prices: { custA: 65, custB: 65, custC: 65 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med12", name: "Metpamit", sku: "MED-012", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 50, price: 50, prices: { custA: 50, custB: 50, custC: 50 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med13", name: "Panpas", sku: "MED-013", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 85, price: 85, prices: { custA: 85, custB: 85, custC: 85 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med14", name: "Flagyl", sku: "MED-014", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 85, price: 85, prices: { custA: 85, custB: 85, custC: 85 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med15", name: "Novosef", sku: "MED-015", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 90, price: 90, prices: { custA: 90, custB: 90, custC: 90 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med16", name: "Zofer 8 mg", sku: "MED-016", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 40, price: 40, prices: { custA: 40, custB: 40, custC: 40 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med17", name: "Asist", sku: "MED-017", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 100, price: 100, prices: { custA: 100, custB: 100, custC: 100 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med18", name: "Antibiyotik (Cezol & muadilleri)", sku: "MED-018", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 90, price: 90, prices: { custA: 90, custB: 90, custC: 90 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med19", name: "Glutatyon", sku: "MED-019", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 4000, price: 4000, prices: { custA: 4000, custB: 4000, custC: 4000 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med20", name: "Parol", sku: "MED-020", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 95, price: 95, prices: { custA: 95, custB: 95, custC: 95 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med21", name: "Intraket Mavi", sku: "MED-021", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 8.5, price: 8.5, prices: { custA: 8.5, custB: 8.5, custC: 8.5 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med22", name: "Intraket Sarı", sku: "MED-022", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 8.5, price: 8.5, prices: { custA: 8.5, custB: 8.5, custC: 8.5 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med23", name: "Serum Seti", sku: "MED-023", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 8.5, price: 8.5, prices: { custA: 8.5, custB: 8.5, custC: 8.5 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med24", name: "Izotonik 100 ml", sku: "MED-024", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 50, price: 50, prices: { custA: 50, custB: 50, custC: 50 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med25", name: "Izotonik 250 ml", sku: "MED-025", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 55, price: 55, prices: { custA: 55, custB: 55, custC: 55 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med26", name: "Izotonik 500 ml", sku: "MED-026", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 60, price: 60, prices: { custA: 60, custB: 60, custC: 60 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med27", name: "Izotonik 1000 ml", sku: "MED-027", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 90, price: 90, prices: { custA: 90, custB: 90, custC: 90 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
    { id: "med28", name: "Dextroz 500 ml", sku: "MED-028", cat: "Medikal", brand: "", supplierId: "sup4", unit: "Adet", conv: "—", cost: 95, price: 95, prices: { custA: 95, custB: 95, custC: 95 }, stock: { wh1: 0, wh2: 0, wh3: 0 }, critical: 0 },
  ],

  // Alış fiyatı geçmişi (ilan: "eski alış fiyatları silinmeyecek")
  costHistory: {
    p01: [ { date: "2026-04-02", cost: 61 }, { date: "2026-05-18", cost: 65 }, { date: "2026-06-25", cost: 68 } ],
    p08: [ { date: "2026-03-11", cost: 262 }, { date: "2026-05-02", cost: 274 }, { date: "2026-06-20", cost: 285 } ],
    p12: [ { date: "2026-04-15", cost: 155 }, { date: "2026-06-10", cost: 168 } ],
    p14: [ { date: "2026-05-05", cost: 52 }, { date: "2026-06-28", cost: 58 } ],
  },
};

// Seed siparişler / tahsilatlar / stok hareketleri — tarihler bugüne göre üretilir
function seedDynamic() {
  const d = (daysAgo, h = 10, m = 30) => {
    const t = new Date(); t.setDate(t.getDate() - daysAgo); t.setHours(h, m, 0, 0);
    return t.toISOString();
  };

  const orders = [
    { id: "ord1001", no: "SIP-1001", customerId: "custA", date: d(9, 9, 12), status: "Tamamlandı", note: "",
      items: [ { productId: "p01", qty: 10, price: 85 }, { productId: "p05", qty: 20, price: 15 }, { productId: "p14", qty: 15, price: 74 }, { productId: "p22", qty: 8, price: 120 } ],
      discount: 100, log: [{ date: d(9, 9, 12), user: "Sistem", text: "Sipariş oluşturuldu" }, { date: d(8, 11, 0), user: "admin", text: "Durum: Tamamlandı" }] },
    { id: "ord1002", no: "SIP-1002", customerId: "custB", date: d(7, 14, 45), status: "Tamamlandı", note: "Kapıda teslim, öğleden sonra.",
      items: [ { productId: "p12", qty: 6, price: 215 }, { productId: "p10", qty: 10, price: 60 }, { productId: "p31", qty: 4, price: 528 } ],
      discount: 0, log: [{ date: d(7, 14, 45), user: "Sistem", text: "Sipariş oluşturuldu" }, { date: d(5, 10, 20), user: "admin", text: "Durum: Tamamlandı" }] },
    { id: "ord1003", no: "SIP-1003", customerId: "custC", date: d(5, 10, 5), status: "Teslim Edildi", note: "",
      items: [ { productId: "p27", qty: 6, price: 216 }, { productId: "p28", qty: 5, price: 173 }, { productId: "p19", qty: 10, price: 117 }, { productId: "p02", qty: 8, price: 41 } ],
      discount: 50, log: [{ date: d(5, 10, 5), user: "Sistem", text: "Sipariş oluşturuldu" }, { date: d(3, 16, 30), user: "admin", text: "Durum: Teslim Edildi" }] },
    { id: "ord1004", no: "SIP-1004", customerId: "custA", date: d(3, 11, 20), status: "Hazırlanıyor", note: "Palet ile sevk edilecek.",
      items: [ { productId: "p08", qty: 6, price: 330 }, { productId: "p11", qty: 8, price: 182 }, { productId: "p16", qty: 10, price: 252 }, { productId: "p34", qty: 6, price: 315 } ],
      discount: 0, log: [{ date: d(3, 11, 20), user: "Sistem", text: "Sipariş oluşturuldu" }, { date: d(2, 9, 15), user: "admin", text: "Durum: Hazırlanıyor" }] },
    { id: "ord1005", no: "SIP-1005", customerId: "custB", date: d(1, 15, 40), status: "Onaylandı", note: "",
      items: [ { productId: "p05", qty: 30, price: 17 }, { productId: "p06", qty: 20, price: 17 }, { productId: "p23", qty: 10, price: 113 } ],
      discount: 0, log: [{ date: d(1, 15, 40), user: "Sistem", text: "Sipariş oluşturuldu" }, { date: d(1, 16, 10), user: "admin", text: "Durum: Onaylandı" }] },
    { id: "ord1006", no: "SIP-1006", customerId: "custC", date: d(0, 9, 55), status: "Yeni Sipariş", note: "",
      items: [ { productId: "p14", qty: 20, price: 72 }, { productId: "p15", qty: 15, price: 52 }, { productId: "p20", qty: 8, price: 141 } ],
      discount: 0, log: [{ date: d(0, 9, 55), user: "Sistem", text: "Sipariş oluşturuldu" }] },
  ];

  const payments = [
    { id: "pay1", customerId: "custA", orderId: "ord1001", date: d(8, 12, 0), amount: 2000, method: "Havale", note: "" },
    { id: "pay2", customerId: "custA", orderId: "ord1001", date: d(6, 10, 30), amount: 545, method: "Nakit", note: "Bakiye kapama" },
    { id: "pay3", customerId: "custB", orderId: "ord1002", date: d(5, 11, 15), amount: 1500, method: "Kredi Kartı", note: "Kısmi ödeme" },
    { id: "pay4", customerId: "custC", orderId: "ord1003", date: d(2, 14, 0), amount: 2500, method: "Havale", note: "" },
  ];

  const movements = [
    { id: "mv1", date: d(9, 9, 15), type: "Çıkış", productId: "p01", qty: 10, from: "wh1", to: null, ref: "SIP-1001", user: "Sistem" },
    { id: "mv2", date: d(7, 15, 0), type: "Çıkış", productId: "p12", qty: 6, from: "wh1", to: null, ref: "SIP-1002", user: "Sistem" },
    { id: "mv3", date: d(6, 10, 0), type: "Giriş", productId: "p14", qty: 100, from: null, to: "wh1", ref: "ALIŞ-448", user: "admin" },
    { id: "mv4", date: d(4, 13, 30), type: "Transfer", productId: "p05", qty: 20, from: "wh1", to: "wh2", ref: "TRF-12", user: "admin" },
    { id: "mv5", date: d(2, 9, 45), type: "Transfer", productId: "p34", qty: 6, from: "wh1", to: "wh3", ref: "TRF-13", user: "satis1" },
  ];

  const notifications = [
    { id: "ntf1", date: d(0, 9, 55), orderId: "ord1006", read: false },
    { id: "ntf2", date: d(1, 15, 40), orderId: "ord1005", read: true },
  ];

  return { orders, payments, movements, notifications, orderSeq: 1006 };
}
