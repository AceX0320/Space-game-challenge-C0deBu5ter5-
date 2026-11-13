import type { Difficulty, ShipStats } from '@/types';
import { getDifficultySettings, RING_RADII, RING_SCORES } from '@/config/constants';

/**
 * Returns the ring score (1–5, where 5 = bullseye) for a given landing distance.
 * Returns 0 if outside all rings.
 * Ring radii are scaled by the difficulty's landingRingScale.
 * See concept file section 7 (bullseye scoring).
 */
export function ringForDistance(distanceM: number, difficulty: Difficulty): number {
    const baseRadii = RING_RADII[difficulty];
    if (!baseRadii) return 0;
    const scale = getDifficultySettings(difficulty).landingRingScale;
    for (let ring = 1; ring <= baseRadii.length; ring++) {
      const scaledRadius = (baseRadii[ring - 1] ?? Infinity) * scale;
      if (distanceM <= scaledRadius) return 6 - ring;
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
