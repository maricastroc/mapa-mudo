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
  variant?: "primary" | "outline" | "subtle";
  arrow?: boolean;
  children: ReactNode;
};

const VARIANTS = {
  primary:
    "min-h-[68px] bg-action px-7 text-[18px] tracking-[0.08em] text-on-action hover:brightness-110 compact:min-h-[56px] compact:px-5 compact:text-[15px]",
  outline:
    "min-h-[64px] border-[1.5px] border-ink bg-paper px-6 text-[16px] tracking-[0.06em] text-ink hover:bg-ink hover:text-paper compact:min-h-[52px] compact:px-4 compact:text-[14px]",
  subtle: "min-h-[44px] px-2 text-[12px] tracking-[0.08em] text-ink-soft underline underline-offset-4 hover:text-ink",
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

export function PaperStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`box-decoration-clone bg-paper ${className ?? ""}`}>
      <span className="relative">{children}</span>
    </span>
  );
}

export function TriangleMarker({ tone = "ink", className }: { tone?: "ink" | "accent"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-0 w-0 border-x-[6px] border-b-[11px] border-x-transparent ${tone === "accent" ? "border-b-accent" : "border-b-ink"} ${className ?? ""}`}
    />
  );
}
