import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Caveat } from "next/font/google";

const caveat = Caveat({
  variable: "--font-caveat",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elas em Jogo",
  description: "Jogue primeiro e descubra depois a cientista por trás de cada jogo. ÍRIS · Ciência Delas.",
};

export default function LabLayout({ children }: { children: ReactNode }) {
  return <div className={`${caveat.variable} fixed inset-0 overflow-hidden`}>{children}</div>;
}
