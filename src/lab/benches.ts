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
  replay: string;
  challenge: string;
  computing: string;
  landing: string;
  closing: string[];
  summary: string;
  marks: { glenn: string; laps: string; computer: string; katherine: string; checked: string };
  rows: string[];
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
        label: "VOO DE JOHN GLENN, 1962 · ESQUEMA ILUSTRATIVO",
        replay: "Ver de novo",
        challenge: "Para voltar em segurança, era preciso prever o caminho.",
        computing: "O computador calculou. Glenn quis que Katherine conferisse.",
        landing: "As contas dela batiam. Glenn voou.",
        closing: ["O computador calculou.", "Katherine conferiu.", "John Glenn confiou."],
        summary:
          "Katherine Johnson foi uma matemática da NASA que calculou trajetórias de missões espaciais. Em 1962, John Glenn pediu que ela conferisse os cálculos do computador antes de seu voo ao redor da Terra. Seu trabalho também contribuiu para as missões Apollo, que levaram o ser humano à Lua.",
        marks: { glenn: "John Glenn", laps: "3 voltas", computer: "COMPUTADOR", katherine: "KATHERINE", checked: "CONFERIDO" },
        rows: ["4 527,1", "86,32", "21,40", "7,84"],
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
