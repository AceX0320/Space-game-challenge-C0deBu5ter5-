import type { Contract, MissionResult, PayoutResult, SaveGame, ShipStats } from '@/types';
import { MAX_STREAK_MULTIPLIER, RING_SCORES, REPLAY_REWARD_FRACTION } from '@/config/constants';

/**
 * Compute the full payout for a completed mission.
 * Net result = Reward × (landingMultiplier × scienceMultiplier × streakMultiplier)
 *              − buildCost − launchCost − repairCost
 * See concept file section 6 (Economy).
 * Anti-farming rule: replaying pays 30% unless it beats previous best net profit.
 * TODO(owner-3): add launch cost formula based on ship mass and body distance.
 */
export function computePayout(
  contract: Contract,
  result: MissionResult,
  stats: ShipStats,
  save: SaveGame,
  repairCostM: number
): PayoutResult {
  const { flight, scavenge } = result;

  // Landing multiplier: based on ring score (0–100 -> 0.0–1.0)
  const ringScore = RING_SCORES[flight.landingRing] ?? 0;
  const landingMult = flight.outcome === 'crash'
    ? 0
    : flight.outcome === 'rough'
      ? 0.5 + ringScore / 200
      : 0.5 + ringScore / 200;

  // Science multiplier: based on data transmitted vs generated
  const scienceMult = scavenge
    ? Math.min(1, scavenge.dataSentMB / Math.max(1, scavenge.dataGeneratedMB))
    : 0;

  // Streak multiplier (from save state)
  const streakCount = Object.values(save.streaks).reduce((a, b) => a + b, 0);
  const streakMultiplier = Math.min(MAX_STREAK_MULTIPLIER, 1 + streakCount * 0.05);

  let effectiveRewardM = contract.rewardM;
  const prev = save.completedContracts[contract.id];

  // Base gross reward
  let grossRewardM = effectiveRewardM * landingMult * scienceMult * streakMultiplier;

  // Launch cost: 10% of build cost (stub)
  const launchCostM = stats.costM * 0.1;

  let netM = grossRewardM - stats.costM - launchCostM - repairCostM;

  // Anti-farming check: if completed before and net profit did not beat previous best
  const isRecord = !prev || netM > prev.bestNetM;
  if (prev && !isRecord) {
    effectiveRewardM = contract.rewardM * REPLAY_REWARD_FRACTION;
    grossRewardM = effectiveRewardM * landingMult * scienceMult * streakMultiplier;
    netM = grossRewardM - stats.costM - launchCostM - repairCostM;
  }

  // Score breakdown (0–100 scale)
  const landing = ringScore;
  const science = Math.round(scienceMult * 100);
  const efficiency = Math.round(Math.min(100, Math.max(0, (netM / contract.rewardM) * 100)));
  const decisions = stats.warnings.length === 0 ? 100 : Math.max(0, 100 - stats.warnings.length * 15);
  const teamBonus = 0; // TODO(owner-3): add team bonus when teamMode is on
  const total = Math.round((landing + science + efficiency + decisions + teamBonus) / 4);

  return {
    grossRewardM,
    buildCostM: stats.costM,
    launchCostM,
    repairCostM,
    streakMultiplier,
    netM,
    isRecord,
    score: { landing, science, efficiency, decisions, teamBonus, total },
  };
}
