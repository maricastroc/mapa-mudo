export type Dir = "up" | "down" | "left" | "right";
export type Tile = { x: number; y: number };
export type Cell = "wall" | "path" | "tunnel" | "house" | "door" | "houseWall";

export const STEP: Record<Dir, Tile> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const ORDER: readonly Dir[] = ["up", "left", "down", "right"];

export const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export const MAP: readonly string[] = [
  "###############",
  "#......#......#",
  "#o##.#.#.#.##o#",
  "#.............#",
  "#.##.##.##.##.#",
  "#.............#",
  "####.==-==.####",
  "    .=HHH=.    ",
  "####.=====.####",
  "####...P...####",
  "#....#.#.#....#",
  "#o##.#.#.#.##o#",
  "#..#.......#..#",
  "##.#.#####.#.##",
  "##...........##",
  "###############",
];

export type Maze = {
  cols: number;
  rows: number;
  cells: Cell[];
  leaves: number[];
  doses: number[];
  start: Tile;
  door: Tile;
  outside: Tile;
  home: Tile;
};

function cellOf(ch: string): Cell {
  if (ch === "#") return "wall";
  if (ch === "=") return "houseWall";
  if (ch === "-") return "door";
  if (ch === "H") return "house";
  if (ch === " ") return "tunnel";
  return "path";
}

export function parseMaze(map: readonly string[] = MAP): Maze {
  const rows = map.length;
  const cols = map[0].length;
  const cells: Cell[] = [];
  const leaves: number[] = [];
  const doses: number[] = [];
  let start: Tile = { x: 0, y: 0 };
  let door: Tile = { x: 0, y: 0 };
  map.forEach((line, y) => {
    for (let x = 0; x < cols; x++) {
      const ch = line[x] ?? "#";
      const index = y * cols + x;
      cells.push(cellOf(ch));
      if (ch === ".") leaves.push(index);
      if (ch === "o") doses.push(index);
      if (ch === "P") start = { x, y };
      if (ch === "-") door = { x, y };
    }
  });
  return { cols, rows, cells, leaves, doses, start, door, outside: { x: door.x, y: door.y - 1 }, home: { x: door.x, y: door.y + 1 } };
}

export const MAZE = parseMaze();

export function index(maze: Maze, tile: Tile) {
  return tile.y * maze.cols + tile.x;
}

export function wrap(maze: Maze, tile: Tile): Tile {
  return { x: ((tile.x % maze.cols) + maze.cols) % maze.cols, y: tile.y };
}

export function cellAt(maze: Maze, tile: Tile): Cell {
  if (tile.y < 0 || tile.y >= maze.rows) return "wall";
  return maze.cells[index(maze, wrap(maze, tile))];
}

export function neighbor(maze: Maze, tile: Tile, dir: Dir): Tile {
  const s = STEP[dir];
  return wrap(maze, { x: tile.x + s.x, y: tile.y + s.y });
}

export function walkable(cell: Cell) {
  return cell === "path" || cell === "tunnel";
}

export function open(maze: Maze, tile: Tile, dir: Dir) {
  const s = STEP[dir];
  const next = { x: tile.x + s.x, y: tile.y + s.y };
  if (next.y < 0 || next.y >= maze.rows) return false;
  return walkable(cellAt(maze, next));
}

export function exits(maze: Maze, tile: Tile) {
  return ORDER.filter((d) => open(maze, tile, d));
}

export function inTunnel(maze: Maze, tile: Tile) {
  return cellAt(maze, tile) === "tunnel";
}

export function distances(maze: Maze, from: Tile) {
  const out = new Map<number, number>();
  const queue: Tile[] = [from];
  out.set(index(maze, from), 0);
  while (queue.length) {
    const tile = queue.shift()!;
    const d = out.get(index(maze, tile))!;
    for (const dir of exits(maze, tile)) {
      const next = neighbor(maze, tile, dir);
      const key = index(maze, next);
      if (out.has(key)) continue;
      out.set(key, d + 1);
      queue.push(next);
    }
  }
  return out;
}

export function tileOf(maze: Maze, key: number): Tile {
  return { x: key % maze.cols, y: Math.floor(key / maze.cols) };
}
