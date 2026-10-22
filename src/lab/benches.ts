export type BenchId = "curie" | "johnson" | "jaqueline";

export type BenchRecord = { result: string; detail: string };

export type BenchPhoto = {
  src: string;
  alt: string;
  credit: string;
  focus: [number, number];
  zoom: number;
};

export type RevealDemoCopy = {
  label: string;
  cta: string;
  replay: string;
  idle: string;
  closing: string;
};

export type Bench = {
  id: BenchId;
  available: boolean;
  room: string;
  task: string;
  intro: { eyebrow: string; title: string; body: string };
  reveal: {
    eyebrow: string;
    name: string;
    meta: string;
    demo: RevealDemoCopy | null;
    quote?: { text: string; by: string };
    photo: BenchPhoto | null;
  };
};

export const BENCHES: Bench[] = [
  {
    id: "curie",
    available: false,
    room: "PARIS · 1898",
    task: "Qual pedra brilha?",
    intro: { eyebrow: "PARIS · 1898", title: "Qual pedra brilha?", body: "" },
    reveal: { eyebrow: "", name: "Marie Curie", meta: "", demo: null, photo: null },
  },
  {
    id: "johnson",
    available: true,
    room: "LANGLEY · 1962",
    task: "Resgate no mar",
    intro: {
      eyebrow: "NASA · ANOS 1960",
      title: "Resgate no mar",
      body: "Leve o navio até onde a cápsula vai cair. E cuidado com o que vem pegando fogo.",
    },
    reveal: {
      eyebrow: "QUEM SABIA ONDE A CÁPSULA IA CAIR?",
      name: "Katherine Johnson",
      meta: "MATEMÁTICA DA NASA · ESTADOS UNIDOS",
      demo: {
        label: "ESQUEMA DO VOO DE JOHN GLENN, 1962 · FORA DE ESCALA",
        cta: "Conferir a trajetória",
        replay: "Ver de novo",
        idle: "Antes do voo, alguém precisava conferir o caminho da cápsula.",
        closing: "John Glenn pediu que Katherine conferisse à mão as contas do computador.",
      },
      quote: { text: "Se ela disser que estão certos, estou pronto.", by: "John Glenn, segundo Katherine" },
      photo: {
        src: "/lab/katherine-johnson.jpg",
        alt: "Katherine Johnson sorri em sua mesa de trabalho na NASA, com papéis de cálculo e uma calculadora, em 1966.",
        credit: "Katherine Johnson na NASA, em 1966 · Foto: NASA, domínio público",
        focus: [0.47, 0.34],
        zoom: 1.45,
      },
    },
  },
  {
    id: "jaqueline",
    available: false,
    room: "SÃO PAULO · 2020",
    task: "Monte o genoma",
    intro: { eyebrow: "SÃO PAULO · 2020", title: "Monte o genoma", body: "" },
    reveal: { eyebrow: "", name: "Jaqueline Goes de Jesus", meta: "", demo: null, photo: null },
  },
];

export function benchById(id: string | null | undefined) {
  return BENCHES.find((b) => b.id === id) ?? null;
}
