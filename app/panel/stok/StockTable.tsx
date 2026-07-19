"use client";

import { useMemo, useState } from "react";

type StockRow = {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity?: number;
  incoming_quantity?: number;
  products: { name?: string; sku?: string; critical_level?: number; min_stock_level?: number; last_purchase_price?: number; average_cost?: number; cost?: number } | { name?: string; sku?: string; critical_level?: number; min_stock_level?: number; last_purchase_price?: number; average_cost?: number; cost?: number }[] | null;
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
    const map = new Map<string, { id: string; name: string; sku?: string; minStock: number; physical: number; reserved: number; sellable: number; incoming: number; lastPurchase: number; averageCost: number; warehouses: { id: string; name: string; physical: number; reserved: number; sellable: number; incoming: number }[] }>();
    for (const row of rows) {
      if (warehouseId !== "all" && row.warehouse_id !== warehouseId) continue;
      const product = first(row.products);
      const warehouse = first(row.warehouses);
      const item = map.get(row.product_id) ?? {
        id: row.product_id,
        name: product?.name ?? "Ürün",
        sku: product?.sku,
        minStock: Number(product?.min_stock_level ?? product?.critical_level ?? 0),
        physical: 0,
        reserved: 0,
        sellable: 0,
        incoming: 0,
        lastPurchase: Number(product?.last_purchase_price ?? product?.cost ?? 0),
        averageCost: Number(product?.average_cost ?? product?.cost ?? 0),
        warehouses: [],
      };
      const physical = Number(row.quantity);
      const reserved = Number(row.reserved_quantity ?? 0);
      const incoming = Number(row.incoming_quantity ?? 0);
      const sellable = physical - reserved;
      item.physical += physical;
      item.reserved += reserved;
      item.sellable += sellable;
      item.incoming += incoming;
      item.warehouses.push({ id: row.warehouse_id, name: warehouse?.name ?? "Depo", physical, reserved, sellable, incoming });
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
    {grouped.length === 0 ? <div className="empty">Filtrelere uygun stok kaydı yok.</div> : <div className="tbl-wrap"><table className="tbl stock-metrics-table"><thead><tr><th>Ürün</th><th className="num">Fiziksel</th><th className="num">Rezerve</th><th className="num">Satılabilir</th><th className="num">Beklenen</th><th className="num">Min.</th><th className="num">Son alış</th><th className="num">Ort. maliyet</th><th>Depo dağılımı</th><th>Durum</th></tr></thead><tbody>{grouped.map((item) => { const critical = item.sellable <= item.minStock; return <tr key={item.id}><td><b>{item.name}</b><div className="sub mono">{item.sku ?? "—"}</div></td><td className="num"><b>{item.physical}</b></td><td className="num">{item.reserved}</td><td className={`num ${critical ? "danger-text" : ""}`}><b>{item.sellable}</b></td><td className="num">{item.incoming}</td><td className="num">{item.minStock}</td><td className="num">₺{item.lastPurchase.toFixed(2)}</td><td className="num">₺{item.averageCost.toFixed(2)}</td><td><div className="stock-warehouse-chips">{item.warehouses.map((warehouse) => <span className="stock-warehouse-chip" key={warehouse.id}>{warehouse.name} <b>{warehouse.physical}</b><small>R:{warehouse.reserved} S:{warehouse.sellable}{warehouse.incoming > 0 ? ` B:${warehouse.incoming}` : ""}</small></span>)}</div></td><td><span className={`pill badge ${critical ? "st-cancel" : "st-done"}`}>{critical ? "Kritik" : "Güvenli"}</span></td></tr>; })}</tbody></table></div>}
  </>;
}
