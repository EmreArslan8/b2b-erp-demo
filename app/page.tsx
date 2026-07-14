import Link from "next/link";

const customers = [
  ["Yıldız Market Zinciri", "yildiz-market"],
  ["Güneş Bakkaliye", "gunes-bakkaliye"],
  ["Kardeşler Şarküteri", "kardesler-sarkuteri"],
];

export default function HomePage() {
  return (
    <main className="landing">
      <span className="logo-mark">▣</span>
      <div className="logo">Tedarik<em>Pro</em></div>
      <p className="tag">B2B sipariş, cari hesap ve stok yönetim konsolu — <b>yeni altyapı</b>.</p>
      <h4>Müşteri sipariş linkleri</h4>
      <div className="landing-cards">
        {customers.map(([name, slug]) => (
          <Link className="card landing-card" href={`/siparis/${slug}`} key={slug}>
            <div className="em">⌂</div>
            <h3>{name}</h3>
            <p>Özel fiyat listesi ile sipariş ekranını açın.</p>
            <div className="go">Sipariş ekranını aç →</div>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 28 }}><Link className="btn btn-dark" href="/panel">▦ Yönetim Paneline Gir</Link></div>
    </main>
  );
}
