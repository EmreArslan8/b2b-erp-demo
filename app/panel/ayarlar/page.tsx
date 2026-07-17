import { getBrandName, getCurrentProfile, getProfiles } from "../../../lib/supabase/queries";
import { isServiceRoleConfigured } from "../../../lib/supabase/service";
import { createUser, deleteUser, updateBrandName, updateUser } from "./actions";
import BrandSettings from "./BrandSettings";
import RoleManager from "./RoleManager";

const roleLabels: Record<string, string> = { super_admin: "Süper Admin", admin: "Admin", sales: "Satış Personeli" };

export default async function SettingsPage() {
  const [profile, profiles, brandName] = await Promise.all([getCurrentProfile(), getProfiles(), getBrandName()]);
  const role = profile.data?.role ?? "sales";
  const roleLabel = roleLabels[role] ?? "Satış Personeli";
  const isSuperAdmin = role === "super_admin";
  const canManageBrand = role === "super_admin" || role === "admin";

  return <section>
    <div className="section-head"><div><div className="crumb">Yönetim</div><h2>Ayarlar</h2></div></div>

    <div className="card card-pad">
      <div className="account-head">
        <div>
          <h3>Aktif hesap</h3>
          <p className="sub">{profile.data?.full_name || "Kullanıcı"} · {profile.data?.active ? "Aktif" : "Pasif"}</p>
        </div>
        <span className="pill">{roleLabel}</span>
      </div>
      <p className="sub" style={{ marginTop: 14 }}>Ürün silme, sipariş silme ve rol değişiklikleri sunucu tarafı güvenlik kurallarıyla korunur. Kendi bilgilerinizi <b>Hesabım</b> sayfasından güncelleyebilirsiniz.</p>
    </div>

    <BrandSettings brandName={brandName} action={updateBrandName} canManage={canManageBrand} />

    {isSuperAdmin && (profiles.error
      ? <div className="card card-pad" style={{ marginTop: 14 }}><div className="empty">{profiles.error}</div></div>
      : <RoleManager profiles={profiles.data} createAction={createUser} updateAction={updateUser} deleteAction={deleteUser} canManage={isSuperAdmin} serviceConfigured={isServiceRoleConfigured()} currentUserId={profile.data?.id ?? ""} />)}
  </section>;
}
