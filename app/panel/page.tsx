import Link from "next/link";
import { getDashboardData } from "../../lib/supabase/queries";

export default async function PanelPage() {
  const data = await getDashboardData();
  return (
    <section>
      <p className="crumb">Genel Bakış</p>
      <h2 style={{ marginBottom: 16 }}>Yönetim Paneli</h2>
      <div className="stats">
        <div className="card stat"><div className="k">Bugünkü Sipariş</div><div className="v">{data.todayOrders}</div><div className="sub">Güncel sistem verisi</div></div>
        <div className="card stat"><div className="k">Açık Sipariş</div><div className="v accent">{data.openOrders}</div><div className="sub">işlem bekliyor</div></div>
        <div className="card stat"><div className="k">Toplam Tahsilat</div><div className="v red">₺{data.paymentTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div><div className="sub">{data.customerCount} cari hesap</div></div>
        <div className="card stat"><div className="k">Kritik Stok</div><div className="v">{data.critical}</div><div className="sub">eşik altında</div></div>
      </div>
      <div className="card card-pad" style={{ marginTop: 14 }}>
        <h3>{data.connected ? "Veri bağlantısı aktif" : "Veri bağlantısı bekleniyor"}</h3>
        <p className="sub">{data.error ?? "Panel metrikleri güncel sistem verilerinden okunuyor."}</p>
        <Link href="/" className="btn btn-primary">Ana sayfaya dön</Link>
      </div>
    </section>
  );
}
