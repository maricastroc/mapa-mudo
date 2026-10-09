function wordWidthInEm(word: string) {
  return [...word.toUpperCase()].reduce((sum, letter) => sum + 0.01 + (letter === "I" ? 0.32 : "MW".includes(letter) ? 0.86 : 0.7), 0);
}

const SPACE_IN_EM = 0.3;

export function widestWordInEm(name: string) {
  return Math.max(...name.split(" ").map(wordWidthInEm));
}

export function lineWidthInEm(text: string) {
  return text.split(" ").reduce((sum, word, i) => sum + (i > 0 ? SPACE_IN_EM : 0) + wordWidthInEm(word), 0);
}
