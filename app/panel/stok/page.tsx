import { getStock, getStockOptions } from "../../../lib/supabase/queries";
import { createStockMovement } from "./actions";
import StockMovementForm from "./StockMovementForm";

export default async function StockPage() {
  const result = await getStock();
  const options = await getStockOptions();
  return <section><div className="section-head"><div><div className="crumb">Envanter</div><h2>Stok & Depo</h2></div><div className="spacer" /><StockMovementForm products={options.products} warehouses={options.warehouses} action={createStockMovement} /></div><div className="card card-pad">{result.error || options.error ? <div className="empty">{result.error ?? options.error}</div> : result.data.length === 0 ? <div className="empty">Henüz stok kaydı yok.</div> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Ürün</th><th>Depo</th><th className="num">Miktar</th><th className="num">Kritik eşik</th><th>Durum</th></tr></thead><tbody>{result.data.map((row) => { const product = Array.isArray(row.products) ? row.products[0] : row.products; const warehouse = Array.isArray(row.warehouses) ? row.warehouses[0] : row.warehouses; const critical = Number(row.quantity) <= Number(product?.critical_level ?? 0); return <tr key={`${row.product_id}-${row.warehouse_id}`}><td><b>{product?.name}</b><div className="sub mono">{product?.sku}</div></td><td>{warehouse?.name}</td><td className="num">{row.quantity}</td><td className="num">{product?.critical_level}</td><td><span className={`pill ${critical ? "badge st-cancel" : "badge st-done"}`}>{critical ? "Kritik" : "Güvenli"}</span></td></tr>; })}</tbody></table></div>}</div></section>;
}
