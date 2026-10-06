export type Polyline = { pts: number[]; closed: boolean };

export function cellExtremes(v: Float64Array, cols: number, rows: number, min: Float32Array, max: Float32Array) {
  let c = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = v[j * cols + i];
      const b = v[j * cols + i + 1];
      const d = v[(j + 1) * cols + i];
      const e = v[(j + 1) * cols + i + 1];
      min[c] = Math.min(a, b, d, e);
      max[c] = Math.max(a, b, d, e);
      c++;
    }
  }
}

export function traceContours(
  v: Float64Array,
  cols: number,
  rows: number,
  level: number,
  min: Float32Array,
  max: Float32Array,
): Polyline[] {
  const total = cols * rows;
  const neighbors = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const va = neighbors.get(a);
    if (va) va.push(b);
    else neighbors.set(a, [b]);
    const vb = neighbors.get(b);
    if (vb) vb.push(a);
    else neighbors.set(b, [a]);
  };

  let c = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++, c++) {
      if (level < min[c] || level >= max[c]) continue;
      const tl = v[j * cols + i];
      const tr = v[j * cols + i + 1];
      const br = v[(j + 1) * cols + i + 1];
      const bl = v[(j + 1) * cols + i];
      const caseIndex = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (caseIndex === 0 || caseIndex === 15) continue;
      const T = j * cols + i;
      const B = (j + 1) * cols + i;
      const L = total + j * cols + i;
      const R = total + j * cols + i + 1;
      switch (caseIndex) {
        case 1:
        case 14:
          link(L, B);
          break;
        case 2:
        case 13:
          link(B, R);
          break;
        case 3:
        case 12:
          link(L, R);
          break;
        case 4:
        case 11:
          link(T, R);
          break;
        case 6:
        case 9:
          link(T, B);
          break;
        case 7:
        case 8:
          link(L, T);
          break;
        case 5:
          if ((tl + tr + br + bl) / 4 > level) {
            link(L, T);
            link(R, B);
          } else {
            link(T, R);
            link(L, B);
          }
          break;
        case 10:
          if ((tl + tr + br + bl) / 4 > level) {
            link(T, R);
            link(L, B);
          } else {
            link(L, T);
            link(R, B);
          }
          break;
      }
    }
  }

  const edgePoint = (id: number, out: number[]) => {
    if (id < total) {
      const j = Math.floor(id / cols);
      const i = id - j * cols;
      const a = v[id];
      const b = v[id + 1];
      out.push(i + (level - a) / (b - a), j);
    } else {
      const k = id - total;
      const j = Math.floor(k / cols);
      const i = k - j * cols;
      const a = v[k];
      const b = v[k + cols];
      out.push(i, j + (level - a) / (b - a));
    }
  };

  const visited = new Set<number>();
  const lines: Polyline[] = [];
  const follow = (start: number) => {
    const pts: number[] = [];
    let previous = -1;
    let current = start;
    for (;;) {
      visited.add(current);
      edgePoint(current, pts);
      const vs = neighbors.get(current) as number[];
      let next = -1;
      for (const w of vs) {
        if (w !== previous && !visited.has(w)) {
          next = w;
          break;
        }
      }
      if (next < 0) {
        const closed = current !== start && vs.includes(start) && pts.length > 6;
        lines.push({ pts, closed });
        return;
      }
      previous = current;
      current = next;
    }
  };

  for (const [id, vs] of neighbors) if (vs.length === 1 && !visited.has(id)) follow(id);
  for (const id of neighbors.keys()) if (!visited.has(id)) follow(id);
  return lines;
}

export function contains(pts: number[], x: number, y: number) {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[2 * i];
    const yi = pts[2 * i + 1];
    const xj = pts[2 * j];
    const yj = pts[2 * j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bounds(pts: number[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < x0) x0 = pts[i];
    if (pts[i] > x1) x1 = pts[i];
    if (pts[i + 1] < y0) y0 = pts[i + 1];
    if (pts[i + 1] > y1) y1 = pts[i + 1];
  }
  return { x0, y0, x1, y1 };
}
