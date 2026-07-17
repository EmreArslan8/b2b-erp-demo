import { getBrandName } from "../../lib/supabase/queries";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const brandName = await getBrandName();
  return <LoginForm brandName={brandName} />;
}
