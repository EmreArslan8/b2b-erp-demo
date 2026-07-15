import { getOrders, getProducts } from "../../../lib/supabase/queries";
import { addOrderItem, copyOrder, deleteOrder, deleteOrderItem, updateOrderDetails, updateOrderItem, updateOrderManualTotal, updateOrderStatus } from "./actions";
import OrdersBoard from "./OrdersBoard";

export default async function OrdersPage() {
  const [result, products] = await Promise.all([getOrders(), getProducts()]);
  return <section><div className="section-head"><div><div className="crumb">Operasyon</div><h2>Siparişler</h2></div><div className="spacer" /><span className="pill">{result.data.length} sipariş</span></div>{result.error ? <div className="card card-pad"><div className="empty">{result.error}</div></div> : result.data.length === 0 ? <div className="card card-pad"><div className="empty">Henüz sipariş kaydı yok.</div></div> : <OrdersBoard orders={result.data as never[]} products={products.data as never[]} updateAction={updateOrderStatus} updateDetailsAction={updateOrderDetails} updateManualTotalAction={updateOrderManualTotal} copyAction={copyOrder} updateItemAction={updateOrderItem} addItemAction={addOrderItem} deleteItemAction={deleteOrderItem} deleteAction={deleteOrder} />}</section>;
}
