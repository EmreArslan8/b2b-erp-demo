import Link from "next/link";

const navigation = [
  ["Operasyon", [["/panel", "▦", "Panel"], ["/panel/siparisler", "↗", "Siparişler"], ["/panel/cari", "▣", "Cari & Tahsilat"]]],
  ["Envanter", [["/panel/urunler", "□", "Ürünler"], ["/panel/stok", "⌂", "Stok & Depo"]]],
  ["Yönetim", [["/panel/raporlar", "◒", "Raporlar"], ["/panel/ayarlar", "⚙", "Ayarlar"]]],
] as const;

export default function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><span className="logo-mark">▣</span> TedarikPro</div>
      {navigation.map(([group, items]) => <div className="nav-group" key={group}><div className="lab">{group}</div><nav>{items.map(([href, icon, label]) => <Link href={href} key={href}><span aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</nav></div>)}
      <div className="foot">MVP · Supabase<br /><Link href="/">← Ana sayfa</Link></div>
    </aside>
    <div className="main">
      <header className="appbar"><div><div className="crumb">TedarikPro / Yönetim</div><h1>Operasyon Konsolu</h1></div><div className="spacer" /><span className="pill">Supabase</span></header>
      <div className="page-body">{children}</div>
    </div>
  </div>;
}
