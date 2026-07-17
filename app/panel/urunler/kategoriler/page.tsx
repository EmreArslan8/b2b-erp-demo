import { getCategories } from "../../../../lib/supabase/queries";
import { createCategory, deleteCategory, renameCategory } from "./actions";
import CategoryManager from "./CategoryManager";

export default async function CategoriesPage() {
  const result = await getCategories();
  return <section>{result.error ? <><div className="section-head"><div><div className="crumb">Envanter</div><h2>Kategoriler</h2></div></div><div className="card card-pad"><div className="empty">{result.error}</div></div></> : <CategoryManager categories={result.data} createAction={createCategory} renameAction={renameCategory} deleteAction={deleteCategory} />}</section>;
}
