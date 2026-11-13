/**
 * Deterministic seeded PRNG (Mulberry32).
 *
 * Same seed → same sequence, always. The one non-deterministic call in the
 * whole engine is `randomSeed()`, used once at construction to pick a fresh
 * seed per session. Everything downstream must consume this `Rng`, never
 * `Math.random()` directly.
 *
 * Typical use:
 *   const rng = new Rng(randomSeed());   // engine construction
 *   const eventsRng = rng.fork();        // isolated stream for the events subsystem
 *   const vfxRng    = rng.fork();        // isolated stream for visual effects
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) {
      throw new Error(`Rng: seed must be a finite number (got ${seed})`);
    }
    this.s = (seed | 0) >>> 0;
  }

  /** Current 32-bit state. Save this to reproduce the stream later. */
  get seed(): number {
    return this.s;
  }

  /** Uniform in [0, 1). Core step — do not call this if you can use a helper. */
  next(): number {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [min, max). Throws on reversed or non-finite bounds. */
  range(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      throw new Error(`Rng.range: need finite min < max (got ${min}, ${max})`);
    }
    return min + (max - min) * this.next();
  }

  /** Integer in [min, maxExclusive). Throws on non-integer or reversed bounds. */
  int(min: number, maxExclusive: number): number {
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(maxExclusive) ||
      maxExclusive <= min
    ) {
      throw new Error(
        `Rng.int: need integer min < maxExclusive (got ${min}, ${maxExclusive})`
      );
    }
    return Math.floor(this.range(min, maxExclusive));
  }

  /** Uniform pick from a non-empty array. Throws if empty. */
  pick<T>(arr: readonly T[]): T {
    if (!arr || arr.length === 0) {
      throw new Error('Rng.pick: array is empty');
    }
    return arr[this.int(0, arr.length)];
  }

  /** True with probability p. p is clamped to [0, 1]. */
  chance(p: number): boolean {
    if (!Number.isFinite(p)) {
      throw new Error(`Rng.chance: p must be finite (got ${p})`);
    }
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  /** Box-Muller normal. Returns mean + std * N(0,1). */
  normal(mean = 0, std = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + std * z;
  }

  /** Uniform angle in [0, 2π). */
  angle(): number {
    return this.next() * Math.PI * 2;
  }

  /** -1 or +1, 50/50. */
  sign(): 1 | -1 {
    return this.next() < 0.5 ? -1 : 1;
  }

  /**
   * Derive an independent child stream. Deterministic given this stream's
   * state, but diverges from it. Use one per subsystem so that consuming
   * randomness in one place cannot shift outcomes in another.
   */
  fork(): Rng {
    return new Rng(this.next() * 0xFFFFFFFF);
  }
}

/**
 * One-shot non-deterministic seed. Call once at engine construction, pass
 * the result to `new Rng(...)`. Never call during a run — that would break
 * the "same seed, same run" guarantee.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
}