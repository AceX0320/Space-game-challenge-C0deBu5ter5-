import { SimBody as Body } from './body';
import { Ship, Impact } from './ship';
import { Vec2 } from './vec2';
import { stepShip } from './physics';
import { ShipCommand, EMPTY_COMMAND, commandsEqual } from './commands';
import { ShipEvents, emptyEvents } from './events';
import { predictTrajectory, Trajectory, TrajectoryOptions } from './trajectory';
import { createRng } from '@/core/rng';

const DEFAULT_FIXED_DT = 1 / 60;
const DEFAULT_MAX_SUBSTEP = 0.02;
const DEFAULT_MAX_SUBSTEPS = 20;
const DEFAULT_TRAJ_EVERY_N = 6;

// Throttle ramp: 0→1 in 0.25 s, 1→0 in 0.5 s.
const THROTTLE_UP_RATE = 1 / 0.25;
const THROTTLE_DOWN_RATE = 1 / 0.5;

// Rotation dynamics.
const ANG_ACC = 6; // rad/s² — acceleration while key held
const ANG_MAX = 3; // rad/s — clamp on angular velocity
const ANG_DECAY_HALF_LIFE = 1.2; // s — coast-down half-life when keys released
const ANG_MIN_SNAP = 0.01; // rad/s — snap to 0 below this when coasting

const MAX_FRAME_DT = 0.1;

export interface EngineConfig {
  fixedDt?: number;
  maxSubstep?: number;
  maxSubsteps?: number;
  trajEveryNFrames?: number;
  trajectory?: TrajectoryOptions;
  seed?: number;
}

export interface GameState {
  bodies: Body[];
  ship: Ship;
  target: Body | null;
  time: number;
  trajectory: Trajectory;
  events: ShipEvents;
  paused: boolean;
}

export class GameEngine {
  readonly state: GameState;
  readonly rng: () => number;

  private readonly fixedDt: number;
  private readonly maxSubstep: number;
  private readonly maxSubsteps: number;
  private readonly trajEveryNFrames: number;
  private readonly trajOpts: TrajectoryOptions;

  private accumulator = 0;
  private trajCounter = 0;
  private lastCommand: ShipCommand = { ...EMPTY_COMMAND };
  private lastFuelMass: number;

  constructor(bodies: Body[], ship: Ship, target: Body | null = null, cfg: EngineConfig = {}) {
    this.fixedDt = cfg.fixedDt ?? DEFAULT_FIXED_DT;
    this.maxSubstep = cfg.maxSubstep ?? DEFAULT_MAX_SUBSTEP;
    this.maxSubsteps = cfg.maxSubsteps ?? DEFAULT_MAX_SUBSTEPS;
    this.trajEveryNFrames = cfg.trajEveryNFrames ?? DEFAULT_TRAJ_EVERY_N;
    this.trajOpts = cfg.trajectory ?? {};

    if (!Number.isFinite(this.fixedDt) || this.fixedDt <= 0) {
      throw new Error(`GameEngine: fixedDt must be > 0 (got ${this.fixedDt})`);
    }
    if (!Number.isFinite(this.maxSubstep) || this.maxSubstep <= 0) {
      throw new Error(`GameEngine: maxSubstep must be > 0 (got ${this.maxSubstep})`);
    }
    if (!Number.isInteger(this.maxSubsteps) || this.maxSubsteps < 1) {
      throw new Error(`GameEngine: maxSubsteps must be an integer >= 1 (got ${this.maxSubsteps})`);
    }
    if (!Number.isInteger(this.trajEveryNFrames) || this.trajEveryNFrames < 1) {
      throw new Error(
        `GameEngine: trajEveryNFrames must be an integer >= 1 (got ${this.trajEveryNFrames})`
      );
    }

    this.rng = createRng(cfg.seed ?? 42);
    this.lastFuelMass = ship.fuelMass;

    this.state = {
      bodies,
      ship,
      target,
      time: 0,
      events: emptyEvents(),
      trajectory: predictTrajectory(ship, bodies, this.trajOpts),
      paused: false,
    };
  }

  update(dt: number, cmd: ShipCommand = EMPTY_COMMAND): ShipEvents {
    if (this.state.paused) {
      this.state.events = emptyEvents();
      return this.state.events;
    }
    if (!Number.isFinite(dt) || dt < 0) {
      throw new Error(`GameEngine.update: dt must be finite and >= 0 (got ${dt})`);
    }
    dt = Math.min(dt, MAX_FRAME_DT);

    this.state.events = emptyEvents();

    const inputChanged = !commandsEqual(cmd, this.lastCommand);
    this.lastCommand = { ...cmd };

    this.accumulator += dt;

    const substepsPerTick = Math.min(
      this.maxSubsteps,
      Math.max(1, Math.ceil(this.fixedDt / this.maxSubstep))
    );

    let frameImpact: Impact | null = null;

    while (this.accumulator >= this.fixedDt) {
      this.applyInput(cmd, this.fixedDt);

      stepShip(this.state.ship, this.state.bodies, {
        dt: this.fixedDt,
        substeps: substepsPerTick,
      });

      if (this.state.ship.lastImpact && !frameImpact) {
        frameImpact = this.state.ship.lastImpact;
      }

      this.state.time += this.fixedDt;
      this.accumulator -= this.fixedDt;
    }

    if (frameImpact) {
      this.state.events.impact = frameImpact;
      if (frameImpact.crashed) this.state.events.crashed = true;
      else this.state.events.landed = true;
    }

    // Edge-triggered fuel-empty.
    if (this.lastFuelMass > 0 && this.state.ship.fuelMass <= 0) {
      this.state.events.fuelEmpty = true;
    }
    this.lastFuelMass = this.state.ship.fuelMass;

    // Trajectory refresh: periodic, or immediately when input changes.
    this.trajCounter++;
    if (this.trajCounter >= this.trajEveryNFrames || inputChanged) {
      this.state.trajectory = predictTrajectory(this.state.ship, this.state.bodies, this.trajOpts);
      this.trajCounter = 0;
    }

    return this.state.events;
  }

  setPaused(p: boolean): void {
    this.state.paused = p;
    if (p) this.accumulator = 0;
  }

  get paused(): boolean {
    return this.state.paused;
  }

  setTarget(target: Body | null): void {
    this.state.target = target;
  }

  speedRelativeToTarget(): {
    radial: number;
    tangential: number;
    speed: number;
    normal: Vec2;
  } | null {
    const t = this.state.target;
    if (!t) return null;
    const ship = this.state.ship;
    const d = ship.position.sub(t.position);
    const r = d.mag();
    const normal = r > 0 ? d.norm() : new Vec2(0, 1);
    const vRel = ship.velocity.sub(t.velocity);
    const radial = vRel.dot(normal);
    const vTan = vRel.sub(normal.scale(radial));
    return { radial, tangential: vTan.mag(), speed: vRel.mag(), normal };
  }

  private applyInput(cmd: ShipCommand, dt: number): void {
    const ship = this.state.ship;

    const target = cmd.thrust && ship.fuelMass > 0 ? 1 : 0;
    if (ship.throttle < target) {
      ship.throttle = Math.min(target, ship.throttle + THROTTLE_UP_RATE * dt);
    } else if (ship.throttle > target) {
      ship.throttle = Math.max(target, ship.throttle - THROTTLE_DOWN_RATE * dt);
    }

    const dir = (cmd.rotateRight ? 1 : 0) - (cmd.rotateLeft ? 1 : 0);
    if (dir !== 0) {
      ship.angularVelocity += dir * ANG_ACC * dt;
      if (ship.angularVelocity > ANG_MAX) ship.angularVelocity = ANG_MAX;
      if (ship.angularVelocity < -ANG_MAX) ship.angularVelocity = -ANG_MAX;
    } else {
      ship.angularVelocity *= Math.pow(0.5, dt / ANG_DECAY_HALF_LIFE);
      if (Math.abs(ship.angularVelocity) < ANG_MIN_SNAP) ship.angularVelocity = 0;
    }

    ship.orientation += ship.angularVelocity * dt;
  }
}
