import { getCurrentProfile } from "../../lib/supabase/queries";
import PanelShell from "./PanelShell";

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
  const visibleNavigation = navigation.map(([group, items]) => [group, items.filter(([, , , minimumRole]) => roleRank[role] >= roleRank[minimumRole as keyof typeof roleRank]).map(([href, icon, label]) => [href, icon, label] as const)] as const).filter(([, items]) => items.length);
  return <PanelShell navigation={visibleNavigation} roleLabel={roleLabel}>{children}</PanelShell>;
}
