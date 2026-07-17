import Link from "next/link";
import { getBrandName, getCustomerLinks } from "../lib/supabase/queries";

export default async function HomePage() {
  const [brandName, customers] = await Promise.all([getBrandName(), getCustomerLinks()]);
  const brandParts = brandName.split(" ");
  const brandLead = brandParts.slice(0, -1).join(" ");
  const brandTail = brandParts.length > 1 ? brandParts[brandParts.length - 1] : "";
  return (
    <main className="landing">
      <span className="logo-mark">▣</span>
      <div className="logo">{brandTail ? <>{brandLead} <em>{brandTail}</em></> : brandName}</div>
      <p className="tag">B2B sipariş, cari hesap ve stok yönetim konsolu — <b>yeni altyapı</b>.</p>
      <h4>Müşteri sipariş linkleri</h4>
      <div className="landing-cards">
        {customers.data.length === 0 ? (
          <p className="sub">Henüz aktif müşteri linki yok. Cari & Tahsilat ekranından müşteri ekleyin.</p>
        ) : (
          customers.data.map((customer) => (
            <Link className="card landing-card" href={`/siparis/${customer.link_slug}`} key={customer.id}>
              <div className="em">⌂</div>
              <h3>{customer.name}</h3>
              <p>Özel fiyat listesi ile sipariş ekranını açın.</p>
              <div className="go">Sipariş ekranını aç →</div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
