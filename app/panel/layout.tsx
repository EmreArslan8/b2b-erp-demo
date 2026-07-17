import { getBrandName, getCurrentProfile, getNotifications } from "../../lib/supabase/queries";
import PanelShell, { type IconName } from "./PanelShell";

const navigation = [
  ["Operasyon", [["/panel", "dashboard", "Panel", "sales"], ["/panel/siparisler", "orders", "Siparişler", "sales"], ["/panel/cari", "wallet", "Cari & Tahsilat", "sales"]]],
  ["Envanter", [["/panel/urunler", "products", "Ürünler", "admin"], ["/panel/urunler/kategoriler", "categories", "Kategoriler", "admin"], ["/panel/urunler/siralama", "sort", "Ürün Sıralaması", "admin"], ["/panel/stok", "warehouse", "Stok & Depo", "admin"]]],
  ["Yönetim", [["/panel/tedarikciler", "suppliers", "Tedarikçiler", "admin"], ["/panel/raporlar", "reports", "Raporlar", "admin"], ["/panel/gecmis", "history", "İşlem Geçmişi", "admin"], ["/panel/gorevler", "tasks", "Görevler", "sales"], ["/panel/hesabim", "account", "Hesabım", "sales"], ["/panel/ayarlar", "settings", "Ayarlar", "super_admin"]]],
] as const;
const roleRank = { sales: 1, admin: 2, super_admin: 3 };

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [profile, notifications, brandName] = await Promise.all([getCurrentProfile(), getNotifications(), getBrandName()]);
  const role = (profile.data?.role ?? "sales") as keyof typeof roleRank;
  const roleLabel = role === "super_admin" ? "Süper Admin" : role === "admin" ? "Admin" : "Satış Personeli";
  const visibleNavigation = navigation.map(([group, items]) => [group, items.filter(([, , , minimumRole]) => roleRank[role] >= roleRank[minimumRole as keyof typeof roleRank]).map(([href, icon, label]) => [href, icon as IconName, label] as const)] as const).filter(([, items]) => items.length);
  return <PanelShell navigation={visibleNavigation} roleLabel={roleLabel} notifications={notifications.data} brandName={brandName}>{children}</PanelShell>;
}
