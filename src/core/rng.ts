export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return function rng(): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randPick<T>(rng: () => number, arr: T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}
