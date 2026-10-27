import type { ReactNode } from "react";
import type { BenchPhoto } from "../benches.ts";
import type { CertificateData } from "./certificate.ts";

export type PlateArtProps = { data: CertificateData; uid: string };

export type Plate = {
  scientist: { name: string; line: string; photo: BenchPhoto; credit: string };
  game: { name: string; room: string; unit: string };
  stamp: string;
  describe: (data: CertificateData) => string;
  Art: (props: PlateArtProps) => ReactNode;
};
