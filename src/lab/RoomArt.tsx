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

function Rio({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width="420" height="150" fill="url(#room-dots-blue-light)" opacity={lit ? 0.45 : 0.25} />
      <path d="M262 92 h140 v-44 h-140 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <path d="M306 48 l26 -16 l26 16 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <rect x="264" y="50" width="136" height="40" fill="url(#room-dots-blue-light)" opacity="0.7" />
      {[272, 286, 300, 352, 366, 380].map((x) => (
        <rect key={x} x={x} y="58" width="7" height="12" fill="#f7f8f6" stroke="#292929" strokeWidth="1" />
      ))}
      {[314, 324, 334, 344].map((x) => (
        <path key={x} d={`M${x} 92 v-36`} stroke="#292929" strokeWidth="1.6" />
      ))}
      <path d="M262 76 h140" stroke="#292929" strokeWidth="1" />
      <path d="M0 150 C 20 120 40 104 70 96 C 46 112 34 128 30 150 Z" fill="url(#room-dots-blue)" stroke="#292929" strokeWidth="1.2" />
      <path d="M0 132 C 10 106 30 86 58 76 C 38 96 22 114 16 140 Z" fill="#1001e3" opacity="0.85" stroke="#292929" strokeWidth="1.2" />
      <path d="M60 120 h250 M74 120 v28 M296 120 v28" stroke="#292929" strokeWidth="2" />
      <path d="M96 120 l4 -22 h48 l4 22 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.4" />
      <path d="M152 120 l-4 -22 h48 l4 22 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.4" />
      <path d="M156 104 h32 M157 109 h30 M158 114 h24" stroke="#292929" strokeOpacity="0.5" strokeWidth="1" />
      <path d="M106 113 c2 -6 10 -9 18 -7 c6 1 9 4 10 7 c-6 2 -18 2 -28 0 Z" fill="#ee704c" stroke="#292929" strokeWidth="1.1" />
      <circle cx="129" cy="104.5" r="2.3" fill="#f7f8f6" stroke="#292929" strokeWidth="0.9" />
      <circle cx="114" cy="109" r="1.4" fill="#292929" />
      <circle cx="120" cy="107" r="1.2" fill="#292929" />
      <circle cx="222" cy="104" r="11" fill="#f7f8f6" fillOpacity="0.5" stroke="#292929" strokeWidth="2" />
      <path d="M230 112 l12 10" stroke="#292929" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M246 120 c0 -9 7 -15 15 -14 c7 1 11 6 11 14 Z" fill="#ee704c" stroke="#292929" strokeWidth="1.3" />
      <circle cx="266" cy="108" r="3.6" fill="#f7f8f6" stroke="#292929" strokeWidth="1.1" />
      <circle cx="266.8" cy="108.2" r="1.5" fill="#292929" />
      <circle cx="254" cy="112" r="1.7" fill="#292929" />
      <circle cx="259" cy="116" r="1.4" fill="#292929" />
      <path d="M248 120 l-6 1 M270 120 l6 1" stroke="#292929" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

function Beijing({ lit }: { lit: boolean }) {
  const maze = ["M268 26 h116 v74 h-116 Z", "M280 38 h30 M322 38 h50 M280 38 v24 M296 50 h48 M356 50 v26 M280 76 h40 M332 76 h40 M300 88 h60 M372 38 v50"];
  return (
    <g>
      <rect x="0" y="0" width="420" height="150" fill="url(#room-dots-orange-light)" opacity={lit ? 0.5 : 0.28} />
      <path d={maze[0]} fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" />
      <rect x="270" y="28" width="112" height="70" fill="url(#room-dots-blue-light)" opacity="0.6" />
      <path d={maze[1]} stroke="#1001e3" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="288" cy="64" r="3" fill="#ee704c" />
      <circle cx="364" cy="82" r="3" fill="#ee704c" />
      <path d="M40 120 h270 M54 120 v28 M296 120 v28" stroke="#292929" strokeWidth="2" />
      <path d="M78 120 v-18 h28 v18" fill="#ee704c" stroke="#292929" strokeWidth="1.4" />
      <path d="M92 102 C 93 86 90 70 92 52" stroke="#292929" strokeWidth="1.4" fill="none" />
      {[60, 68, 76, 84].map((y, i) => (
        <g key={y}>
          <ellipse cx={92 + (i % 2 ? 9 : -9)} cy={y} rx="8" ry="2.6" fill="#1001e3" transform={`rotate(${i % 2 ? -30 : 30} ${92 + (i % 2 ? 9 : -9)} ${y})`} />
          <ellipse cx={92 + (i % 2 ? -7 : 7)} cy={y + 4} rx="6" ry="2.2" fill="#1001e3" transform={`rotate(${i % 2 ? 30 : -30} ${92 + (i % 2 ? -7 : 7)} ${y + 4})`} />
        </g>
      ))}
      <circle cx="92" cy="50" r="3" fill="#ee704c" stroke="#292929" strokeWidth="0.8" />
      <path d="M150 120 l8 -12 v-20 h12 v20 l8 12 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.4" />
      <path d="M152 117 l7 -10 h10 l7 10 Z" fill="url(#room-dots-blue)" />
      <path d="M200 120 h26 v-28 h-26 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.4" />
      <rect x="200" y="100" width="26" height="20" fill="#ee704c" opacity="0.9" />
      <rect x="204" y="86" width="18" height="6" fill="#292929" />
      <path d="M240 120 h40 l-6 -16 h-28 Z" fill="#f3e7c9" stroke="#292929" strokeWidth="1.3" />
      <path d="M252 108 v8 M260 108 v8 M268 108 v8" stroke="#292929" strokeWidth="1" opacity="0.7" />
      <circle cx="38" cy="40" r="15" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <circle cx="38" cy="40" r="11" fill="none" stroke="#ee704c" strokeWidth="5" />
      <circle cx="46" cy="33" r="2.6" fill="#292929" />
    </g>
  );
}

export function RoomArt({ id, lit }: { id: BenchId; lit: boolean }) {
  return (
    <svg viewBox="0 0 420 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full mix-blend-multiply">
      <Patterns />
      {id === "curie" && <Paris lit={lit} />}
      {id === "johnson" && <Langley lit={lit} />}
      {id === "lutz" && <Rio lit={lit} />}
      {id === "tu" && <Beijing lit={lit} />}
    </svg>
  );
}
