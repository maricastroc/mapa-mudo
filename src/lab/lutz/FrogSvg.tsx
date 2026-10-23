import { useId } from "react";
import { INK } from "../riso/inks.ts";
import { BELLY_ALPHA, IRIS_COLOR, limbAt, MARK_COLOR, REST_POSE, RIGS, shadeDots, SKIN_COLOR, type FramePose, type Look, type Point } from "./frogArt.ts";

const SHADE = shadeDots();

type FrogSvgProps = { look: Look; x: number; y: number; size: number; facing?: 1 | -1; pose?: FramePose; opacity?: number };

function Limb({ points, widths, color, extra }: { points: Point[]; widths: number[]; color: string; extra: number }) {
  return (
    <g stroke={color} strokeLinecap="round">
      {points.slice(0, -1).map((p, i) => (
        <line key={i} x1={p.x} y1={p.y} x2={points[i + 1].x} y2={points[i + 1].y} strokeWidth={widths[Math.min(i, widths.length - 1)] + extra} />
      ))}
    </g>
  );
}

function Toes({ tip, before, skin, ink, length, width, disc }: { tip: Point; before: Point; skin: string; ink: number; length: number; width: number; disc: number }) {
  const angle = Math.atan2(tip.y - before.y, tip.x - before.x);
  const ends = [-0.42, 0.02, 0.4].map((spread, i) => {
    const l = length * (i === 1 ? 1 : 0.8);
    return { x: tip.x + Math.cos(angle + spread) * l, y: tip.y + Math.sin(angle + spread) * l };
  });
  return (
    <g strokeLinecap="round">
      {[INK.black, skin].map((color, pass) => (
        <g key={pass} stroke={color} strokeWidth={width + (pass ? 0 : ink * 2)}>
          {ends.map((e, i) => (
            <line key={i} x1={tip.x} y1={tip.y} x2={e.x} y2={e.y} />
          ))}
        </g>
      ))}
      {disc > 0 && ends.map((e, i) => <circle key={i} cx={e.x} cy={e.y} r={disc * (length > 5 ? 1 : 0.75)} fill={skin} stroke={INK.black} strokeWidth={ink * 0.8} />)}
    </g>
  );
}

export function FrogSvg({ look, x, y, size, facing = 1, pose = REST_POSE, opacity }: FrogSvgProps) {
  const clip = `frog-${useId().replace(/:/g, "")}`;
  const rig = RIGS[look.build];
  const skin = SKIN_COLOR[look.skin];
  const mark = MARK_COLOR[look.skin];
  const unit = size / 100;
  const ink = Math.max(1.1, Math.min(3.2, size * 0.024)) / unit;
  const hind = limbAt(rig.hind, pose.stretch);
  const fore = limbAt(rig.fore, pose.stretch);
  const squash = Math.max(-0.6, Math.min(0.8, pose.squash));
  const farHind = hind.map((q) => ({ x: q.x - 4, y: q.y - 3 }));
  const farFore = fore.map((q) => ({ x: q.x - 5, y: q.y - 2.5 }));
  const transform = `translate(${x} ${y}) scale(${facing * unit * (1 + squash * 0.14)} ${unit * (1 - squash * 0.17)}) rotate(${(pose.tilt * 180) / Math.PI} ${rig.center.x} ${rig.center.y})`;
  const { eye } = rig;
  return (
    <g transform={transform} opacity={opacity}>
      <defs>
        <clipPath id={clip}>
          <path d={rig.body} />
        </clipPath>
      </defs>
      {[
        [farHind, rig.hind.widths],
        [farFore, rig.fore.widths],
      ].map(([points, widths], i) => (
        <g key={i}>
          <Limb points={points as Point[]} widths={widths as number[]} color={INK.black} extra={ink * 2} />
          <Limb points={points as Point[]} widths={widths as number[]} color={skin} extra={0} />
          <Limb points={points as Point[]} widths={widths as number[]} color="rgba(41, 41, 41, 0.38)" extra={0} />
        </g>
      ))}
      <path d={rig.body} fill={skin} />
      <g clipPath={`url(#${clip})`}>
        {look.mark === "spots" && rig.spots.map(([sx, sy, r], i) => <circle key={i} cx={sx} cy={sy} r={r} fill={mark} />)}
        {look.mark === "bands" && <path d={rig.bands} fill={mark} />}
        {look.mark === "stripe" && <path d={rig.stripe} fill={mark} stroke={look.skin === "blue" ? INK.black : skin} strokeWidth={ink * 0.7} />}
        <g fill={look.skin === "black" ? "rgba(247, 248, 246, 0.16)" : "rgba(41, 41, 41, 0.3)"}>
          {SHADE.map(([sx, sy, r], i) => (
            <circle key={i} cx={sx} cy={sy} r={r} />
          ))}
        </g>
        <path d={rig.belly} fill={INK.paper} opacity={BELLY_ALPHA[look.skin]} />
        {rig.warts.map(([wx, wy, r], i) => (
          <g key={i}>
            <circle cx={wx} cy={wy} r={r} fill="rgba(41, 41, 41, 0.28)" />
            <circle cx={wx - r * 0.3} cy={wy - r * 0.35} r={r * 0.45} fill="rgba(247, 248, 246, 0.55)" />
          </g>
        ))}
        {rig.gland && <path d={rig.gland} fill="rgba(41, 41, 41, 0.18)" />}
        <path d={`M -30 ${rig.top + 16} Q -14 ${rig.top + 5} 6 ${rig.top + 5}`} fill="none" stroke="rgba(247, 248, 246, 0.6)" strokeWidth={ink * 1.1} strokeLinecap="round" />
      </g>
      <path d={rig.body} fill="none" stroke={INK.black} strokeWidth={ink} strokeLinejoin="round" />
      {rig.gland && <path d={rig.gland} fill="none" stroke={INK.black} strokeWidth={ink} />}
      {rig.ridge && <path d={rig.ridge} fill="none" stroke={INK.black} strokeWidth={ink * 0.8} strokeLinecap="round" />}
      <Toes tip={hind[3]} before={hind[2]} skin={skin} ink={ink} length={8} width={2.6} disc={rig.discs} />
      <Limb points={hind} widths={rig.hind.widths} color={INK.black} extra={ink * 2} />
      <Limb points={hind} widths={rig.hind.widths} color={skin} extra={0} />
      {look.mark === "spots" &&
        [0.4, 0.72].map((k) => <circle key={k} cx={hind[0].x + (hind[1].x - hind[0].x) * k} cy={hind[0].y + (hind[1].y - hind[0].y) * k} r={rig.hind.widths[0] * 0.26} fill={mark} />)}
      <Toes tip={fore[3]} before={fore[2]} skin={skin} ink={ink} length={4.5} width={2} disc={rig.discs} />
      <Limb points={fore} widths={rig.fore.widths} color={INK.black} extra={ink * 2} />
      <Limb points={fore} widths={rig.fore.widths} color={skin} extra={0} />
      <circle cx={eye.x} cy={eye.y} r={eye.r} fill={IRIS_COLOR[look.skin]} stroke={INK.black} strokeWidth={ink} />
      <ellipse cx={eye.x + eye.r * 0.12} cy={eye.y + eye.r * 0.05} rx={rig.pupil.rx} ry={rig.pupil.ry} fill={INK.black} />
      <circle cx={eye.x + eye.r * 0.38} cy={eye.y - eye.r * 0.36} r={eye.r * 0.2} fill={INK.paper} />
      <path d={rig.mouth} fill="none" stroke={INK.black} strokeWidth={ink * 0.85} strokeLinecap="round" />
      {rig.tympanum && <circle cx={rig.tympanum.x} cy={rig.tympanum.y} r={rig.tympanum.r} fill="none" stroke={INK.black} strokeWidth={ink * 0.7} />}
      <circle cx={rig.nostril.x} cy={rig.nostril.y} r={1.1} fill={INK.black} />
    </g>
  );
}
