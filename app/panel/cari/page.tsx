import { getCustomers } from "../../../lib/supabase/queries";
import CustomerLinks from "./CustomerLinks";
import { createCustomer, createPayment, deleteCustomer, deletePayment, reactivateCustomer, updateCustomer, updatePayment } from "./actions";

export default async function CustomersPage() {
  const result = await getCustomers();
  return <section>{result.error ? <><div className="section-head"><div><div className="crumb">Operasyon</div><h2>Cari & Tahsilat</h2></div></div><div className="card card-pad"><div className="empty">{result.error}</div></div></> : <CustomerLinks customers={result.data} paymentAction={createPayment} createAction={createCustomer} updateAction={updateCustomer} deletePaymentAction={deletePayment} updatePaymentAction={updatePayment} deleteCustomerAction={deleteCustomer} reactivateAction={reactivateCustomer} />}</section>;
}
