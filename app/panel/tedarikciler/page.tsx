import { getSuppliers } from "../../../lib/supabase/queries";
import { createSupplier, deleteSupplier, updateSupplier } from "./actions";
import SupplierManager from "./SupplierManager";

export default async function SuppliersPage() {
  const result = await getSuppliers();
  if (result.error) return <section><div className="empty">{result.error}</div></section>;
  return <section><SupplierManager suppliers={result.data} createAction={createSupplier} updateAction={updateSupplier} deleteAction={deleteSupplier} /></section>;
}
