"use client";

import { useMemo, useState } from "react";

type StockRow = {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  products: { name?: string; sku?: string; critical_level?: number } | { name?: string; sku?: string; critical_level?: number }[] | null;
  warehouses: { name?: string } | { name?: string }[] | null;
};

type Warehouse = { id: string; name: string };

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export default function StockTable({ rows, warehouses }: { rows: StockRow[]; warehouses: Warehouse[] }) {
  const [query, setQuery] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sku?: string; critical: number; total: number; warehouses: { id: string; name: string; qty: number }[] }>();
    for (const row of rows) {
      if (warehouseId !== "all" && row.warehouse_id !== warehouseId) continue;
      const product = first(row.products);
      const warehouse = first(row.warehouses);
      const item = map.get(row.product_id) ?? {
        id: row.product_id,
        name: product?.name ?? "Ürün",
        sku: product?.sku,
        critical: Number(product?.critical_level ?? 0),
        total: 0,
        warehouses: [],
      };
      const qty = Number(row.quantity);
      item.total += qty;
      item.warehouses.push({ id: row.warehouse_id, name: warehouse?.name ?? "Depo", qty });
      map.set(row.product_id, item);
    }
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return [...map.values()]
      .filter((item) => !normalized || `${item.name} ${item.sku ?? ""}`.toLocaleLowerCase("tr-TR").includes(normalized))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [rows, query, warehouseId]);

  return <>
    <div className="stock-table-filters">
      <label>Ürün ara<input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün adı veya SKU" /></label>
      <label>Depo<select className="input" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="all">Tüm depolar</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
      <span className="pill">{grouped.length} ürün</span>
    </div>
    {grouped.length === 0 ? <div className="empty">Filtrelere uygun stok kaydı yok.</div> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Ürün</th><th className="num">Toplam stok</th><th>Depo dağılımı</th><th>Durum</th></tr></thead><tbody>{grouped.map((item) => { const critical = item.total <= item.critical; return <tr key={item.id}><td><b>{item.name}</b><div className="sub mono">{item.sku ?? "—"}</div></td><td className={`num ${critical ? "danger-text" : ""}`}><b>{item.total}</b></td><td><div className="stock-warehouse-chips">{item.warehouses.map((warehouse) => <span className="stock-warehouse-chip" key={warehouse.id}>{warehouse.name} <b>{warehouse.qty}</b></span>)}</div></td><td><span className={`pill badge ${critical ? "st-cancel" : "st-done"}`}>{critical ? "Kritik" : "Güvenli"}</span></td></tr>; })}</tbody></table></div>}
  </>;
}
