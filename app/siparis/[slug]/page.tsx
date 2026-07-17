import { getBrandName, getCustomerProducts } from "../../../lib/supabase/queries";
import OrderExperience from "./OrderExperience";

export default async function OrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, brandName] = await Promise.all([getCustomerProducts(slug), getBrandName()]);
  if (data.error || !data.customer) return <main className="empty">{data.error ?? "Müşteri bulunamadı."}</main>;
  return <OrderExperience customerName={data.customer.name} customerSlug={slug} products={data.products} brandName={brandName} />;
}
