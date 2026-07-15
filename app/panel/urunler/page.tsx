import { getCustomerOptions, getProducts, getStockTotals, getSupplierOptions } from "../../../lib/supabase/queries";
import { createProduct, deleteProduct, importProducts, updateProduct } from "./actions";
import ProductCatalog from "./ProductCatalog";

export default async function ProductsPage() {
  const [products, suppliers, stock, customers] = await Promise.all([getProducts(), getSupplierOptions(), getStockTotals(), getCustomerOptions()]);
  const stockByProduct = stock.data.reduce<Record<string, number>>((totals, row) => {
    totals[row.product_id] = (totals[row.product_id] ?? 0) + Number(row.quantity);
    return totals;
  }, {});
  return <section><div className="crumb">Envanter</div><h2 style={{ marginBottom: 16 }}>Ürünler</h2><div className="product-catalog"><ProductCatalog products={products.data.map((product) => ({ ...product, stock: stockByProduct[product.id] ?? 0 }))} suppliers={suppliers.data} customers={customers.data} error={products.error ?? suppliers.error ?? stock.error ?? customers.error} createAction={createProduct} updateAction={updateProduct} deleteAction={deleteProduct} importAction={importProducts} /></div></section>;
}
