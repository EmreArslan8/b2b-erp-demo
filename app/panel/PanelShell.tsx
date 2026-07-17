"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChart3, ClipboardList, FileClock, LayoutDashboard, ListOrdered, LogOut, Menu, Package, Settings, ShoppingCart, Store, Tags, Truck, UserCircle, WalletCards, X, type LucideIcon } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { createClient } from "../../lib/supabase/client";

export type IconName = "dashboard" | "orders" | "wallet" | "products" | "categories" | "sort" | "warehouse" | "suppliers" | "reports" | "history" | "tasks" | "settings" | "account";
type NavItem = readonly [href: string, icon: IconName, label: string];
type NavGroup = readonly [group: string, items: readonly NavItem[]];
type Notification = { id: string; read: boolean; created_at: string; orders?: { order_no?: string; customers?: { name?: string } | { name?: string }[] | null } | { order_no?: string; customers?: { name?: string } | { name?: string }[] | null }[] | null };

const icons: Record<IconName, LucideIcon> = { dashboard: LayoutDashboard, orders: ShoppingCart, wallet: WalletCards, products: Package, categories: Tags, sort: ListOrdered, warehouse: Store, suppliers: Truck, reports: BarChart3, history: FileClock, tasks: ClipboardList, settings: Settings, account: UserCircle };

function NavIcon({ name }: { name: IconName }) {
  const Icon = icons[name];
  return <Icon size={17} strokeWidth={1.8} className="nav-icon" aria-hidden="true" />;
}

export default function PanelShell({ children, navigation, roleLabel, notifications, brandName }: { children: React.ReactNode; navigation: readonly NavGroup[]; roleLabel: string; notifications: Notification[]; brandName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const menuScrollPosition = useRef(0);
  const pathname = usePathname();
  useEffect(() => { setIsNavigating(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
    menuScrollPosition.current = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${menuScrollPosition.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      Object.assign(body.style, previous);
      window.scrollTo(0, menuScrollPosition.current);
    };
  }, [menuOpen]);
  function closeMenu() { setMenuOpen(false); }
  async function signOut() { await createClient().auth.signOut(); window.location.assign("/login"); }
  return <div className="layout">
    {isNavigating && <div className="route-progress" role="progressbar" aria-label="Sayfa yükleniyor" />}
    {menuOpen && <button className="sidebar-backdrop" aria-label="Menüyü kapat" onClick={closeMenu} />}
    <aside className={`sidebar${menuOpen ? " open" : ""}`}>
      <div className="brand"><span className="logo-mark">▣</span> {brandName}<button className="sidebar-close" type="button" aria-label="Menüyü kapat" onClick={closeMenu}><X className="ic" /></button></div>
      {navigation.map(([group, items]) => <div className="nav-group" key={group}><div className="lab">{group}</div><nav>{items.map(([href, icon, label]) => { const active = href === "/panel" ? pathname === href : pathname.startsWith(href); return <Link className={active ? "active" : undefined} aria-current={active ? "page" : undefined} href={href} key={href} onClick={() => { setIsNavigating(true); closeMenu(); }}><NavIcon name={icon} /><span>{label}</span></Link>; })}</nav></div>)}
      <div className="foot"><button className="sidebar-logout" type="button" onClick={signOut}><LogOut className="sidebar-logout-icon" size={15} strokeWidth={1.9} /> Çıkış yap</button><Link href="/" onClick={closeMenu}>← Ana sayfa</Link></div>
    </aside>
    <div className="main">
      <header className="appbar"><button className="menu-btn" type="button" aria-label="Menüyü aç" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu className="ic" /></button><div className="appbar-title"><div className="crumb">{brandName} / Yönetim</div></div><div className="spacer" /><NotificationBell initial={notifications} /><span className="pill">{roleLabel}</span></header>
      <div className="page-body">{children}</div>
    </div>
  </div>;
}
