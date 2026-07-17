import type { Metadata } from "next";
import "./globals.css";
import { getBrandName } from "../lib/supabase/queries";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandName();
  return {
    title: `${brand} — B2B Operasyon`,
    description: "B2B sipariş, cari ve stok yönetimi",
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
