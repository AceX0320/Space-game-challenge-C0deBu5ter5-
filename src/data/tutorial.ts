/**
 * Tutorial and help content for Launchsmith.
 * Ported from Tutorial1.js (team contribution — merged into TypeScript framework).
 *
 * Owners of downstream screens: add `data-tutorial="<id>"` attributes to interactive
 * elements that match the IDs listed in ONBOARDING_SCRIPT.targetUI.
 * Defined IDs: `contract-brief`, `parts-menu`, `throttle-slider`, `skip-transit-btn`.
 * TODO(owner-5): add data-tutorial="<id>" attributes to hangar.ts, flight.ts, and preflight.ts.
 */

import type { Body, Contract, Difficulty, GamePhase, PartDef, ShipDesign, ShipStats } from '@/types';
import { getDifficultySettings } from '@/config/constants';

// ===========================================================================
// 1. STAT TOOLTIPS
// ===========================================================================

export interface StatTooltip {
  label: string;
  explanation: string;
  nasaFact?: string;
  /** Where the number comes from. */
  source: 'nasa' | 'game';
}

/**
 * Tooltips shown next to each stat in the ship builder HUD.
 * nasaFact entries are marked as source:'nasa' and must carry a VERIFY comment.
 */
export const STAT_TOOLTIPS: Record<string, StatTooltip> = {
  mass: {
    label: 'Total Mass',
    explanation:
      'Every component adds mass. More mass requires more thrust to lift, which means more fuel, which adds even more mass.',
    // VERIFY: "Tyranny of the Rocket Equation" is Konstantin Tsiolkovsky's insight (1903)
    nasaFact: "This compounding weight problem is known as the 'Tyranny of the Rocket Equation'.",
    source: 'nasa',
  },
  twr: {
    label: 'Thrust-to-Weight Ratio (TWR)',
    explanation:
      'Must be greater than 1.0 to lift off. At exactly 1.0 your engines only cancel gravity — you hover but do not climb.',
    // VERIFY: Saturn V liftoff TWR ~1.16 (Apollo 11, 11 July 1969, as-built mass sheets)
    nasaFact: 'The Apollo Saturn V rocket had a liftoff TWR of approximately 1.16, meaning it left the pad very slowly.',
    source: 'nasa',
  },
  powerBalance: {
    label: 'Power Balance',
    explanation:
      'Instruments, antennas, and flight computers constantly draw power. If generation drops below draw, your batteries will drain.',
    source: 'game',
  },
  deltaV: {
    label: 'Delta-v (Δv)',
    explanation:
      "The total velocity change your ship can perform — think of it as your absolute range.",
    // VERIFY: LEO Δv ~9,400 m/s (varies 9,100–9,800 m/s depending on trajectory and losses)
    nasaFact: 'Getting into low Earth orbit requires roughly 9,400 m/s of Δv.',
    source: 'nasa',
  },
};

// ===========================================================================
// 2. ACTIVE HINTS (Pre-flight Warnings)
// ===========================================================================

/** Runtime context passed to each hint's `when` predicate. */
export interface HintContext {
  stats: ShipStats;
  body: Body;
  contract: Contract;
  design: ShipDesign;
  catalog: PartDef[];
}

export interface ActiveHint {
  id: string;
  /** Pure predicate — no side effects. Receives the full HintContext. */
  when: (ctx: HintContext) => boolean;
  message: string;
}

export const ACTIVE_HINTS: ActiveHint[] = [
  {
    id: 'lowTWR',
    when: (ctx) => ctx.stats.twr < 1.05,
    message:
      'Warning: Your engines are too weak for your ship mass. You will not be able to slow down during landing. Add thrusters or strip weight.',
  },
  {
    id: 'highDataLowComms',
    when: (ctx) => ctx.stats.dataGenKbps > ctx.stats.downlinkKbps,
    message:
      'Warning: You are generating more science data than you can transmit. Upgrade your antenna or you will lose data.',
  },
  {
    id: 'noShadowPower',
    // body.solarFlux < 0.1 W/m² covers deep outer solar system (past Jupiter ~50×)
    when: (ctx) => ctx.body.solarFlux < 0.1,
    message:
      'Warning: Solar panels are highly ineffective here due to low solar irradiance. Consider an RTG (Nuclear Battery).',
  },
];

/**
 * Return hint messages that apply given the current context and difficulty.
 * Hints are only shown when the difficulty helpLevel is 'hints'.
 */
export function getActiveHints(ctx: HintContext, difficulty: Difficulty): string[] {
  if (getDifficultySettings(difficulty).helpLevel !== 'hints') return [];
  return ACTIVE_HINTS.filter((h) => h.when(ctx)).map((h) => h.message);
}

// ===========================================================================
// 3. LOCKOUT REASONS
// ===========================================================================

/**
 * Returns a human-readable lockout reason if `part` is incompatible with `body`,
 * or null when the part is allowed.
 *
 * Uses `body.atmosphere === null` (typed field) instead of `atmosphereDensity === 0`.
 * Uses `body.solarFlux < 0.4 W/m²` instead of `distanceFromSun > 1.5 AU`
 * (distanceFromSun does not exist in the Body type).
 */
export function getLockReason(part: PartDef, body: Body): string | null {
  if (part.category === 'parachute' && body.atmosphere === null) {
    return 'Incompatible: Parachutes require atmospheric drag to slow a spacecraft. This body has no atmosphere.';
  }

  // solarAreaM2 being defined signals this is a solar-panel-type power part
  if (
    part.category === 'power' &&
    part.stats.solarAreaM2 !== undefined &&
    body.solarFlux < 0.4
  ) {
    // VERIFY: Mars average solar flux ~586 W/m², Jupiter ~50 W/m² (solarFlux in our Body type
    // stores W/m² at 1 AU then scaled; threshold 0.4 covers past Mars, consistent with bodies.json)
    return 'Incompatible: Solar irradiance is too low past Mars. These panels cannot generate enough power here. Consider an RTG.';
  }

  return null;
}

// ===========================================================================
// 4. ONBOARDING SCRIPT (Mission 1 Walkthrough)
// ===========================================================================

export interface OnboardingStep {
  phase: GamePhase;
  targetUI: string;
  message: string;
}

/**
 * Step-by-step onboarding for the very first mission.
 * `targetUI` matches a `data-tutorial="<id>"` attribute on the target element.
 *
 * TODO(owner-4): confirm ascent decision (auto-fly vs manual) with the team —
 * step 3 currently says ascent is automated; update if manual ascent is added.
 */
export const ONBOARDING_SCRIPT: OnboardingStep[] = [
  {
    phase: 'hangar',
    targetUI: 'contract-brief',
    message:
      "Welcome to Launchsmith. Your first contract is a simple Moon landing. Notice the budget and mass limits in the top right — you cannot exceed these.",
  },
  {
    phase: 'hangar',
    targetUI: 'parts-menu',
    message:
      "Pick a Chemical Thruster, a Fuel Tank, and Basic Landing Legs from the parts panel. Use the sliders to tune their parameters. Watch your Thrust-to-Weight Ratio turn green.",
  },
  {
    phase: 'flight',
    targetUI: 'skip-transit-btn',
    message:
      "Ascent is automated based on your fuel math. Click 'Fast-Forward Transit' to skip the journey and begin the landing phase.",
  },
  {
    phase: 'flight',
    targetUI: 'throttle-slider',
    message:
      "The Moon has no atmosphere, so parachutes will not help. Use your throttle to slow your vertical speed below your leg tolerance before you hit the bullseye.",
  },
];

// ===========================================================================
// 5. CORE GAMEPLAY GUIDE (Help Menu / Codex)
// ===========================================================================

export interface GuideEntry {
  title: string;
  content: string;
}

/**
 * In-game "How to Play" reference mapped into the help tab by the UI layer.
 * Keep wording player-facing and jargon-light.
 */
export const GAMEPLAY_GUIDE: GuideEntry[] = [
  {
    title: 'The Core Loop',
    content:
      'Pick a contract, design a spacecraft that meets the constraints, fly the mission, and scavenge for data. Your net profit determines whether you can afford to unlock the next contract.',
  },
  {
    title: 'The Funding Gate & Replayability',
    content:
      'Total funds unlock new contracts. If you overspent on a massive ship, a successful landing might still leave you short. Replay older contracts with cheaper, leaner designs to maximise your profit margin.',
  },
  {
    title: 'Wear, Tear, and Repair',
    content:
      'Parts degrade over multiple flights. Reusing an old engine saves build costs but increases the risk of mid-flight malfunctions. Balance the cost of repairing parts against the risk of losing the mission entirely.',
  },
  {
    title: 'Scavenging and Research',
    content:
      'Landing is only half the mission. Once on the surface, your ship automatically scavenges for samples and data until power runs out or the environment destroys it. Bring samples back to research new technologies and unlock better parts.',
  },
  {
    title: 'Streaks and Multipliers',
    content:
      'Flying cleanly — low fuel use, bullseye landings — builds your streak multiplier and drastically increases your payout. A single crashed mission resets all streaks to zero.',
  },
  {
    title: 'Difficulty Modes & Sandbox',
    content:
      'Easy mode gives you a 1.5× budget bonus and hints. Normal is the balanced experience. Hard mode enables random malfunctions and tighter rings. Sandbox removes the budget cap so you can experiment freely — streaks and records are disabled.',
  },
  {
    title: 'Team Roles',
    content:
      'In multiplayer, the Director sets strategy and signs off on the design, the Engineer owns ship assembly, the Science officer selects instruments and interprets results, and Operations controls the throttle during landing. Each role can flag concerns before launch.',
  },
];

