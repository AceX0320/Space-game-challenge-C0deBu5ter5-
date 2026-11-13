// lib/tutorialManager.js

// ==========================================
// 1. STAT TOOLTIPS
// ==========================================
export const STAT_TOOLTIPS = {
  mass: {
    label: "Total Mass",
    explanation: "Every component adds mass. More mass requires more thrust to lift, which means more fuel, which adds even more mass.",
    nasaFact: "This compounding weight problem is known as the 'Tyranny of the Rocket Equation'."
  },
  twr: {
    label: "Thrust-to-Weight Ratio (TWR)",
    explanation: "Must be greater than 1.0. If TWR is exactly 1.0, your engines exactly cancel out gravity, meaning you hover but don't climb.",
    nasaFact: "The Apollo Saturn V rocket had a liftoff TWR of 1.16, meaning it accelerated off the launchpad very slowly."
  },
  powerBalance: {
    label: "Power Balance",
    explanation: "Instruments, antennas, and flight computers constantly draw power. If generation drops below this draw, your batteries will drain."
  },
  deltaV: {
    label: "Delta-v (Δv)",
    explanation: "The total amount of velocity change your ship can perform. Think of it as your absolute range.",
    nasaFact: "Getting into low Earth orbit requires a massive Δv of roughly 9,400 m/s."
  }
};

// ==========================================
// 2. ACTIVE HINTS (Pre-flight Warnings)
// ==========================================
export const ACTIVE_HINTS = {
  lowTWR: {
    condition: "twr < 1.05",
    message: "Warning: Your engines are too weak for your mass. You will not be able to slow down during landing. Add thrusters or strip weight."
  },
  highDataLowComms: {
    condition: "dataGenerated > antennaCapacity",
    message: "Warning: You are generating more science data than you can transmit. Upgrade your antenna or you will lose data."
  },
  noShadowPower: {
    condition: "powerType === 'solar' && destination === 'titan'",
    message: "Warning: Solar panels are highly ineffective in Titan's thick atmosphere and shadow. Consider an RTG (Nuclear Battery)."
  }
};

// ==========================================
// 3. LOCKOUT REASONS
// ==========================================
export const LOCKOUT_REASONS = {
  parachuteOnMoon: {
    trigger: "body.atmosphereDensity === 0 && part.type === 'parachute'",
    message: "Incompatible: Parachutes require atmospheric drag to slow a spacecraft. The Moon has no atmosphere."
  },
  solarPastMars: {
    trigger: "body.distanceFromSun > 1.5 && part.type === 'solar_panel'",
    message: "Incompatible: Solar irradiance drops drastically past Mars. These panels cannot generate enough power here."
  }
};

// ==========================================
// 4. ONBOARDING SCRIPT (Mission 1 Walkthrough)
// ==========================================
export const ONBOARDING_SCRIPT = [
  {
    phase: "builder",
    targetUI: "contract-brief",
    message: "Welcome to Launchsmith. Your first contract is a simple Moon landing. Notice the budget and mass limits in the top right. You cannot exceed these."
  },
  {
    phase: "builder",
    targetUI: "parts-menu",
    message: "Drag a Chemical Thruster, a Fuel Tank, and Basic Landing Legs onto the grid. Watch your Thrust-to-Weight Ratio turn green."
  },
  {
    phase: "flight_ascent",
    targetUI: "skip-transit-btn",
    message: "Ascent is automated based on your fuel math. Click 'Fast-Forward Transit' to skip the journey and begin the landing phase."
  },
  {
    phase: "flight_landing",
    targetUI: "throttle-slider",
    message: "The Moon has no atmosphere, so parachutes won't help. Use your throttle to slow your vertical speed below your leg tolerance before you hit the bullseye."
  }
];

// ==========================================
// 5. CORE GAMEPLAY GUIDE (Help Menu / Codex)
// ==========================================
// The UI team maps this into an in-game "How to Play" tab or manual so players 
// can reference the overall game loop and economy rules at any time.
export const GAMEPLAY_GUIDE = [
  {
    title: "The Core Loop",
    content: "Pick a contract, design a spacecraft that meets the constraints, fly the mission, and scavenge for data. Your net profit determines if you can afford to unlock the next contract."
  },
  {
    title: "The Funding Gate & Replayability",
    content: "Total funds unlock new contracts. If you spent too much building a massive ship, a successful landing might still leave you short on cash. Replay older contracts with cheaper, leaner ship designs to maximize your profit margin."
  },
  {
    title: "Wear, Tear, and Repair",
    content: "Parts degrade over multiple flights. Reusing an old engine saves you millions in build costs, but increases the risk of mid-flight malfunctions. You must balance the cost of repairing parts against the risk of losing the mission entirely."
  },
  {
    title: "Scavenging and Research",
    content: "Landing is only half the mission. Once on the surface, your ship automatically scavenges for samples and data until its power dies or the environment destroys it. Bring these samples back to research new technologies and upgrade your parts."
  },
  {
    title: "Streaks and Multipliers",
    content: "Flying cleanly (low fuel use, bullseye landings) builds your streak multiplier, drastically increasing your payout. However, a single crashed mission will reset all your streaks to zero."
  }
];