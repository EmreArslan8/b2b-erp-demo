import Link from "next/link";
import { getBrandName, getOrder, getProducts } from "../../../../lib/supabase/queries";
import { addOrderItem, copyOrder, deleteOrder, deleteOrderItem, updateOrderDetails, updateOrderItem, updateOrderManualTotal, updateOrderStatus } from "../actions";
import OrderDetailView from "../OrderDetailView";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, products, brandName] = await Promise.all([getOrder(id), getProducts(), getBrandName()]);
  if (order.error || !order.data) {
    return <section><Link className="back-link" href="/panel/siparisler">← Siparişler</Link><div className="card card-pad"><div className="empty">{order.error ?? "Sipariş bulunamadı."}</div></div></section>;
  }
  const activeProducts = products.data.filter((product) => (product as { active?: boolean }).active !== false);
  return <OrderDetailView order={order.data as never} products={activeProducts as never[]} brandName={brandName} updateAction={updateOrderStatus} updateDetailsAction={updateOrderDetails} updateManualTotalAction={updateOrderManualTotal} copyAction={copyOrder} updateItemAction={updateOrderItem} addItemAction={addOrderItem} deleteItemAction={deleteOrderItem} deleteAction={deleteOrder} />;
}
