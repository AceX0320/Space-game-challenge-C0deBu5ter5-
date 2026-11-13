import type { Difficulty, ShipStats } from '@/types';
import { RING_RADII, RING_SCORES } from '@/config/constants';

/**
 * Returns the ring score (1–5, where 5 = bullseye) for a given landing distance.
 * Returns 0 if outside all rings.
 * See concept file section 7 (bullseye scoring).
 */
export function ringForDistance(distanceM: number, difficulty: Difficulty): number {
  const radii = RING_RADII[difficulty];
  if (!radii) return 0;
  for (let ring = 1; ring <= radii.length; ring++) {
    if (distanceM <= (radii[ring - 1] ?? Infinity)) return 6 - ring;
  }
  return 0;
}

/**
 * Ring score value (0–100) for a ring index.
 */
export function scoreForRing(ring: number): number {
  return RING_SCORES[ring] ?? 0;
}

/**
 * Classify a touchdown as 'soft', 'rough', or 'crash' based on speed/tilt limits.
 * See concept file section 7 (landing limits).
 */
export function classifyTouchdown(
  vy: number,
  vx: number,
  tiltDeg: number,
  limits: ShipStats['touchdownLimits']
): 'soft' | 'rough' | 'crash' {
  const vyExcess = Math.abs(vy) / limits.maxVyMs;
  const vxExcess = Math.abs(vx) / limits.maxVxMs;
  const tiltExcess = Math.abs(tiltDeg) / limits.maxTiltDeg;
  const worst = Math.max(vyExcess, vxExcess, tiltExcess);
  if (worst <= 1.0) return 'soft';
  if (worst <= 1.5) return 'rough';
  return 'crash';
}
