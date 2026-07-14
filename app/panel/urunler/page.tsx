import { getCustomers, getProducts, getStock, getSuppliers } from "../../../lib/supabase/queries";
import { createProduct, deleteProduct, updateProduct } from "./actions";
import ProductCatalog from "./ProductCatalog";

export default async function ProductsPage() {
  const [products, suppliers, stock, customers] = await Promise.all([getProducts(), getSuppliers(), getStock(), getCustomers()]);
  const stockByProduct = Object.fromEntries(stock.data.map((row) => [row.product_id, Number(row.quantity)]));
  return <section><div className="crumb">Envanter</div><h2 style={{ marginBottom: 16 }}>Ürünler</h2><div className="product-catalog"><ProductCatalog products={products.data.map((product) => ({ ...product, stock: stockByProduct[product.id] ?? 0 }))} suppliers={suppliers.data} customers={customers.data} error={products.error ?? suppliers.error ?? stock.error ?? customers.error} createAction={createProduct} updateAction={updateProduct} deleteAction={deleteProduct} /></div></section>;
}
