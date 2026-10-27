import { INK } from "../riso/inks.ts";
import { FEIRA_MARK } from "./feiraMark.ts";

const LOGOS = {
  iris: { src: "/logos/iris.png", w: 466, h: 97, nudge: -0.1 },
  ceara: { src: "/logos/ceara.png", w: 341, h: 110, nudge: 0.05 },
};

type PartnerLogosProps = { right: number; middle: number; height: number; gap: number };

export function partnerLogosWidth(height: number, gap: number) {
  const feira = height * (FEIRA_MARK.w / FEIRA_MARK.h);
  const iris = height * 0.64 * (LOGOS.iris.w / LOGOS.iris.h);
  const ceara = height * 0.76 * (LOGOS.ceara.w / LOGOS.ceara.h);
  return { feira, iris, ceara, total: feira + iris + ceara + gap * 2 };
}

export function PartnerLogos({ right, middle, height, gap }: PartnerLogosProps) {
  const widths = partnerLogosWidth(height, gap);
  const feiraX = right - widths.total;
  const irisX = feiraX + widths.feira + gap;
  const cearaX = irisX + widths.iris + gap;
  const irisH = height * 0.64;
  const cearaH = height * 0.76;
  const scale = height / FEIRA_MARK.h;
  return (
    <g aria-hidden="true">
      <g transform={`translate(${feiraX} ${middle - height / 2}) scale(${scale})`} fill={INK.black}>
        {FEIRA_MARK.paths.map((p, i) => (
          <path key={i} d={p.d} fillRule={p.evenodd ? "evenodd" : undefined} />
        ))}
      </g>
      <image href={LOGOS.iris.src} x={irisX} y={middle - irisH / 2 + irisH * LOGOS.iris.nudge} width={widths.iris} height={irisH} preserveAspectRatio="none" />
      <image href={LOGOS.ceara.src} x={cearaX} y={middle - cearaH / 2 + cearaH * LOGOS.ceara.nudge} width={widths.ceara} height={cearaH} preserveAspectRatio="none" />
    </g>
  );
}
