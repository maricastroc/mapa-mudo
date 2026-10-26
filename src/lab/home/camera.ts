export type View = { left: number; viewW: number; trackW: number };

export function maxLeft(view: Pick<View, "viewW" | "trackW">) {
  return Math.max(0, view.trackW - view.viewW);
}

export function clampLeft(left: number, view: Pick<View, "viewW" | "trackW">) {
  return Math.max(0, Math.min(maxLeft(view), left));
}

export function panDuration(distance: number) {
  return Math.max(0.28, Math.min(0.7, 0.26 + Math.abs(distance) / 2600));
}

export function easeOutCubic(t: number) {
  const k = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - k, 3);
}

export function easeInOutCubic(t: number) {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

export function keyStep(viewW: number, room: number) {
  return Math.max(120, Math.min(viewW * 0.6, room));
}

export function momentumTarget(left: number, velocity: number, view: Pick<View, "viewW" | "trackW">) {
  const glide = Math.max(-1, Math.min(1, velocity)) * 240;
  return clampLeft(left - glide, view);
}

export function lens(view: View) {
  const w = Math.min(1, view.viewW / view.trackW);
  const x = view.trackW <= view.viewW ? 0 : (view.left / view.trackW);
  return { x, w };
}

export function leftForLensCenter(center: number, view: Pick<View, "viewW" | "trackW">) {
  return clampLeft(center * view.trackW - view.viewW / 2, view);
}

export function centerWorld(view: View, scale: number) {
  return (view.left + view.viewW / 2) / scale;
}
