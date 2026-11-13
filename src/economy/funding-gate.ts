import type { Contract, SaveGame } from '@/types';

/**
 * Check if the player has enough total funds to unlock the next contract.
 * See concept file section 6 (Economy — Funding gate).
 */
export function nextContractUnlocked(save: SaveGame, contract: Contract): boolean {
  return save.fundsM >= contract.fundingGateM;
}

