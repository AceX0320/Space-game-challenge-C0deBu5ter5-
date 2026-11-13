import type { Difficulty, SaveGame, StreakTrack } from '@/types';
import { STARTING_FUNDS_M } from '@/config/constants';

const SAVE_KEY = 'launchsmith-save';
const SAVE_VERSION = 1;

const EMPTY_STREAKS: Record<StreakTrack, number> = {
  cleanAscent: 0,
  smoothHands: 0,
  pinpoint: 0,
  softTouch: 0,
  frugal: 0,
};

/**
 * Create a fresh save game for the given difficulty.
 * See concept file section 6 (Economy — starting values).
 */
export function newSave(difficulty: Difficulty): SaveGame {
  return {
    version: SAVE_VERSION,
    fundsM: STARTING_FUNDS_M[difficulty] ?? 60,
    difficulty,
    unlockedContractIds: ['first-light'],
    completedContracts: {},
    streaks: { ...EMPTY_STREAKS },
    safetyNets: 0,
    inventory: [],
    researched: [],
    ownedParts: [],
    currentDesign: null,
  };
}

/**
 * Load save from localStorage. Returns a new Normal save if none exists or data is corrupt.
 */
export function loadSave(): SaveGame {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SAVE_KEY) : null;
    if (!raw) return newSave('normal');
    const parsed = JSON.parse(raw) as SaveGame;
    if (parsed.version !== SAVE_VERSION) return newSave('normal');
    return parsed;
  } catch {
    return newSave('normal');
  }
}

/**
 * Persist the save game to localStorage.
 */
export function writeSave(save: SaveGame): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }
}

