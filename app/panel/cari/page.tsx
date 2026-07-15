import { getCustomers } from "../../../lib/supabase/queries";
import CustomerLinks from "./CustomerLinks";
import { createCustomer, createPayment, deletePayment, updateCustomer, updatePayment } from "./actions";

export default async function CustomersPage() {
  const result = await getCustomers();
  return <section><div className="section-head"><div><div className="crumb">Operasyon</div><h2>Cari & Tahsilat</h2></div><div className="spacer" /></div><div className="card card-pad">{result.error ? <div className="empty">{result.error}</div> : <CustomerLinks customers={result.data} paymentAction={createPayment} createAction={createCustomer} updateAction={updateCustomer} deletePaymentAction={deletePayment} updatePaymentAction={updatePayment} />}</div></section>;
}
