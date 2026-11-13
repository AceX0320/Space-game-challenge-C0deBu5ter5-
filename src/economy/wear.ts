import type { Difficulty, PartInstance } from '@/types';
import { WEAR_MULTIPLIERS } from '@/config/constants';
import { clamp } from '@/core/units';

/**
 * Apply wear to a list of parts after a mission.
 * usage: map of instanceId -> usage intensity (0–1). Missing keys default to 1.
 * See concept file section 7 (Wear and tear).
 * TODO(owner-3): integrate real usage data from FlightResult events.
 */
export function applyWear(
  parts: PartInstance[],
  difficulty: Difficulty,
  usage: Record<string, number>
): PartInstance[] {
  const mult = WEAR_MULTIPLIERS[difficulty] ?? 1;
  return parts.map((part) => {
    const usageIntensity = usage[part.instanceId] ?? 1;
    const wearAmount = 5 * mult * usageIntensity; // base 5% per mission at Normal
    const newCondition = clamp(part.condition - wearAmount, 0, part.maxCondition);
    return { ...part, condition: newCondition };
  });
}

/**
 * Compute the probability of failure for a part (0–1).
 * Rises sharply as condition approaches 0.
 * See concept file section 7 (Wear and tear — failure risk).
 */
export function failureChance(part: PartInstance): number {
  if (part.condition >= 70) return 0;
  if (part.condition >= 40) return 0.05 * ((70 - part.condition) / 30);
  return 0.3 * ((40 - part.condition) / 40) + 0.05;
}

/**
 * Repair a part: restore condition, but permanently lower maxCondition.
 * See concept file section 5 (Repair vs replace).
 * TODO(owner-3): cost formula should be based on part base cost and damage depth.
 */
export function repairPart(part: PartInstance): { part: PartInstance; costM: number } {
  const newMaxCondition = clamp(part.maxCondition - 5, 10, 100);
  const restoredCondition = clamp(part.condition + 50, 0, newMaxCondition);
  const costM = 1 + (part.maxCondition - newMaxCondition) * 0.1;
  return {
    part: { ...part, condition: restoredCondition, maxCondition: newMaxCondition },
    costM,
  };
}
