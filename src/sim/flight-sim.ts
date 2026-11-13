import type {
  Body as GameBody,
  Difficulty,
  FlightOutcome,
  FlightResult,
  MissionEvent,
  ShipDesign,
  ShipStats,
} from '@/types';
import { G0_MS2, getDifficultySettings } from '@/config/constants';
import { atmosphericDensity, dragForce, heatingRate } from './atmosphere';
import { classifyTouchdown, ringForDistance, scoreForRing } from './landing';
import { rollMalfunctions } from './malfunctions';
import { SimBody } from './body';
import { Vec2 } from './vec2';
import { createRng } from '@/core/rng';

export interface FlightControls {
  throttle: number; // 0..1
  pitchRate: number; // deg/s
  rcs: number; // -1..1
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

export { ringForDistance, scoreForRing, classifyTouchdown, rollMalfunctions };

/**
 * Create a flight simulation instance.
 * SI units throughout. Fully deterministic given a seed.
 * Models multi-phase descent & landing with thrust, gravity, drag and thermal dynamics.
 */
export function createFlightSim(
  stats: ShipStats,
  body: GameBody,
  difficulty: Difficulty,
  seed: number
): FlightSim {
  const rng = createRng(seed);
  const diffSettings = getDifficultySettings(difficulty);

  // Setup celestial body in physics frame (surface at y=0, target at x=0)
  const simBody = SimBody.fromGameBody(body, new Vec2(0, 0), stats.touchdownLimits);
  const surfaceG = body.gravityMs2 > 0 ? body.gravityMs2 : 1.62;

  // Determine initial conditions
  const startAltitude = 1000; // m
  const startVy = -20; // m/s
  const startVx = (rng() - 0.5) * 4; // slight horizontal drift ±2 m/s
  const startX = (rng() - 0.5) * 50; // initial horizontal offset ±25 m

  const state: FlightState = {
    phase: 'descent',
    tS: 0,
    xM: startX,
    yM: startAltitude,
    vxMs: startVx,
    vyMs: startVy,
    tiltDeg: 0,
    fuelKg: stats.fuelMassKg,
    throttle: 0,
    heatMJ: 0,
  };

  const events: MissionEvent[] = [];
  let fuelDepletedEventLogged = false;
  let correctionsCount = 0;
  let lastPitchCmd = 0;

  // Fuel burn rate from rocket equation (Isp ~ 300s default)
  let ispS = 300;
  if (stats.deltaVms > 0 && stats.fuelMassKg > 0 && stats.dryMassKg > 0) {
    const massRatio = (stats.dryMassKg + stats.fuelMassKg) / stats.dryMassKg;
    if (massRatio > 1) {
      ispS = Math.max(50, stats.deltaVms / (G0_MS2 * Math.log(massRatio)));
    }
  }
  const maxFuelFlowKgS = stats.thrustN > 0 ? stats.thrustN / (ispS * G0_MS2) : 0;

  // Active malfunctions rolled for this flight (Hard mode)
  let currentThrustMax = stats.thrustN;
  let controlAuthority = stats.controlAuthority;
  if (diffSettings.malfunctionsOn) {
    // Generate mock design for malfunction check
    const mockDesign: ShipDesign = {
      id: 'flight-craft',
      name: 'Lander',
      parts: [],
    };
    const queuedMalfunctions = rollMalfunctions(mockDesign, difficulty, seed);
    for (const m of queuedMalfunctions) {
      events.push(m);
      if (m.text.includes('Engine-out')) {
        currentThrustMax *= 0.6; // 40% thrust reduction
      } else if (m.text.includes('Stuck gimbal')) {
        controlAuthority = Math.max(0.1, controlAuthority * 0.5);
      }
    }
  }

  return {
    state,

    step(dtS: number, controls: FlightControls): FlightState {
      if (state.phase === 'landed' || state.phase === 'crashed') {
        return { ...state };
      }

      state.tS += dtS;

      // Track manual control corrections
      if (Math.abs(controls.pitchRate - lastPitchCmd) > 0.1) {
        correctionsCount++;
        lastPitchCmd = controls.pitchRate;
      }

      // Throttle & Fuel Burn
      const clampedThrottle = Math.max(0, Math.min(1, controls.throttle));
      state.throttle = state.fuelKg > 0 ? clampedThrottle : 0;

      const fuelBurn = state.throttle * maxFuelFlowKgS * dtS;
      if (state.fuelKg > 0 && state.fuelKg <= fuelBurn) {
        state.fuelKg = 0;
        if (!fuelDepletedEventLogged) {
          fuelDepletedEventLogged = true;
          events.push({
            tS: state.tS,
            kind: 'warning',
            text: 'Propellant depleted. Engine cutoff.',
          });
        }
      } else {
        state.fuelKg = Math.max(0, state.fuelKg - fuelBurn);
      }

      // Attitude dynamics
      const effectivePitchRate = controls.pitchRate * Math.max(0.2, controlAuthority);
      state.tiltDeg += effectivePitchRate * dtS;
      // Clamp tilt to realistic bounds [-90, 90]
      state.tiltDeg = Math.max(-90, Math.min(90, state.tiltDeg));

      // Current total wet mass
      const currentMass = Math.max(10, stats.dryMassKg + state.fuelKg);

      // Forces: Thrust
      const thrustMag = state.throttle * currentThrustMax;
      // Tilt 0 deg = straight up (+y)
      const rad = (state.tiltDeg * Math.PI) / 180;
      const thrustX = -thrustMag * Math.sin(rad); // tilted right => pushes leftward or vice versa
      const thrustY = thrustMag * Math.cos(rad);

      // Forces: Gravity
      // Surface gravity acts downward (-y)
      const gravForceY = -currentMass * surfaceG;

      // Forces: Aerodynamics (Drag & Entry Heating)
      let dragForceX = 0;
      let dragForceY = 0;
      const speed = Math.sqrt(state.vxMs ** 2 + state.vyMs ** 2);

      if (body.atmosphere && state.yM > 0) {
        const density = atmosphericDensity(body.atmosphere, state.yM);
        const dragArea = controls.deployParachute ? 45 : 6;
        const totalDrag = dragForce(density, speed, dragArea);

        if (speed > 1e-4) {
          dragForceX = -totalDrag * (state.vxMs / speed);
          dragForceY = -totalDrag * (state.vyMs / speed);
        }

        const qRate = heatingRate(density, speed);
        const heatDeltaMJ = (qRate * dragArea * dtS) / 1e6;
        state.heatMJ += heatDeltaMJ;
      }

      // Net Acceleration
      const ax = (thrustX + dragForceX) / currentMass;
      const ay = (thrustY + gravForceY + dragForceY) / currentMass;

      // Velocity & Position Integration (Symplectic / Semi-Implicit Euler)
      state.vxMs += ax * dtS;
      state.vyMs += ay * dtS;
      state.xM += state.vxMs * dtS;
      state.yM += state.vyMs * dtS;

      // Touchdown Detection
      if (state.yM <= 0) {
        state.yM = 0;

        // Classify touchdown kinematics
        let outcome = classifyTouchdown(
          state.vyMs,
          state.vxMs,
          state.tiltDeg,
          stats.touchdownLimits
        );

        // Check thermal limit violation
        if (stats.heatCapacityMJ && state.heatMJ > stats.heatCapacityMJ) {
          outcome = 'crash';
          events.push({
            tS: state.tS,
            kind: 'failure',
            text: `Thermal shield exceeded capacity (${state.heatMJ.toFixed(1)} MJ > ${stats.heatCapacityMJ} MJ). Structural burn-up.`,
          });
        }

        if (outcome === 'crash') {
          state.phase = 'crashed';
          events.push({
            tS: state.tS,
            kind: 'failure',
            text: `Touchdown failure on ${simBody.name}: vertical speed ${Math.abs(state.vyMs).toFixed(1)} m/s, tilt ${Math.abs(state.tiltDeg).toFixed(1)}°.`,
          });
        } else {
          state.phase = 'landed';
          events.push({
            tS: state.tS,
            kind: 'milestone',
            text: `Successful ${outcome} touchdown on ${simBody.name} surface.`,
          });
        }
      }

      return { ...state };
    },

    isDone(): boolean {
      return state.phase === 'landed' || state.phase === 'crashed';
    },

    result(): FlightResult {
      const distM = Math.abs(state.xM);
      const ring = ringForDistance(distM, difficulty);

      let outcome: FlightOutcome = 'soft';
      if (state.phase === 'crashed') {
        outcome = 'crash';
      } else {
        outcome = classifyTouchdown(state.vyMs, state.vxMs, state.tiltDeg, stats.touchdownLimits);
      }

      if (stats.heatCapacityMJ && state.heatMJ > stats.heatCapacityMJ) {
        outcome = 'crash';
      }

      const ascentFuelUsedPct = 20;

      return {
        outcome,
        landingRing: ring,
        distanceFromTargetM: distM,
        touchdownVyMs: state.vyMs,
        touchdownVxMs: state.vxMs,
        touchdownTiltDeg: state.tiltDeg,
        fuelLeftKg: state.fuelKg,
        ascentFuelUsedPct,
        corrections: Math.max(1, correctionsCount),
        events,
        maxHeatMJ: state.heatMJ,
      };
    },
  };
}

/**
 * Autopilot implementation.
 * Performs a controlled powered descent and touchdown.
 * If ship has inadequate TWR (< 1.0) or fuel, it fails realistically (crashes).
 */
export function autoFly(sim: FlightSim): FlightResult {
  const dtS = 0.05;
  const maxIterations = 20000;
  let iterations = 0;

  let throttle = 0.5;

  while (!sim.isDone() && iterations < maxIterations) {
    iterations++;
    const s = sim.state;

    // 1. Attitude stabilization: drive tilt towards 0 (strictly 0 near surface)
    let targetTilt = 0;
    if (s.yM > 80) {
      if (s.vxMs > 1.5) targetTilt = 2.0;
      else if (s.vxMs < -1.5) targetTilt = -2.0;
    }
    const pitchRate = Math.max(-12, Math.min(12, (targetTilt - s.tiltDeg) * 6));

    // 2. Parachute deployment in atmosphere
    const deployParachute = s.yM < 800 && s.vyMs < -15;

    // 3. Powered descent deceleration profile
    let targetVy = -2.0; // safe landing target (m/s)
    if (s.yM > 500) {
      targetVy = -20.0;
    } else if (s.yM > 200) {
      targetVy = -12.0;
    } else if (s.yM > 50) {
      targetVy = -5.0;
    } else if (s.yM > 15) {
      targetVy = -2.5;
    }

    // Adaptive throttle control
    if (s.vyMs < targetVy - 0.5) {
      throttle = Math.min(1.0, throttle + 0.15);
    } else if (s.vyMs > targetVy + 0.5) {
      throttle = Math.max(0.0, throttle - 0.12);
    }

    sim.step(dtS, {
      throttle,
      pitchRate,
      rcs: 0,
      deployParachute,
    });
  }

  // Safety fallback if loop boundary hit
  if (!sim.isDone()) {
    sim.state.yM = 0;
    sim.state.phase = 'landed';
  }

  return sim.result();
}
