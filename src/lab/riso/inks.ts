export const INK = {
  blue: "#1001e3",
  orange: "#ee704c",
  black: "#292929",
  paper: "#f7f8f6",
  pencil: "#55606b",
  land: "#f3ede1",
} as const;

export type Fonts = { display: string; mono: string; hand: string };

export function readFonts(element: Element): Fonts {
  const style = getComputedStyle(element);
  const pick = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value ? `${value}, ${fallback}` : fallback;
  };
  return {
    display: pick("--font-bai-jamjuree", "system-ui, sans-serif"),
    mono: pick("--font-dm-mono", "ui-monospace, monospace"),
    hand: pick("--font-caveat", "cursive"),
  };
}
