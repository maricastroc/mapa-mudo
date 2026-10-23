import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, Caveat, DM_Mono } from "next/font/google";
import "./globals.css";

const baiJamjuree = Bai_Jamjuree({
  variable: "--font-bai-jamjuree",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elas em Jogo",
  description: "Jogue primeiro e descubra depois a cientista por trás de cada jogo. ÍRIS · Ciência Delas.",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${baiJamjuree.variable} ${dmMono.variable} ${caveat.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
