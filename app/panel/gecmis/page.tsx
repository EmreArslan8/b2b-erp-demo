import { getActivityLogs } from "../../../lib/supabase/queries";

export default async function ActivityPage() {
  const result = await getActivityLogs();
  return <section><div className="section-head"><div><div className="crumb">Yönetim</div><h2>İşlem Geçmişi</h2></div><span className="pill">Son 200 kayıt</span></div><div className="card card-pad">{result.error ? <div className="empty">{result.error}</div> : result.data.length === 0 ? <div className="empty">Henüz işlem kaydı yok.</div> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th>Kayıt</th><th>Kullanıcı</th></tr></thead><tbody>{result.data.map((row) => <tr key={row.id}><td className="sub">{new Date(row.created_at).toLocaleString("tr-TR")}</td><td><span className="pill">{row.type}</span></td><td>{row.text}</td><td className="mono">{row.ref ?? "—"}</td><td className="sub">{row.actor ?? "Sistem"}</td></tr>)}</tbody></table></div>}</div></section>;
}
