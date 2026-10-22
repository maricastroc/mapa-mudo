export type BenchId = "curie" | "johnson" | "jaqueline";

export type BenchRecord = { result: string; detail: string };

export type BenchPhoto = {
  src: string;
  alt: string;
  credit: string;
  focus: [number, number];
  zoom: number;
};

export type RevealClosing = { beats: string[]; highlight: number; summary: string };

export type RevealDemoCopy = {
  label: string;
  replay: string;
  captions: Record<string, string>;
  closing: RevealClosing;
  marks: Record<string, string>;
  rows?: string[];
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
    available: true,
    room: "PARIS · 1898",
    task: "Qual pedra brilha?",
    intro: {
      eyebrow: "PARIS · 1898",
      title: "Qual pedra brilha?",
      body: "Toque só nas pedras que brilham. As apagadas, deixe passar.",
    },
    reveal: {
      eyebrow: "QUEM DESCOBRIU O QUE A PEDRA ESCONDIA?",
      name: "Marie Curie",
      meta: "FÍSICA E QUÍMICA · POLÔNIA E FRANÇA",
      demo: {
        label: "MEDIÇÕES DE MARIE CURIE, 1898 · ESQUEMA ILUSTRATIVO",
        replay: "Ver de novo",
        captions: {
          real: "Na vida real, as pedras não brilham. Quem mostra a radiação é o aparelho de Marie.",
          measure: "Ela mediu um mineral depois do outro.",
          surprise: "Alguns emitiam mais do que o urânio dentro deles explicava.",
          discover: "Com Pierre, ela separou a pechblenda e achou dois elementos novos.",
        },
        closing: {
          beats: ["Marie mediu.", "Os números não batiam.", "Eram dois elementos novos."],
          highlight: 0,
          summary:
            "Marie Curie foi uma cientista polonesa que trabalhou na França e estudou a radioatividade, uma radiação invisível que o jogo mostra como brilho. Em 1898, medindo minerais com um aparelho muito sensível, percebeu que alguns emitiam mais do que o urânio dentro deles explicava. Com Pierre Curie, encontrou na pechblenda dois elementos novos, o polônio e o rádio, e depois foi a primeira pessoa a ganhar dois prêmios Nobel.",
        },
        marks: {
          meter: "MEDIDOR",
          game: "no jogo",
          real: "na vida real",
          uranium: "urânio",
          chalcolite: "calcolita",
          pitchblende: "pechblenda",
          expected: "o que o urânio explicaria",
          extra: "a mais!",
          polonium: "polônio",
          radium: "rádio",
          poloniumDate: "julho de 1898",
          radiumDate: "dezembro de 1898",
          couple: "Marie e Pierre Curie",
          fresh: "NOVO",
        },
      },
      photo: {
        src: "/lab/marie-curie.jpg",
        alt: "Retrato de perfil de Marie Curie em 1903, com o cabelo preso e uma blusa escura de gola clara listrada.",
        credit: "Marie Curie em 1903 · Foto: Fundação Nobel, domínio público",
        focus: [0.55, 0.4],
        zoom: 1.25,
      },
    },
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
        captions: {
          challenge: "Para voltar em segurança, era preciso prever o caminho.",
          computing: "O computador calculou. Glenn quis que Katherine conferisse.",
          landing: "As contas dela batiam. Glenn voou.",
        },
        closing: {
          beats: ["O computador calculou.", "Katherine conferiu.", "John Glenn confiou."],
          highlight: 1,
          summary:
            "Katherine Johnson foi uma matemática da NASA que calculou trajetórias de missões espaciais. Em 1962, John Glenn pediu que ela conferisse os cálculos do computador antes de seu voo ao redor da Terra. Seu trabalho também contribuiu para as missões Apollo, que levaram o ser humano à Lua.",
        },
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
