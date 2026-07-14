import { getOrders } from "../../../lib/supabase/queries";
import { deleteOrder, updateOrderStatus } from "./actions";
import OrdersBoard from "./OrdersBoard";

export default async function OrdersPage() {
  const result = await getOrders();
  return <section><div className="section-head"><div><div className="crumb">Operasyon</div><h2>Siparişler</h2></div><div className="spacer" /><span className="pill">{result.data.length} sipariş</span></div>{result.error ? <div className="card card-pad"><div className="empty">{result.error}</div></div> : result.data.length === 0 ? <div className="card card-pad"><div className="empty">Henüz sipariş kaydı yok.</div></div> : <OrdersBoard orders={result.data as never[]} updateAction={updateOrderStatus} deleteAction={deleteOrder} />}</section>;
}
