import type { Contract, MissionResult, SaveGame, ShipStats, StreakTrack } from '@/types';
import { DEFAULT_FLAGS } from '@/config/feature-flags';
import { MAX_STREAK_MULTIPLIER } from '@/config/constants';

function computeMultiplier(streaks: SaveGame['streaks']): number {
  const total = Object.values(streaks).reduce((a, b) => a + b, 0);
  return Math.min(MAX_STREAK_MULTIPLIER, 1 + total * 0.02);
}

/**
 * Update streak counters after a mission.
 * See concept file section 8 (Scoring and streaks).
 * TODO(owner-3): implement real streak conditions using FlightResult data.
 */
export function updateStreaks(
  streaks: SaveGame['streaks'],
  result: MissionResult,
  stats: ShipStats,
  contract: Contract,
  safetyNets: number
): { streaks: SaveGame['streaks']; safetyNets: number; multiplier: number } {
  if (!DEFAULT_FLAGS.streaks) {
    return { streaks, safetyNets, multiplier: 1 };
  }

  const { flight } = result;
  const failed = flight.outcome === 'crash' || flight.outcome === 'abort';

  if (failed) {
    if (safetyNets > 0) {
      // Safety net protects streaks once
      return { streaks, safetyNets: safetyNets - 1, multiplier: computeMultiplier(streaks) };
    }
    // Reset all streaks
    const reset = Object.fromEntries(
      (Object.keys(streaks) as StreakTrack[]).map((k) => [k, 0])
    ) as SaveGame['streaks'];
    return { streaks: reset, safetyNets, multiplier: 1 };
  }

  const updated = { ...streaks };

  // cleanAscent: ascent fuel use below threshold
  if (flight.ascentFuelUsedPct < 25) updated.cleanAscent++;
  else updated.cleanAscent = 0;

  // smoothHands: few corrections
  if (flight.corrections < 5) updated.smoothHands++;
  else updated.smoothHands = 0;

  // pinpoint: landed in top 2 rings
  if (flight.landingRing >= 4) updated.pinpoint++;
  else updated.pinpoint = 0;

  // softTouch: touchdown speed well below limit
  const vyRatio = Math.abs(flight.touchdownVyMs) / stats.touchdownLimits.maxVyMs;
  if (vyRatio < 0.5) updated.softTouch++;
  else updated.softTouch = 0;

  // frugal: build cost under 70% of budget cap
  if (stats.costM < contract.budgetCapM * 0.7) updated.frugal++;
  else updated.frugal = 0;

  return { streaks: updated, safetyNets, multiplier: computeMultiplier(updated) };
}
