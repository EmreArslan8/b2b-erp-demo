import { createClient } from "../../../lib/supabase/server";
import { getCurrentProfile } from "../../../lib/supabase/queries";
import { updateOwnPassword, updateOwnProfile } from "./actions";
import AccountManager from "./AccountManager";

export default async function AccountPage() {
  const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const role = profile.data?.role ?? "sales";
  const roleLabel = role === "super_admin" ? "Süper Admin" : role === "admin" ? "Admin" : "Satış Personeli";
  return <section><div className="crumb">Hesap</div><h2 style={{ marginBottom: 16 }}>Hesabım</h2><AccountManager fullName={profile.data?.full_name ?? ""} email={user?.email ?? ""} roleLabel={roleLabel} profileAction={updateOwnProfile} passwordAction={updateOwnPassword} /></section>;
}
