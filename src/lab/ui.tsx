import type { ButtonHTMLAttributes, ReactNode } from "react";

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "size-[22px]"} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 12h17" />
      <path d="M14 6l6 6-6 6" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  arrow?: boolean;
  children: ReactNode;
};

const VARIANTS = {
  primary: "min-h-[68px] bg-action px-7 text-[18px] tracking-[0.08em] text-on-action hover:brightness-110",
  outline: "min-h-[64px] border-[1.5px] border-ink bg-paper px-6 text-[16px] tracking-[0.06em] text-ink hover:bg-ink hover:text-paper",
};

export function Button({ variant = "outline", arrow, children, className, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={`pointer-events-auto inline-flex cursor-pointer items-center gap-3.5 rounded-action font-primary font-semibold whitespace-nowrap uppercase transition-colors ${VARIANTS[variant]} ${className ?? ""}`}
      {...rest}
    >
      <span>{children}</span>
      {arrow && <ArrowIcon />}
    </button>
  );
}
