import type { Contract, SaveGame } from '@/types';
import { clamp, round } from '@/core/units';

export interface FundingGateStatus {
  unlocked: boolean;
  currentFundsM: number;
  targetFundsM: number;
  shortfallM: number;
  progressPct: number;
}

/**
 * Check if the player has enough total funds to unlock the next contract.
 * See concept file section 6 (Economy — Funding gate).
 */
export function nextContractUnlocked(save: SaveGame, contract: Contract): boolean {
  return save.fundsM >= contract.fundingGateM;
}

/**
 * Return detailed funding gate progress metrics for UI progress bars and contract cards.
 */
export function getFundingGateStatus(save: SaveGame, contract: Contract): FundingGateStatus {
  const currentFundsM = round(save.fundsM, 2);
  const targetFundsM = round(contract.fundingGateM, 2);
  const unlocked = nextContractUnlocked(save, contract);
  const shortfallM = unlocked ? 0 : round(Math.max(0, targetFundsM - currentFundsM), 2);
  const progressPct =
    targetFundsM <= 0 ? 100 : round(clamp((currentFundsM / targetFundsM) * 100, 0, 100), 1);

  return {
    unlocked,
    currentFundsM,
    targetFundsM,
    shortfallM,
    progressPct,
  };
}
