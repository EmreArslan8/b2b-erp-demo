import { getStock, getStockMovements, getStockOptions } from "../../../lib/supabase/queries";
import { createStockMovement, createWarehouse, updateWarehouse } from "./actions";
import StockMovementForm from "./StockMovementForm";
import StockTable from "./StockTable";
import WarehouseManager from "./WarehouseManager";

export default async function StockPage() {
  const [result, options, movements] = await Promise.all([getStock(), getStockOptions(), getStockMovements()]);
  return <section>
    <div className="section-head"><div><div className="crumb">Envanter</div><h2>Stok &amp; Depo</h2></div><div className="spacer" /><WarehouseManager warehouses={options.warehouses} createAction={createWarehouse} updateAction={updateWarehouse} /><StockMovementForm products={options.products} warehouses={options.warehouses} action={createStockMovement} /></div>
    <div className="card card-pad">{result.error || options.error ? <div className="empty">{result.error ?? options.error}</div> : result.data.length === 0 ? <div className="empty">Henüz stok kaydı yok.</div> : <StockTable rows={result.data as never[]} warehouses={options.warehouses} />}</div>
    <div className="card card-pad stock-history-card"><div className="section-head"><div><div className="crumb">Kayıtlar</div><h3>Stok hareket geçmişi</h3></div><span className="pill">Son 100 hareket</span></div>{movements.error ? <div className="empty">{movements.error}</div> : movements.data.length === 0 ? <div className="empty">Henüz stok hareketi yok.</div> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Tarih</th><th>Ürün</th><th>İşlem</th><th className="num">Miktar</th><th>Açıklama</th></tr></thead><tbody>{movements.data.map((movement) => { const product = Array.isArray(movement.products) ? movement.products[0] : movement.products; return <tr key={movement.id}><td className="sub">{new Date(movement.created_at).toLocaleString("tr-TR")}</td><td><b>{product?.name}</b><div className="sub mono">{product?.sku}</div></td><td><span className="pill">{movement.type}</span></td><td className="num">{movement.qty}</td><td className="sub">{movement.ref || "—"}</td></tr>; })}</tbody></table></div>}</div>
  </section>;
}
