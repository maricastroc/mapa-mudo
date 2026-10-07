function wordWidthInEm(word: string) {
  return [...word.toUpperCase()].reduce((sum, letter) => sum + 0.01 + (letter === "I" ? 0.32 : "MW".includes(letter) ? 0.86 : 0.7), 0);
}

export function widestWordInEm(name: string) {
  return Math.max(...name.split(" ").map(wordWidthInEm));
}
