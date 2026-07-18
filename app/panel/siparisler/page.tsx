import { getBrandName, getCustomerOptions, getOrders, getProducts } from "../../../lib/supabase/queries";
import { createManualOrder } from "./actions";
import OrdersList from "./OrdersList";
import ManualOrderForm from "./ManualOrderForm";

export default async function OrdersPage() {
  const [result, products, customers] = await Promise.all([getOrders(), getProducts(), getCustomerOptions()]);
  const activeProducts = products.data.filter((product) => (product as { active?: boolean }).active !== false);
  return <section className="orders-page"><div className="section-head orders-page-head"><div><div className="crumb">Operasyon</div><h2>Siparişler</h2></div><div className="spacer" /><ManualOrderForm customers={customers.data} products={activeProducts as never[]} action={createManualOrder} /></div>{result.error ? <div className="card card-pad"><div className="empty">{result.error}</div></div> : result.data.length === 0 ? <div className="card card-pad"><div className="empty">Henüz sipariş kaydı yok. Yukarıdan “Manuel Sipariş” ile ekleyebilirsiniz.</div></div> : <OrdersList orders={result.data as never[]} />}</section>;
}
