import type { Metadata } from "next";
import { Suspense } from "react";
import { CertificatePreview } from "@/lab/certificate/CertificatePreview";

export const metadata: Metadata = {
  title: "Certificado · Elas em Jogo",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <CertificatePreview />
    </Suspense>
  );
}
