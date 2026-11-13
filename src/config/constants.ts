import type { Difficulty } from '@/types';

export const G0_MS2 = 9.80665;

export interface DifficultySettings {
  budgetModifier: number; // multiplies the contract budget cap
  unlimitedFunds: boolean; // true only for sandbox
  wearRate: number; // multiplies per-mission wear
  malfunctionsOn: boolean;
  landingRingScale: number; // >1 = bigger bullseye rings
  helpLevel: 'hints' | 'tooltips' | 'minimal';
}

/**
 * DIFFICULTY ENGINE
 * Single source of truth for game balance and difficulty scaling.
 * Source: game.
 */
export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultySettings> = {
  easy: {
    // Economy: Gives the player 50% more money than the contract states
    budgetModifier: 1.5,
    unlimitedFunds: false,
    // Maintenance: Parts never break down or lose maximum condition
    wearRate: 0.0,
    // Events: No random mid-flight events (engine-out, sensor drift)
    malfunctionsOn: false,
    // Physics: The bullseye target for landing is 50% wider, making it much easier to score
    landingRingScale: 1.5,
    // Education: UI shows active warnings (e.g., "TWR too low") before launch
    helpLevel: 'hints',
  },
  normal: {
    // Economy: Player must build exactly within the contract's budget cap
    budgetModifier: 1.0,
    unlimitedFunds: false,
    // Maintenance: Parts degrade at a standard rate after each flight
    wearRate: 1.0,
    // Events: No random mid-flight events, only failures caused by the player's design
    malfunctionsOn: false,
    // Physics: Standard bullseye target size
    landingRingScale: 1.0,
    // Education: UI shows passive tooltips when hovering over stats, but no active warnings
    helpLevel: 'tooltips',
  },
  hard: {
    // Economy: Player gets 20% LESS money than the contract states, forcing extreme efficiency
    budgetModifier: 0.8,
    unlimitedFunds: false,
    // Maintenance: Parts degrade 75% faster, forcing the player to spend money on repairs
    wearRate: 1.75,
    // Events: Random events (power brownouts, comms blackouts) can happen mid-flight
    // The player must build redundancy (backup batteries, spare engines) to survive
    malfunctionsOn: true,
    // Physics: The bullseye target shrinks by 40%, requiring extreme precision
    landingRingScale: 0.6,
    // Education: No UI assistance. The player is on their own.
    helpLevel: 'minimal',
  },
  sandbox: {
    // Sandbox: Unlimited funds, standard physics, helpful hints
    budgetModifier: 1.0,
    unlimitedFunds: true,
    wearRate: 0.0,
    malfunctionsOn: false,
    landingRingScale: 1.0,
    helpLevel: 'hints',
  },
};

export function getDifficultySettings(level: Difficulty = 'normal'): DifficultySettings {
  return DIFFICULTY_CONFIG[level] ?? DIFFICULTY_CONFIG.normal;
}

export const WEAR_MULTIPLIERS: Record<string, number> = {
  easy: 0,
  normal: 1,
  hard: 1.75,
  sandbox: 0,
};

export const RING_RADII: Record<string, number[]> = {
  easy: [0, 500, 1000, 2000, 4000],
  normal: [0, 300, 600, 1200, 2500],
  hard: [0, 100, 250, 500, 1000],
  sandbox: [0, 500, 1000, 2000, 4000],
};

export const RING_SCORES = [0, 20, 40, 60, 80, 100];
export const REPLAY_REWARD_FRACTION = 0.3;
export const SAFETY_NET_COST_M = 5;
export const MAX_STREAK_MULTIPLIER = 2.0;

export const STARTING_FUNDS_M: Record<string, number> = {
  easy: 100,
  normal: 60,
  hard: 40,
  sandbox: 999999,
};
