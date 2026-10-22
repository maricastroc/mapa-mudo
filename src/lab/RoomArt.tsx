import type { BenchId } from "./benches.ts";

function Patterns() {
  return (
    <defs>
      <pattern id="room-dots-blue" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
        <circle cx="2.5" cy="2.5" r="1.25" fill="#1001e3" />
      </pattern>
      <pattern id="room-dots-blue-light" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
        <circle cx="2.5" cy="2.5" r="0.7" fill="#1001e3" />
      </pattern>
      <pattern id="room-dots-orange" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
        <circle cx="2.5" cy="2.5" r="1.15" fill="#ee704c" />
      </pattern>
      <pattern id="room-dots-orange-light" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
        <circle cx="2.5" cy="2.5" r="0.7" fill="#ee704c" />
      </pattern>
    </defs>
  );
}

function Paris({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width="420" height="150" fill="url(#room-dots-orange-light)" opacity={lit ? 0.9 : 0.45} />
      {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="150" stroke="#292929" strokeOpacity="0.18" />
      ))}
      <rect x="250" y="22" width="78" height="54" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <path d="M289 22 V76 M250 49 H328" stroke="#292929" strokeWidth="1" />
      <rect x="252" y="24" width="74" height="50" fill="url(#room-dots-blue-light)" opacity="0.6" />
      <path d="M40 112 h86 v34 h-86 Z" fill="#292929" />
      <path d="M58 146 v-8 h50 v8" fill="#ee704c" opacity="0.85" />
      <path d="M50 112 c0 -26 66 -26 66 0 Z" fill="#292929" />
      <path d="M48 86 h70" stroke="#292929" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 86 L132 40" stroke="#292929" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 70 c-8 -10 8 -16 0 -26 M84 66 c-8 -10 8 -16 0 -26" stroke="#1001e3" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M170 120 h200" stroke="#292929" strokeWidth="2" />
      <path d="M182 120 v26 M358 120 v26" stroke="#292929" strokeWidth="2" />
      <ellipse cx="206" cy="114" rx="18" ry="5" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <ellipse cx="250" cy="115" rx="14" ry="4" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <ellipse cx="288" cy="116" rx="10" ry="3" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <circle cx="320" cy="114" r="11" fill="url(#room-dots-blue)" opacity={lit ? 0.9 : 0.5} />
      <circle cx="320" cy="115" r="3" fill="#1001e3" />
      <path d="M20 40 h70" stroke="#292929" strokeWidth="1.5" />
      <path d="M26 40 v-14 h8 v14 M44 40 v-18 h6 v18 M60 40 v-12 a5 5 0 0 1 10 0 v12" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
    </g>
  );
}

function Langley({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width="420" height="150" fill="url(#room-dots-blue-light)" opacity={lit ? 0.55 : 0.3} />
      <rect x="28" y="16" width="190" height="88" fill="#292929" />
      <circle cx="104" cy="70" r="20" fill="none" stroke="#f7f8f6" strokeWidth="1.4" />
      <ellipse cx="104" cy="62" rx="74" ry="30" fill="none" stroke="#f7f8f6" strokeWidth="1.2" strokeDasharray="5 4" />
      <path d="M150 38 q20 18 22 42" stroke="#ee704c" strokeWidth="2.4" fill="none" />
      <path d="M44 30 h30 M44 38 h22 M180 92 h26" stroke="#f7f8f6" strokeOpacity="0.7" strokeWidth="1.2" />
      <rect x="292" y="18" width="92" height="96" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <rect x="294" y="20" width="88" height="92" fill="url(#room-dots-blue)" opacity="0.55" />
      <path d="M338 102 v-58 l7 -14 l7 14 v58 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <path d="M362 112 v-60 M356 52 h12 M356 70 h12 M356 88 h12" stroke="#292929" strokeWidth="1.3" />
      <path d="M150 120 h200 M164 120 v26 M336 120 v26" stroke="#292929" strokeWidth="2" />
      <path d="M190 120 v-16 h54 v16" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <path d="M196 110 h42 M196 114 h42" stroke="#292929" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M262 120 l8 -10 h36 l-4 10" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <path d="M268 114 h30" stroke="#ee704c" strokeWidth="1.2" />
    </g>
  );
}

function SaoPaulo({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width="420" height="150" fill="url(#room-dots-blue-light)" opacity={lit ? 0.4 : 0.22} />
      <rect x="292" y="16" width="100" height="74" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <path d="M300 90 v-30 h10 v30 M314 90 v-46 h12 v46 M330 90 v-22 h8 v22 M342 90 v-38 h10 v38 M356 90 v-26 h12 v26 M372 90 v-34 h10 v34" fill="url(#room-dots-blue)" stroke="#292929" strokeWidth="1" />
      <path d="M296 86 q40 -40 92 -30" stroke="#ee704c" strokeWidth="1.6" fill="none" />
      <path d="M30 116 h300 M44 116 v30 M316 116 v30" stroke="#292929" strokeWidth="2" />
      <path d="M70 116 l6 -38 h70 l-4 38 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <path d="M84 104 q8 -14 14 -2 t14 -6 t14 4 t10 -8" stroke="#ee704c" strokeWidth="1.8" fill="none" />
      <path d="M60 116 h96" stroke="#292929" strokeWidth="3" />
      <rect x="176" y="100" width="44" height="16" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <circle cx="210" cy="108" r="2.5" fill="#1001e3" />
      <path d="M156 108 q8 -6 20 0" stroke="#292929" strokeWidth="1.2" fill="none" />
      {[240, 252, 264, 276, 288].map((x, i) => (
        <g key={x}>
          <rect x={x} y="92" width="7" height="24" fill="#f7f8f6" stroke="#292929" strokeWidth="1.2" />
          <rect x={x} y="88" width="7" height="5" fill={i % 2 ? "#1001e3" : "#ee704c"} />
        </g>
      ))}
      <path d="M40 20 c18 8 -8 22 10 32 s-8 22 10 32" stroke="#1001e3" strokeWidth="2" fill="none" />
      <path d="M58 20 c-18 8 8 22 -10 32 s8 22 -10 32" stroke="#ee704c" strokeWidth="2" fill="none" />
    </g>
  );
}

export function RoomArt({ id, lit }: { id: BenchId; lit: boolean }) {
  return (
    <svg viewBox="0 0 420 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full mix-blend-multiply">
      <Patterns />
      {id === "curie" && <Paris lit={lit} />}
      {id === "johnson" && <Langley lit={lit} />}
      {id === "jaqueline" && <SaoPaulo lit={lit} />}
    </svg>
  );
}
