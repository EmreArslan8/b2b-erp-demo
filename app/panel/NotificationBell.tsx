"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Notification = { id: string; read: boolean; created_at: string; orders?: { order_no?: string; customers?: { name?: string } | { name?: string }[] | null } | { order_no?: string; customers?: { name?: string } | { name?: string }[] | null }[] | null };

function first<T>(value: T | T[] | null | undefined) { return Array.isArray(value) ? value[0] : value ?? undefined; }

export default function NotificationBell({ initial }: { initial: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("panel-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, async (payload) => {
      const result = await supabase.from("notifications").select("id,read,created_at,orders(order_no,customers(name))").eq("id", payload.new.id).maybeSingle();
      const notification = result.data as Notification | null;
      if (notification) setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  async function markRead(id: string) { const supabase = createClient(); await supabase.from("notifications").update({ read: true }).eq("id", id); setItems((current) => current.filter((item) => item.id !== id)); }
  return <div className="notification-wrap"><button className="notification-btn" type="button" aria-label="Bildirimler" aria-expanded={open} onClick={() => setOpen((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{items.length > 0 && <span className="notification-count">{items.length > 9 ? "9+" : items.length}</span>}</button>{open && <div className="notification-popover"><div className="notification-head"><b>Bildirimler</b><span>{items.length} okunmamış</span></div>{items.length ? items.map((item) => { const order = first(item.orders); const customer = first(order?.customers); return <button className="notification-item" key={item.id} type="button" onClick={() => markRead(item.id)}><b>Yeni sipariş</b><span>{customer?.name ?? "Müşteri"} · {order?.order_no ?? "Sipariş"}</span><small>{new Date(item.created_at).toLocaleString("tr-TR")}</small></button>; }) : <div className="notification-empty">Yeni bildirim yok.</div>}</div>}</div>;
}
