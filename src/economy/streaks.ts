import type { Contract, MissionResult, SaveGame, ShipStats, StreakTrack } from '@/types';
import { MAX_STREAK_MULTIPLIER, SAFETY_NET_COST_M } from '@/config/constants';
import { clamp, round } from '@/core/units';

/**
 * Compute combined streak multiplier (+0.05x per streak point, capped at MAX_STREAK_MULTIPLIER = 2.0x).
 */
export function computeStreakMultiplier(streaks: SaveGame['streaks']): number {
  const total = Object.values(streaks).reduce((a, b) => a + b, 0);
  return round(clamp(1 + total * 0.05, 1, MAX_STREAK_MULTIPLIER), 2);
}

/**
 * Update streak counters after a mission.
 * All streaks are lost if the mission fails (crash, abort, or out of fuel), unless protected by a safety net.
 * See concept file section 8 (Scoring and streaks).
 */
export function updateStreaks(
  streaks: SaveGame['streaks'],
  result: MissionResult,
  stats: ShipStats,
  contract: Contract,
  safetyNets: number
): { streaks: SaveGame['streaks']; safetyNets: number; multiplier: number } {
  const { flight } = result;
  const failed = flight.outcome === 'crash' || flight.outcome === 'abort' || flight.fuelLeftKg <= 0;

  if (failed) {
    if (safetyNets > 0) {
      // Safety net protects streaks once
      return {
        streaks: { ...streaks },
        safetyNets: safetyNets - 1,
        multiplier: computeStreakMultiplier(streaks),
      };
    }
    // Reset all streaks
    const reset = Object.fromEntries(
      (Object.keys(streaks) as StreakTrack[]).map((k) => [k, 0])
    ) as SaveGame['streaks'];
    return { streaks: reset, safetyNets, multiplier: 1 };
  }

  const updated = { ...streaks };

  // cleanAscent: ascent fuel use below threshold (< 25%)
  if (flight.ascentFuelUsedPct < 25) updated.cleanAscent++;
  else updated.cleanAscent = 0;

  // smoothHands: few attitude/course corrections (< 5)
  if (flight.corrections < 5) updated.smoothHands++;
  else updated.smoothHands = 0;

  // pinpoint: landed in top 2 rings (ring 4 or 5)
  if (flight.landingRing >= 4) updated.pinpoint++;
  else updated.pinpoint = 0;

  // softTouch: touchdown speed well below limit (< 50% of maxVyMs)
  const maxVy = Math.max(0.1, stats.touchdownLimits.maxVyMs);
  const vyRatio = Math.abs(flight.touchdownVyMs) / maxVy;
  if (vyRatio < 0.5) updated.softTouch++;
  else updated.softTouch = 0;

  // frugal: build cost under 70% of budget cap
  if (stats.costM < contract.budgetCapM * 0.7) updated.frugal++;
  else updated.frugal = 0;

  return { streaks: updated, safetyNets, multiplier: computeStreakMultiplier(updated) };
}

/**
 * Purchase a streak safety net using agency funds if affordable.
 */
export function buySafetyNet(save: SaveGame): SaveGame {
  if (save.fundsM < SAFETY_NET_COST_M) {
    return save;
  }
  return {
    ...save,
    fundsM: round(save.fundsM - SAFETY_NET_COST_M, 2),
    safetyNets: save.safetyNets + 1,
  };
}
