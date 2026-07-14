import { getCustomers } from "../../../lib/supabase/queries";

export default async function CustomersPage() {
  const result = await getCustomers();
  return <section><div className="section-head"><div><div className="crumb">Operasyon</div><h2>Cari & Tahsilat</h2></div><div className="spacer" /><button className="btn btn-primary">+ Yeni Cari</button></div><div className="card card-pad">{result.error ? <div className="empty">{result.error}</div> : result.data.length === 0 ? <div className="empty">Henüz cari hesap yok.</div> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Kod</th><th>Firma</th><th>Yetkili</th><th>Telefon</th><th>Durum</th></tr></thead><tbody>{result.data.map((customer) => <tr key={customer.id}><td className="mono">{customer.code}</td><td><b>{customer.name}</b><div className="sub">/{customer.link_slug}</div></td><td>{customer.contact || "—"}</td><td>{customer.phone || "—"}</td><td><span className="pill">{customer.active ? "Aktif" : "Pasif"}</span></td></tr>)}</tbody></table></div>}</div></section>;
}
