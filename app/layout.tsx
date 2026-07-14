import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TedarikPro — B2B Operasyon",
  description: "B2B sipariş, cari ve stok yönetimi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
