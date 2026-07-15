import { getProducts } from "../../../../lib/supabase/queries";
import { saveProductOrder } from "../actions";
import ProductOrdering from "./ProductOrdering";

type Product = { id: string; name: string; sku: string; category: string; brand: string; sort_order: number };

export default async function ProductOrderingPage() {
  const result = await getProducts();
  const products = result.data as Product[];
  return <section><div className="crumb">Envanter / Ürünler</div><div className="section-head"><div><h2>Ürün Sıralaması</h2><p className="sub">Müşteri sipariş ekranında ürünlerin görüneceği sırayı belirleyin.</p></div></div>{result.error ? <div className="card card-pad empty">{result.error}</div> : <ProductOrdering initialProducts={products} action={saveProductOrder} />}<p className="catalog-foot">Toplam {products.length} ürün · Bu sıra müşteri sipariş ekranına yansır.</p></section>;
}
