import { getCustomers } from "../../../lib/supabase/queries";
import CustomerLinks from "./CustomerLinks";
import { createPayment } from "./actions";

export default async function CustomersPage() {
  const result = await getCustomers();
  return <section><div className="section-head"><div><div className="crumb">Operasyon</div><h2>Cari & Tahsilat</h2></div><div className="spacer" /><button className="btn btn-primary">+ Yeni Cari</button></div><div className="card card-pad">{result.error ? <div className="empty">{result.error}</div> : result.data.length === 0 ? <div className="empty">Henüz cari hesap yok.</div> : <CustomerLinks customers={result.data} paymentAction={createPayment} />}</div></section>;
}
