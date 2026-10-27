import type { Metadata } from "next";
import { VerifyView } from "@/lab/certificate/VerifyView";

export const metadata: Metadata = {
  title: "Conferir certificado · Elas em Jogo",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VerifyView />;
}
