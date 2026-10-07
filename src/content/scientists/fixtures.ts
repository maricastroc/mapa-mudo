import type { FeaturedScientist, KnownScientist, Participations } from "./types.ts";
import type { SheetLayout } from "../../participation/sheetLayout.ts";

export const FICTIONAL_NOTICE = "PLACEHOLDER · PERSONAGEM FICTÍCIA, NÃO É UMA PESSOA REAL";

export const FEATURED_FIXTURES: FeaturedScientist[] = [
  {
    id: "p017",
    fictional: true,
    canonicalName: "Helena Alencar",
    aliases: ["Lena Alencar"],
    field: "Ciência ambiental",
    science: { researchAreas: [], facts: [] },
    experience: {
      hints: [
        { level: 1, text: "Ela trabalha de botas, na lama do mangue.", factIds: [], note: "manguezal — onde o rio encontra o mar" },
        { level: 2, text: "Mede quanto carbono o mangue guarda.", factIds: [], note: "transecto T — cinco pontos de coleta" },
        {
          level: 3,
          text: "A amostra: um cilindro de lama antiga, com carbono de séculos.",
          factIds: [],
          note: "testemunho T-03 — um metro de sedimento",
        },
      ],
      reveal: {
        headline: "Helena Alencar",
        summary: "Personagem fictícia: mede o carbono guardado no sedimento de manguezais.",
        sourceRefs: [],
      },
      visualMotifs: [],
    },
    facts: [],
    sources: [],
    photo: null,
    scenery: {
      map: { x: 912, y: 152, code: "017" },
      places: [
        { text: "MANGUE", dx: -22, dy: -34, rotation: -8 },
        { text: "ESTUÁRIO", dx: 73.07, dy: -27.57, rotation: -70 },
        { text: "OCEANO", dx: -40, dy: -87.57, rotation: 0 },
        { text: "RIO", dx: 83.07, dy: 80.43, rotation: -76 },
      ],
      transect: { direction: { x: 0.5, y: -0.866 }, step: 1.8, points: 5, prefix: "T", sample: 2 },
      core: {
        depths: ["0 cm", "25", "50", "75", "100 cm"],
        layers: [
          { text: "raízes", at: 0.103125 },
          { text: "lama", at: 0.484375 },
          { text: "lama antiga · carbono de séculos", at: 0.875 },
        ],
        caption: "CORTE DO TESTEMUNHO T-03",
      },
    },
  },
];

export const HELENA_PARTICIPATION: Participations = { p017: 41 };

const fictionalKnown = (id: string, canonicalName: string, aliases: string[] = []): KnownScientist => ({
  id,
  canonicalName,
  aliases,
  fictional: true,
});

export const KNOWN_FIXTURES: KnownScientist[] = [
  fictionalKnown("p001", "Raimunda Nogueira"),
  fictionalKnown("p004", "Iara Bezerra"),
  fictionalKnown("p008", "Lívia Pontes"),
  fictionalKnown("p011", "Dalva Queirós"),
  fictionalKnown("p002", "Marina Sampaio"),
  fictionalKnown("p006", "Tereza Arrais"),
  fictionalKnown("p013", "Joana Holanda"),
  fictionalKnown("p009", "Cecília Mota"),
  fictionalKnown("p021", "Rosa Feitosa"),
  fictionalKnown("p015", "Ana Luísa Braga"),
  fictionalKnown("p003", "Iracema Leitão"),
  fictionalKnown("p010", "Zuleide Moura"),
  fictionalKnown("p019", "Nair Furtado"),
  fictionalKnown("p005", "Socorro Viana"),
  fictionalKnown("p014", "Luísa Rocha"),
  fictionalKnown("p016", "Fátima Girão"),
  fictionalKnown("p012", "Elisa Távora"),
  fictionalKnown("p018", "Maiara Xavier"),
  fictionalKnown("p007", "Olga Pinheiro"),
  fictionalKnown("p020", "Dora Frota"),
  fictionalKnown("p022", "Clara Meneses"),
  fictionalKnown("f-ana-clara-bastos", "Ana Clara Bastos"),
  fictionalKnown("f-ana-luisa-prado", "Ana Luísa Prado"),
  fictionalKnown("f-celina-brandao", "Celina Brandão", ["Celina Brandao Lima"]),
];

export const LAYOUT_FIXTURE: SheetLayout = {
  points: {
    p001: { x: 1170, y: 262, code: "001" },
    p004: { x: 402, y: 262, code: "004" },
    p008: { x: 640, y: 636, code: "008" },
    p011: { x: 1240, y: 640, code: "011" },
    p002: { x: 196, y: 566, code: "002" },
    p006: { x: 668, y: 232, code: "006" },
    p013: { x: 1020, y: 776, code: "013" },
    p009: { x: 420, y: 768, code: "009" },
    p021: { x: 874, y: 470, code: "021" },
    p015: { x: 1290, y: 430, code: "015" },
    p003: { x: 150, y: 236, code: "003" },
    p010: { x: 556, y: 420, code: "010" },
    p019: { x: 1130, y: 506, code: "019" },
    p005: { x: 284, y: 410, code: "005" },
    p014: { x: 800, y: 796, code: "014" },
    p016: { x: 1300, y: 806, code: "016" },
    p012: { x: 112, y: 694, code: "012" },
    p018: { x: 1080, y: 360, code: "018" },
    p007: { x: 500, y: 176, code: "007" },
    p020: { x: 1372, y: 190, code: "020" },
    p022: { x: 540, y: 866, code: "022" },
  },
  order: [
    "p001", "p017", "p004", "p008", "p011", "p002", "p006", "p013", "p009", "p021", "p015",
    "p003", "p010", "p019", "p005", "p014", "p016", "p012", "p018", "p007", "p020", "p022",
  ],
  vacancies: [
    { code: "023", x: 760, y: 352 },
    { code: "024", x: 352, y: 646 },
    { code: "025", x: 1386, y: 572 },
    { code: "026", x: 700, y: 858 },
    { code: "027", x: 1210, y: 160 },
    { code: "028", x: 980, y: 640 },
  ],
};

export const PARTICIPATIONS_FIXTURE: Participations = {
  p001: 341,
  p004: 188,
  p008: 164,
  p011: 139,
  p002: 120,
  p006: 97,
  p013: 81,
  p009: 66,
  p021: 58,
  p015: 51,
  p003: 44,
  p010: 37,
  p019: 29,
  p005: 24,
  p014: 19,
  p016: 14,
  p012: 11,
  p018: 8,
  p007: 5,
  p020: 3,
  p022: 2,
};
