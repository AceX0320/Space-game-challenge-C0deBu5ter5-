export const G0_MS2 = 9.80665;
export const WEAR_MULTIPLIERS: Record<string, number> = { easy: 0, normal: 1, hard: 1.75, sandbox: 0 };
export const RING_RADII: Record<string, number[]> = {
  easy:   [0, 500, 1000, 2000, 4000],
  normal: [0, 300,  600, 1200, 2500],
  hard:   [0, 100,  250,  500, 1000],
  sandbox:[0, 500, 1000, 2000, 4000],
};
export const RING_SCORES = [0, 20, 40, 60, 80, 100];
export const REPLAY_REWARD_FRACTION = 0.3;
export const SAFETY_NET_COST_M = 5;
export const MAX_STREAK_MULTIPLIER = 2.0;
export const STARTING_FUNDS_M: Record<string, number> = { easy: 100, normal: 60, hard: 40, sandbox: 999999 };
