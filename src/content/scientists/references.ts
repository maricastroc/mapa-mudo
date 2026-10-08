import type { ReferenceName } from "./types.ts";

export const FOREIGN_SCIENTISTS: ReferenceName[] = [
  {
    id: "marie-curie",
    category: "foreign",
    canonicalName: "Marie Curie",
    aliases: ["Marie Sklodowska Curie", "Maria Sklodowska", "Madame Curie", "Curie"],
    note: "polonesa, fez carreira na França",
  },
  { id: "rosalind-franklin", category: "foreign", canonicalName: "Rosalind Franklin", aliases: [], note: "britânica" },
  { id: "ada-lovelace", category: "foreign", canonicalName: "Ada Lovelace", aliases: ["Ada Byron", "Lovelace"], note: "britânica" },
  { id: "katherine-johnson", category: "foreign", canonicalName: "Katherine Johnson", aliases: [], note: "estadunidense" },
  { id: "jane-goodall", category: "foreign", canonicalName: "Jane Goodall", aliases: ["Goodall"], note: "britânica" },
  { id: "hedy-lamarr", category: "foreign", canonicalName: "Hedy Lamarr", aliases: [], note: "austríaca, naturalizada estadunidense" },
  { id: "valentina-tereshkova", category: "foreign", canonicalName: "Valentina Tereshkova", aliases: ["Tereshkova"], note: "russa" },
  {
    id: "hipatia",
    category: "foreign",
    canonicalName: "Hipátia",
    aliases: ["Hipátia de Alexandria", "Hypatia"],
    note: "viveu em Alexandria, no Egito antigo",
  },
  { id: "emmy-noether", category: "foreign", canonicalName: "Emmy Noether", aliases: ["Noether"], note: "alemã" },
  { id: "lise-meitner", category: "foreign", canonicalName: "Lise Meitner", aliases: ["Meitner"], note: "austríaca" },
  { id: "grace-hopper", category: "foreign", canonicalName: "Grace Hopper", aliases: [], note: "estadunidense" },
  { id: "florence-nightingale", category: "foreign", canonicalName: "Florence Nightingale", aliases: ["Nightingale"], note: "britânica" },
  { id: "barbara-mcclintock", category: "foreign", canonicalName: "Barbara McClintock", aliases: ["McClintock"], note: "estadunidense" },
  { id: "jennifer-doudna", category: "foreign", canonicalName: "Jennifer Doudna", aliases: ["Doudna"], note: "estadunidense" },
  { id: "mileva-maric", category: "foreign", canonicalName: "Mileva Marić", aliases: ["Mileva Maric", "Mileva Einstein"], note: "sérvia" },
];

export const MALE_SCIENTISTS: ReferenceName[] = [
  { id: "albert-einstein", category: "man", canonicalName: "Albert Einstein", aliases: ["Einstein"], note: "físico alemão" },
  { id: "isaac-newton", category: "man", canonicalName: "Isaac Newton", aliases: ["Newton"], note: "físico inglês" },
  { id: "charles-darwin", category: "man", canonicalName: "Charles Darwin", aliases: ["Darwin"], note: "naturalista inglês" },
  { id: "nikola-tesla", category: "man", canonicalName: "Nikola Tesla", aliases: ["Tesla"], note: "inventor sérvio-americano" },
  { id: "stephen-hawking", category: "man", canonicalName: "Stephen Hawking", aliases: ["Hawking"], note: "físico britânico" },
  {
    id: "galileu-galilei",
    category: "man",
    canonicalName: "Galileu Galilei",
    aliases: ["Galileu", "Galileo", "Galileo Galilei"],
    note: "astrônomo italiano",
  },
  { id: "thomas-edison", category: "man", canonicalName: "Thomas Edison", aliases: ["Edison"], note: "inventor estadunidense" },
  { id: "louis-pasteur", category: "man", canonicalName: "Louis Pasteur", aliases: ["Pasteur"], note: "químico francês" },
  {
    id: "leonardo-da-vinci",
    category: "man",
    canonicalName: "Leonardo da Vinci",
    aliases: ["Da Vinci"],
    note: "artista e inventor italiano",
  },
  { id: "pitagoras", category: "man", canonicalName: "Pitágoras", aliases: [], note: "matemático grego" },
  { id: "oswaldo-cruz", category: "man", canonicalName: "Oswaldo Cruz", aliases: ["Osvaldo Cruz"], note: "médico sanitarista brasileiro" },
  { id: "carlos-chagas", category: "man", canonicalName: "Carlos Chagas", aliases: [], note: "médico brasileiro" },
  {
    id: "santos-dumont",
    category: "man",
    canonicalName: "Santos Dumont",
    aliases: ["Alberto Santos Dumont", "Santos-Dumont"],
    note: "inventor brasileiro",
  },
  { id: "cesar-lattes", category: "man", canonicalName: "César Lattes", aliases: ["Lattes"], note: "físico brasileiro" },
  { id: "vital-brazil", category: "man", canonicalName: "Vital Brazil", aliases: ["Vital Brasil"], note: "médico brasileiro" },
  { id: "adolfo-lutz", category: "man", canonicalName: "Adolfo Lutz", aliases: [], note: "médico brasileiro" },
  { id: "miguel-nicolelis", category: "man", canonicalName: "Miguel Nicolelis", aliases: ["Nicolelis"], note: "neurocientista brasileiro" },
  { id: "marcelo-gleiser", category: "man", canonicalName: "Marcelo Gleiser", aliases: ["Gleiser"], note: "físico brasileiro" },
];

export const UNCHARTED_SCIENTISTS: ReferenceName[] = [
  {
    id: "zilda-arns",
    category: "elsewhere",
    canonicalName: "Zilda Arns",
    aliases: ["Zilda Arns Neumann"],
    note: "médica pediatra e sanitarista",
  },
  {
    id: "enedina-alves-marques",
    category: "elsewhere",
    canonicalName: "Enedina Alves Marques",
    aliases: ["Enedina Marques"],
    note: "engenheira civil",
  },
  {
    id: "graziela-barroso",
    category: "elsewhere",
    canonicalName: "Graziela Barroso",
    aliases: ["Graziela Maciel Barroso"],
    note: "botânica",
  },
  {
    id: "marilia-chaves-peixoto",
    category: "elsewhere",
    canonicalName: "Marília Chaves Peixoto",
    aliases: ["Marília Peixoto"],
    note: "matemática",
  },
  {
    id: "nisia-trindade-lima",
    category: "elsewhere",
    canonicalName: "Nísia Trindade Lima",
    aliases: ["Nísia Trindade"],
    note: "socióloga e pesquisadora da Fiocruz",
  },
  { id: "adriana-melo", category: "elsewhere", canonicalName: "Adriana Melo", aliases: [], note: "médica e pesquisadora" },
  { id: "debora-diniz", category: "elsewhere", canonicalName: "Debora Diniz", aliases: [], note: "antropóloga" },
  { id: "rita-lobato", category: "elsewhere", canonicalName: "Rita Lobato", aliases: ["Rita Lobato Velho Lopes"], note: "médica" },
  { id: "glaci-zancan", category: "elsewhere", canonicalName: "Glaci Zancan", aliases: [], note: "bioquímica" },
];

export const REFERENCE_NAMES: ReferenceName[] = [...FOREIGN_SCIENTISTS, ...MALE_SCIENTISTS, ...UNCHARTED_SCIENTISTS];

export function findReference(id: string) {
  return REFERENCE_NAMES.find((r) => r.id === id);
}
