import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, DM_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Diga um Nome — protótipo",
  description: "Protótipo navegável da experiência Diga um Nome. Conteúdo fictício.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${baiJamjuree.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
