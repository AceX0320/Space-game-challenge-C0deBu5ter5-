import type { Body, Difficulty, FlightResult, ShipStats } from '@/types';
import { G0_MS2 } from '@/config/constants';
import { atmosphericDensity, dragForce } from './atmosphere';
import { classifyTouchdown, ringForDistance } from './landing';

// FlightControls and FlightState are defined here (not yet in types.ts)
export interface FlightControls {
  throttle: number;
  pitchRate: number;
  rcs: number;
  deployParachute: boolean;
}

export interface FlightState {
  phase: 'ascent' | 'transit' | 'descent' | 'landing' | 'landed' | 'crashed';
  tS: number;
  xM: number;
  yM: number;
  vxMs: number;
  vyMs: number;
  tiltDeg: number;
  fuelKg: number;
  throttle: number;
  heatMJ: number;
}

export interface FlightSim {
  state: FlightState;
  step(dtS: number, controls: FlightControls): FlightState;
  isDone(): boolean;
  result(): FlightResult;
}

// Suppress unused import warning — G0_MS2 and _seed reserved for future phases
void G0_MS2;


/**
 * Create a flight simulation instance.
 * Simple 2D side-view physics: gravity, thrust, drag, tilt.
 * See concept file section 7 (Physics model).
 * TODO(owner-1): implement real ascent, transit and descent phases.
 *   - Ascent: player-controlled throttle + pitch from y=0 upward
 *   - Transit: fast-forward with random events, fuel cost applied
 *   - Descent: atmosphere drag + heat shield + parachute + powered landing
 *   - Landing: steer to bullseye, classify touchdown
 */
export function createFlightSim(
  stats: ShipStats,
  body: Body,
  difficulty: Difficulty,
  _seed: number
): FlightSim {
  const state: FlightState = {
    phase: 'ascent',
    tS: 0,
    xM: 0,
    yM: 0,
    vxMs: 0,
    vyMs: 0,
    tiltDeg: 0,
    fuelKg: stats.fuelMassKg,
    throttle: 0,
    heatMJ: 0,
  };

  // Drag area from heat shield or parachute or hull estimate
  const dragAreaM2 = 10; // game default

  return {
    state,
    step(dtS: number, controls: FlightControls): FlightState {
      // TODO(owner-1): implement real physics step per phase
      // For now: stub descent to bullseye
      state.tS += dtS;
      state.throttle = controls.throttle;
      state.tiltDeg += controls.pitchRate * dtS;

      const density = atmosphericDensity(body.atmosphere, state.yM);
      const speedMs = Math.sqrt(state.vxMs ** 2 + state.vyMs ** 2);
      const drag = dragForce(density, speedMs, dragAreaM2);
      const thrustN = controls.throttle * stats.thrustN;
      const fuelFlow = thrustN / (stats.thrustN > 0 ? stats.thrustN / stats.fuelMassKg * 60 : 1);

      // Simple descent: approach ground
      const gravityMs2 = body.gravityMs2;
      const netForceN = thrustN - stats.totalMassKg * gravityMs2 - drag;
      state.vyMs += (netForceN / stats.totalMassKg) * dtS;
      state.yM += state.vyMs * dtS;
      state.fuelKg = Math.max(0, state.fuelKg - fuelFlow * dtS);

      if (state.yM <= 0 && state.phase !== 'landed' && state.phase !== 'crashed') {
        state.yM = 0;
        const outcome = classifyTouchdown(
          state.vyMs, state.vxMs, state.tiltDeg, stats.touchdownLimits
        );
        state.phase = outcome === 'crash' ? 'crashed' : 'landed';
      }

      return { ...state };
    },
    isDone(): boolean {
      return state.phase === 'landed' || state.phase === 'crashed';
    },
    result(): FlightResult {
      const distM = Math.abs(state.xM);
      const ring = ringForDistance(distM, difficulty);
      const outcome = state.phase === 'crashed' ? 'crash'
        : classifyTouchdown(state.vyMs, state.vxMs, state.tiltDeg, stats.touchdownLimits);
      return {
        outcome,
        landingRing: ring,
        distanceFromTargetM: distM,
        touchdownVyMs: state.vyMs,
        touchdownVxMs: state.vxMs,
        touchdownTiltDeg: state.tiltDeg,
        fuelLeftKg: state.fuelKg,
        ascentFuelUsedPct: 20, // stub
        corrections: 3, // stub
        events: [],
      };
    },
  };
}

/**
 * Simple autopilot for testing and mock missions.
 * Runs the sim with a fixed throttle until landing.
 * TODO(owner-1): improve autopilot to aim for the bullseye.
 */
export function autoFly(sim: FlightSim): FlightResult {
  // Start high up, falling
  sim.state.yM = 1000;
  sim.state.vyMs = -20;

  const controls: FlightControls = {
    throttle: 0.1,
    pitchRate: 0,
    rcs: 0,
    deployParachute: false,
  };

  let steps = 0;
  while (!sim.isDone() && steps < 10000) {
    if (sim.state.yM < 200 && sim.state.vyMs < -4) {
      controls.throttle = 0.8;
    } else if (sim.state.vyMs > -2) {
      controls.throttle = 0.05;
    }
    sim.step(0.1, controls);
    steps++;
  }

  if (!sim.isDone()) {
    sim.state.yM = 0;
    sim.state.phase = 'landed';
  }

  return sim.result();
}
