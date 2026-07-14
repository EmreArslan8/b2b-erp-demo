import { getDashboardData } from "../../../lib/supabase/queries";

export default async function ReportsPage() {
  const data = await getDashboardData();
  return <section><div className="crumb">Yönetim</div><h2 style={{ marginBottom: 16 }}>Raporlar</h2><div className="stats"><div className="card stat"><div className="k">Toplam sipariş</div><div className="v">{data.openOrders + data.todayOrders}</div><div className="sub">Okunan kayıtlar</div></div><div className="card stat"><div className="k">Tahsilat</div><div className="v">₺{data.paymentTotal.toFixed(2)}</div><div className="sub">payments</div></div><div className="card stat"><div className="k">Cari hesap</div><div className="v">{data.customerCount}</div><div className="sub">customers</div></div></div><div className="card card-pad" style={{ marginTop: 14 }}><h3>Rapor altyapısı</h3><p className="sub" style={{ marginTop: 6 }}>{data.error ?? "Rapor metrikleri Supabase tablolarından okunuyor."}</p></div></section>;
}
