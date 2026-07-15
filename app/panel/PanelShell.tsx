"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = readonly [href: string, icon: string, label: string];
type NavGroup = readonly [group: string, items: readonly NavItem[]];

export default function PanelShell({ children, navigation, roleLabel }: { children: React.ReactNode; navigation: readonly NavGroup[]; roleLabel: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return <div className="layout">
    {menuOpen && <button className="sidebar-backdrop" aria-label="Menüyü kapat" onClick={closeMenu} />}
    <aside className={`sidebar${menuOpen ? " open" : ""}`}>
      <div className="brand"><span className="logo-mark">▣</span> TedarikPro<button className="sidebar-close" type="button" aria-label="Menüyü kapat" onClick={closeMenu}>×</button></div>
      {navigation.map(([group, items]) => <div className="nav-group" key={group}><div className="lab">{group}</div><nav>{items.map(([href, icon, label]) => <Link href={href} key={href} onClick={closeMenu}><span aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</nav></div>)}
      <div className="foot">MVP · Supabase<br /><Link href="/" onClick={closeMenu}>← Ana sayfa</Link></div>
    </aside>
    <div className="main">
      <header className="appbar"><button className="menu-btn" type="button" aria-label="Menüyü aç" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>☰</button><div><div className="crumb">TedarikPro / Yönetim</div><h1>Operasyon Konsolu</h1></div><div className="spacer" /><span className="pill">{roleLabel}</span></header>
      <div className="page-body">{children}</div>
    </div>
  </div>;
}
