"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal } from "lucide-react";

type Order = {
  id: string; order_no: string; status: string; discount: number; manual_total: number | null; created_at: string;
  customers: { name?: string } | { name?: string }[] | null;
  order_items: { qty: number; price: number }[];
};

const STATUS_ORDER = ["Yeni Sipariş", "Onaylandı", "Hazırlanıyor", "Tedarikçiye İletildi", "Hazır", "Teslim Edildi", "Tamamlandı", "İptal Edildi"];
const statusClasses: Record<string, string> = { "Yeni Sipariş": "st-new", "Onaylandı": "st-approved", "Hazırlanıyor": "st-prep", "Tedarikçiye İletildi": "st-supplier", "Hazır": "st-ready", "Teslim Edildi": "st-delivered", "Tamamlandı": "st-done", "İptal Edildi": "st-cancel" };

function first<T>(value: T | T[] | null): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
function lower(value: string) { return value.toLocaleLowerCase("tr-TR"); }
function orderTotal(order: Order) { return order.manual_total ?? order.order_items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0) - Number(order.discount ?? 0); }

export default function OrdersList({ orders }: { orders: Order[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tümü");
  const [customer, setCustomer] = useState("Tümü");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState("newest");

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((order) => counts.set(order.status, (counts.get(order.status) ?? 0) + 1));
    return counts;
  }, [orders]);
  const presentStatuses = STATUS_ORDER.filter((value) => statusCounts.has(value));
  const customers = useMemo(() => [...new Set(orders.map((order) => first(order.customers)?.name).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "tr-TR")), [orders]);
  const activeFilterCount = [status !== "Tümü", customer !== "Tümü", Boolean(startDate), Boolean(endDate), Boolean(minAmount), Boolean(maxAmount)].filter(Boolean).length;

  function clearFilters() {
    setStatus("Tümü"); setCustomer("Tümü"); setStartDate(""); setEndDate(""); setMinAmount(""); setMaxAmount("");
  }

  const filtered = useMemo(() => {
    const q = lower(query.trim());
    const matches = orders.filter((order) => {
      if (status !== "Tümü" && order.status !== status) return false;
      const customerName = first(order.customers)?.name ?? "";
      if (customer !== "Tümü" && customerName !== customer) return false;
      const createdAt = new Date(order.created_at).getTime();
      if (startDate && createdAt < new Date(`${startDate}T00:00:00`).getTime()) return false;
      if (endDate && createdAt > new Date(`${endDate}T23:59:59.999`).getTime()) return false;
      const total = orderTotal(order);
      if (minAmount !== "" && total < Number(minAmount)) return false;
      if (maxAmount !== "" && total > Number(maxAmount)) return false;
      if (!q) return true;
      return lower(order.order_no).includes(q) || lower(customerName).includes(q) || lower(order.status).includes(q);
    });

    return [...matches].sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "amount-desc") return orderTotal(b) - orderTotal(a);
      if (sort === "amount-asc") return orderTotal(a) - orderTotal(b);
      if (sort === "order-no") return a.order_no.localeCompare(b.order_no, "tr-TR", { numeric: true });
      if (sort === "customer") return (first(a.customers)?.name ?? "").localeCompare(first(b.customers)?.name ?? "", "tr-TR");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [customer, endDate, maxAmount, minAmount, orders, query, sort, startDate, status]);

  return <>
    <div className="orders-toolbar">
      <label className="orders-control orders-search">
        <span className="orders-control-label">Arama</span>
        <span className="orders-control-field"><Search size={16} /><input className="input" type="search" placeholder="Sipariş no, müşteri veya durum ara…" value={query} onChange={(event) => setQuery(event.target.value)} /></span>
      </label>
      <div className="orders-control">
        <span className="orders-control-label">Filtrele</span>
        <button className={`input orders-filter-trigger ${activeFilterCount ? "active" : ""}`} type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal size={16} /><span>{activeFilterCount ? `${activeFilterCount} filtre aktif` : "Tüm filtreler"}</span><ChevronDown size={15} /></button>
      </div>
      <label className="orders-control">
        <span className="orders-control-label">Sırala</span>
        <span className="orders-control-field"><ArrowUpDown size={16} /><select className="input" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">En yeni önce</option><option value="oldest">En eski önce</option><option value="amount-desc">Tutar: yüksekten düşüğe</option><option value="amount-asc">Tutar: düşükten yükseğe</option><option value="order-no">Sipariş numarası</option><option value="customer">Müşteri adına göre</option></select></span>
      </label>
    </div>

    {filterOpen && <div className="orders-filter-panel">
      <div className="orders-filter-panel-head"><div><b>Gelişmiş filtreler</b><span>Listeyi birden fazla ölçüte göre daraltın.</span></div>{activeFilterCount > 0 && <button className="btn btn-ghost btn-sm" type="button" onClick={clearFilters}>Filtreleri temizle</button>}</div>
      <div className="orders-filter-grid">
        <label><span>Durum</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="Tümü">Tüm durumlar ({orders.length})</option>{presentStatuses.map((value) => <option key={value} value={value}>{value} ({statusCounts.get(value)})</option>)}</select></label>
        <label><span>Müşteri</span><select className="input" value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="Tümü">Tüm müşteriler</option>{customers.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Başlangıç tarihi</span><input className="input" type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span>Bitiş tarihi</span><input className="input" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label><span>Minimum tutar</span><input className="input" type="number" min="0" step="0.01" placeholder="₺0,00" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} /></label>
        <label><span>Maksimum tutar</span><input className="input" type="number" min="0" step="0.01" placeholder="Sınır yok" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} /></label>
      </div>
    </div>}

    <div className="order-list">
      <div className="order-list-head"><span>Sipariş</span><span>Müşteri</span><span>Tarih</span><span>Durum</span><span className="num">Tutar</span><span /></div>
      {filtered.length === 0 ? <div className="empty">Arama ve filtrelerle eşleşen sipariş bulunamadı.</div> : filtered.map((order) => {
        const customerName = first(order.customers)?.name ?? "—";
        return <Link className="order-list-row" href={`/panel/siparisler/${order.id}`} key={order.id}>
          <span className="mono order-list-no"><b>{order.order_no}</b></span>
          <span className="order-list-customer">{customerName}</span>
          <span className="sub order-list-date">{new Date(order.created_at).toLocaleDateString("tr-TR")}</span>
          <span className="order-list-status"><span className={`badge ${statusClasses[order.status] ?? "st-new"}`}>{order.status}</span></span>
          <b className="num order-list-total">₺{orderTotal(order).toFixed(2)}</b>
          <span className="order-list-chevron" aria-hidden="true">›</span>
        </Link>;
      })}
    </div>
    <p className="catalog-foot">{filtered.length} / {orders.length} sipariş gösteriliyor</p>
  </>;
}
