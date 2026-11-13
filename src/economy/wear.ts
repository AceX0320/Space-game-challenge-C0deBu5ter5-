import type { Difficulty, PartInstance } from '@/types';
import { getDifficultySettings } from '@/config/constants';
import { getParts } from '@/data/index';
import { clamp, round } from '@/core/units';

export type DamageState = 'scratched' | 'bent' | 'penetrated' | 'destroyed';

/**
 * Classify a part's physical damage state from its current condition.
 */
export function getDamageState(part: PartInstance): DamageState {
  if (part.condition >= 75) return 'scratched';
  if (part.condition >= 40) return 'bent';
  if (part.condition > 0) return 'penetrated';
  return 'destroyed';
}

/**
 * Apply wear to a list of parts after a mission.
 * usage: map of instanceId -> usage intensity (0–1). Missing keys default to 1.
 * See concept file section 7 (Wear and tear).
 */
export function applyWear(
  parts: PartInstance[],
  difficulty: Difficulty,
  usage: Record<string, number>
): PartInstance[] {
  const mult = getDifficultySettings(difficulty).wearRate;
  const partDefs = getParts();
  const defMap = new Map(partDefs.map((d) => [d.id, d]));

  return parts.map((part) => {
    const def = defMap.get(part.partId);
    const baseWear = def?.baseWearPerMission ?? 5;
    const usageIntensity = usage[part.instanceId] ?? 1;

    const isEngine = def?.category === 'engine' || part.partId.includes('engine');
    const count = part.paramValues['count'];
    const countScale = isEngine && count !== undefined && count > 1 ? 1 + (count - 1) * 0.25 : 1;

    const wearAmount = round(baseWear * mult * usageIntensity * countScale, 2);
    const newCondition = round(clamp(part.condition - wearAmount, 0, part.maxCondition), 2);
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
 * Repair a part: restore condition to the new ceiling, but permanently lower maxCondition.
 * Destroyed parts (condition <= 0) cannot be repaired and must be replaced.
 * See concept file section 5 (Repair vs replace).
 */
export function repairPart(part: PartInstance): { part: PartInstance; costM: number } {
  if (part.condition <= 0) {
    return { part: { ...part }, costM: 0 };
  }

  const def = getParts().find((d) => d.id === part.partId);
  const baseCostM = def?.baseCostM ?? 4;

  const ceilingLoss = clamp(Math.round((part.maxCondition - part.condition) * 0.2), 5, 30);
  const newMaxCondition = clamp(part.maxCondition - ceilingLoss, 10, 100);
  const restoredCondition = newMaxCondition;
  const pointsRestored = Math.max(0, restoredCondition - part.condition);
  const costM = Math.max(0.2, round(baseCostM * (pointsRestored / 100) * 0.5, 2));

  return {
    part: { ...part, condition: restoredCondition, maxCondition: newMaxCondition },
    costM,
  };
}

/**
 * Replace a worn or destroyed part with a brand-new factory unit (100% condition and ceiling).
 */
export function replacePart(part: PartInstance): { part: PartInstance; costM: number } {
  const def = getParts().find((d) => d.id === part.partId);
  const baseCostM = def?.baseCostM ?? 4;
  const count = part.paramValues['count'] ?? 1;
  const costM = round(baseCostM * count, 2);

  return {
    part: { ...part, condition: 100, maxCondition: 100 },
    costM,
  };
}
