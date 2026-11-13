import type { Contract, MissionResult, PayoutResult, SaveGame, ShipStats } from '@/types';
import {
  RING_SCORES,
  REPLAY_REWARD_FRACTION,
  getDifficultySettings,
} from '@/config/constants';
import { clamp, round } from '@/core/units';
import { computeStreakMultiplier } from './streaks';

/**
 * Evaluate earned bonus objective rewards for a completed mission.
 */
function computeBonusRewardM(contract: Contract, result: MissionResult): number {
  const { flight, scavenge } = result;
  if (flight.outcome === 'crash' || flight.outcome === 'abort') {
    return 0;
  }

  let bonusM = 0;
  for (const bonus of contract.bonusObjectives ?? []) {
    if (bonus.id === 'bullseye' && flight.landingRing === 5) {
      bonusM += bonus.extraRewardM;
    } else if (bonus.id !== 'bullseye' && scavenge && scavenge.itemsFound.length >= 2) {
      bonusM += bonus.extraRewardM;
    }
  }
  return bonusM;
}

/**
 * Compute the full payout for a completed mission.
 * Net result = Reward × (landingMultiplier × scienceMultiplier × streakMultiplier)
 *              − buildCost − launchCost − repairCost
 * See concept file section 6 (Economy).
 * Anti-farming rule: replaying pays 30% unless it beats previous best net profit.
 */
export function computePayout(
  contract: Contract,
  result: MissionResult,
  stats: ShipStats,
  save: SaveGame,
  repairCostM: number
): PayoutResult {
  const { flight, scavenge } = result;

  // Apply difficulty budget modifier (easy = 1.5×, normal = 1.0×, hard = 0.8×)
  const diffSettings = getDifficultySettings(save.difficulty);
  const effectiveBudgetCapM = diffSettings.unlimitedFunds
    ? Infinity
    : contract.budgetCapM * diffSettings.budgetModifier;
  // TODO(owner-3): use effectiveBudgetCapM in validation checks when owner-2 adds real budget enforcement
  void effectiveBudgetCapM;

  // Landing multiplier: differentiated by outcome (crash/abort = 0, rough = 0.35..0.75, soft = 0.60..1.10)
  const ringScore = RING_SCORES[flight.landingRing] ?? 0;
  const landingMult =
    flight.outcome === 'crash' || flight.outcome === 'abort'
      ? 0
      : flight.outcome === 'rough'
        ? 0.35 + ringScore / 250
        : 0.6 + ringScore / 200;

  // Science multiplier: based on data transmitted vs generated
  const scienceMult =
    scavenge && scavenge.dataGeneratedMB > 0
      ? clamp(scavenge.dataSentMB / scavenge.dataGeneratedMB, 0, 1)
      : 0;

  // Streak multiplier (from save state)
  const streakMultiplier = computeStreakMultiplier(save.streaks);

  // Base contract reward + any achieved bonus objectives
  const bonusRewardM = computeBonusRewardM(contract, result);
  const fullRewardM = contract.rewardM + bonusRewardM;
  const prev = save.completedContracts[contract.id];

  // Launch cost: 8% of build cost + $1.2M per metric ton of launch mass
  const launchCostM = round(stats.costM * 0.08 + (stats.totalMassKg / 1000) * 1.2, 2);
  const buildCostM = round(stats.costM, 2);
  const safeRepairCostM = round(repairCostM, 2);

  // Tentative unpenalized gross & net reward
  let grossRewardM = round(fullRewardM * landingMult * scienceMult * streakMultiplier, 2);
  let netM = round(grossRewardM - buildCostM - launchCostM - safeRepairCostM, 2);

  // Anti-farming check: if completed before and tentative net profit did not beat previous best
  const isRecord = !prev || netM > prev.bestNetM;
  if (prev && !isRecord) {
    const penalizedRewardM = fullRewardM * REPLAY_REWARD_FRACTION;
    grossRewardM = round(penalizedRewardM * landingMult * scienceMult * streakMultiplier, 2);
    netM = round(grossRewardM - buildCostM - launchCostM - safeRepairCostM, 2);
  }

  // Score breakdown (0–100 scale)
  const landing = ringScore;
  const science = Math.round(scienceMult * 100);
  const efficiency = Math.round(clamp((netM / Math.max(1, contract.rewardM)) * 100, 0, 100));
  const decisions =
    stats.warnings.length === 0 ? 100 : Math.max(0, 100 - stats.warnings.length * 15);
  const teamBonus = 0;
  const total = Math.round((landing + science + efficiency + decisions + teamBonus) / 4);

  return {
    grossRewardM,
    buildCostM,
    launchCostM,
    repairCostM: safeRepairCostM,
    streakMultiplier,
    netM,
    isRecord,
    score: { landing, science, efficiency, decisions, teamBonus, total },
  };
}
