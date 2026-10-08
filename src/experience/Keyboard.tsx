"use client";

import type { PointerEvent, ReactNode } from "react";
import { ArrowIcon } from "./ui";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç"],
  ["Z", "X", "C", "V", "B", "N", "M", "-", "'"],
];

export const KEYBOARD_BOX = { x: 56, y: 566, w: 728, h: 288 };

type KeyboardProps = {
  onType: (text: string) => void;
  onErase: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

function keepFocus(e: PointerEvent<HTMLButtonElement>) {
  e.preventDefault();
}

function Key({ label, onPress, className, children }: { label: string; onPress: () => void; className?: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      onPointerDown={keepFocus}
      onClick={onPress}
      className={`flex h-[62px] cursor-pointer items-center justify-center border-[1.5px] border-ink bg-paper font-primary text-[24px] font-semibold text-ink transition-colors select-none active:bg-ink active:text-paper ${className ?? "w-[62px]"}`}
    >
      {children ?? label}
    </button>
  );
}

export function Keyboard({ onType, onErase, onSubmit, canSubmit }: KeyboardProps) {
  return (
    <div
      role="group"
      aria-label="Teclado"
      className="pointer-events-auto absolute flex flex-col gap-2 bg-paper p-2 compact:hidden"
      style={{ left: KEYBOARD_BOX.x, top: KEYBOARD_BOX.y, width: KEYBOARD_BOX.w }}
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-2" style={{ paddingLeft: i * 18 }}>
          {row.map((letter) => (
            <Key key={letter} label={letter} onPress={() => onType(letter)} />
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        <Key label="Apagar" onPress={onErase} className="w-[148px] text-[15px] tracking-[0.08em]">
          ⌫ APAGAR
        </Key>
        <Key label="Espaço" onPress={() => onType(" ")} className="w-[300px] text-[15px] tracking-[0.08em]">
          ESPAÇO
        </Key>
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={keepFocus}
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex h-[62px] w-[228px] cursor-pointer items-center justify-center gap-3 bg-action font-primary text-[17px] font-semibold tracking-[0.08em] text-on-action uppercase select-none disabled:cursor-default disabled:opacity-40"
        >
          Dizer
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}
