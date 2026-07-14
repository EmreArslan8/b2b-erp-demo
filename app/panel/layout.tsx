import Link from "next/link";
import { getCurrentProfile } from "../../lib/supabase/queries";

const navigation = [
  ["Operasyon", [["/panel", "▦", "Panel", "sales"], ["/panel/siparisler", "↗", "Siparişler", "sales"], ["/panel/cari", "▣", "Cari & Tahsilat", "sales"]]],
  ["Envanter", [["/panel/urunler", "□", "Ürünler", "admin"], ["/panel/stok", "⌂", "Stok & Depo", "admin"]]],
  ["Yönetim", [["/panel/tedarikciler", "◫", "Tedarikçiler", "admin"], ["/panel/raporlar", "◒", "Raporlar", "admin"], ["/panel/ayarlar", "⚙", "Ayarlar", "super_admin"]]],
] as const;
const roleRank = { sales: 1, admin: 2, super_admin: 3 };

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();
  const role = (profile.data?.role ?? "sales") as keyof typeof roleRank;
  const roleLabel = role === "super_admin" ? "Süper Admin" : role === "admin" ? "Admin" : "Satış Personeli";
  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><span className="logo-mark">▣</span> TedarikPro</div>
      {navigation.map(([group, items]) => { const visibleItems = items.filter(([, , , minimumRole]) => roleRank[role] >= roleRank[minimumRole as keyof typeof roleRank]); return visibleItems.length ? <div className="nav-group" key={group}><div className="lab">{group}</div><nav>{visibleItems.map(([href, icon, label]) => <Link href={href} key={href}><span aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</nav></div> : null; })}
      <div className="foot">MVP · Supabase<br /><Link href="/">← Ana sayfa</Link></div>
    </aside>
    <div className="main">
      <header className="appbar"><div><div className="crumb">TedarikPro / Yönetim</div><h1>Operasyon Konsolu</h1></div><div className="spacer" /><span className="pill">{roleLabel}</span></header>
      <div className="page-body">{children}</div>
    </div>
  </div>;
}
