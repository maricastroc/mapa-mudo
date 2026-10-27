import type { ReactNode, SVGProps } from "react";
import { INK } from "../riso/inks.ts";

export const FONT = {
  display: "var(--font-bai-jamjuree), system-ui, sans-serif",
  mono: "var(--font-dm-mono), ui-monospace, monospace",
  hand: "var(--font-caveat), cursive",
} as const;

export const SOFT = "#4e6473";

type TextProps = Omit<SVGProps<SVGTextElement>, "fontFamily"> & {
  size: number;
  track?: number;
  children: ReactNode;
};

function make(family: string, defaults: { weight: number; track: number }) {
  return function Text({ size, track = defaults.track, fontWeight, fill = INK.black, style, children, ...rest }: TextProps) {
    return (
      <text
        fontSize={size}
        fontWeight={fontWeight ?? defaults.weight}
        letterSpacing={size * track}
        fill={fill}
        style={{ fontFamily: family, ...style }}
        {...rest}
      >
        {children}
      </text>
    );
  };
}

export const Mono = make(FONT.mono, { weight: 400, track: 0.14 });
export const Display = make(FONT.display, { weight: 600, track: -0.02 });
export const Hand = make(FONT.hand, { weight: 600, track: 0 });
export const Body = make(FONT.display, { weight: 400, track: 0 });
