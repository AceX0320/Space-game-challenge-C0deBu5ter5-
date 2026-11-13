import { Body } from '../sim/body';
import { Ship, Impact } from '../sim/ship';
import { Vec2 } from '../sim/vec2';
import { stepShip } from '../sim/physics';
import { GameState } from './state';
import { ShipCommand, EMPTY_COMMAND, commandsEqual } from './commands';
import { ShipEvents, emptyEvents } from './events';
import { predictTrajectory, TrajectoryOptions } from './trajectory';
import { Rng, randomSeed } from './rng';

const DEFAULT_FIXED_DT = 1 / 60;
const DEFAULT_MAX_SUBSTEP = 0.02;
const DEFAULT_MAX_SUBSTEPS = 20;
const DEFAULT_TRAJ_EVERY_N = 6;

// Throttle ramp: 0→1 in 0.25 s, 1→0 in 0.5 s.
const THROTTLE_UP_RATE = 1 / 0.25;
const THROTTLE_DOWN_RATE = 1 / 0.5;

// Rotation dynamics.
const ANG_ACC = 6;              // rad/s² — acceleration while key held
const ANG_MAX = 3;              // rad/s — clamp on angular velocity
const ANG_DECAY_HALF_LIFE = 1.2;// s — coast-down half-life when keys released
const ANG_MIN_SNAP = 0.01;      // rad/s — snap to 0 below this when coasting

// Max raw dt the engine will accept in one update() call. Protects against
// the first frame after a tab-switch delivering a multi-second dt.
const MAX_FRAME_DT = 0.1;

export interface EngineConfig {
  /** Physics tick size in seconds. Default 1/60. */
  fixedDt?: number;
  /** Largest substep allowed. Smaller → more accurate, costlier. Default 0.02. */
  maxSubstep?: number;
  /** Hard cap on substeps per tick. Default 20. */
  maxSubsteps?: number;
  /** Trajectory refresh period, in update() calls. Default 6. */
  trajEveryNFrames?: number;
  /** Forwarded to predictTrajectory() each refresh. */
  trajectory?: TrajectoryOptions;
  /** Seed for the engine's RNG. Default: randomSeed(). */
  seed?: number;
}

/**
 * The game engine. Owns the accumulator loop, input application, event folding,
 * and trajectory prediction. Exposes GameState for HUD/render code.
 *
 * Contract:
 *   - Call update(dt, cmd) exactly once per rendered frame.
 *   - Read state for rendering/HUD. Do not mutate state outside the engine.
 *   - Read events from the return value (or state.events), not from ship.lastImpact.
 *
 * Does not:
 *   - Read the keyboard (use KeyboardInput, then pass its read()).
 *   - Render anything.
 *   - Touch the DOM.
 *   - Use Math.random() during a run (only in randomSeed() at construction).
 */
export class GameEngine {
  readonly state: GameState;
  readonly rng: Rng;

  private readonly fixedDt: number;
  private readonly maxSubstep: number;
  private readonly maxSubsteps: number;
  private readonly trajEveryNFrames: number;
  private readonly trajOpts: TrajectoryOptions;

  private accumulator = 0;
  private trajCounter = 0;
  private lastCommand: ShipCommand = { ...EMPTY_COMMAND };
  private lastFuelMass: number;

  constructor(
    bodies: Body[],
    ship: Ship,
    target: Body | null = null,
    cfg: EngineConfig = {}
  ) {
    this.fixedDt          = cfg.fixedDt ?? DEFAULT_FIXED_DT;
    this.maxSubstep       = cfg.maxSubstep ?? DEFAULT_MAX_SUBSTEP;
    this.maxSubsteps      = cfg.maxSubsteps ?? DEFAULT_MAX_SUBSTEPS;
    this.trajEveryNFrames = cfg.trajEveryNFrames ?? DEFAULT_TRAJ_EVERY_N;
    this.trajOpts         = cfg.trajectory ?? {};

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
      throw new Error(`GameEngine: trajEveryNFrames must be an integer >= 1 (got ${this.trajEveryNFrames})`);
    }

    this.rng = new Rng(cfg.seed ?? randomSeed());
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

  /**
   * Advance the simulation by `dt` seconds. Apply `cmd` as the player's input.
   * Returns the events that fired this frame (also available as state.events).
   */
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

      // stepShip clears ship.lastImpact at its top; grab it before the next
      // iteration clears it again.
      if (this.state.ship.lastImpact && !frameImpact) {
        frameImpact = this.state.ship.lastImpact;
      }

      this.state.time += this.fixedDt;
      this.accumulator -= this.fixedDt;
    }

    if (frameImpact) {
      this.state.events.impact = frameImpact;
      if (frameImpact.crashed) this.state.events.crashed = true;
      else                     this.state.events.landed  = true;
    }

    // Edge-triggered fuel-empty.
    if (this.lastFuelMass > 0 && this.state.ship.fuelMass <= 0) {
      this.state.events.fuelEmpty = true;
    }
    this.lastFuelMass = this.state.ship.fuelMass;

    // Trajectory refresh: periodic, or immediately when input changes.
    this.trajCounter++;
    if (this.trajCounter >= this.trajEveryNFrames || inputChanged) {
      this.state.trajectory = predictTrajectory(
        this.state.ship,
        this.state.bodies,
        this.trajOpts
      );
      this.trajCounter = 0;
    }

    return this.state.events;
  }

  /** Pause or resume. Clears the accumulator on pause so time doesn't bank up. */
  setPaused(p: boolean): void {
    this.state.paused = p;
    if (p) this.accumulator = 0;
  }

  get paused(): boolean {
    return this.state.paused;
  }

  /** Change the reference body for relative HUD readouts. */
  setTarget(target: Body | null): void {
    this.state.target = target;
  }

  /**
   * Ship velocity decomposed relative to the current target.
   *   radial:     positive = receding, negative = approaching
   *   tangential: positive, sideways speed relative to the target
   *   speed:      |vRel|
   *   normal:     unit vector from target toward ship
   *
   * Returns null if no target is set.
   */
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

  // ---- internals ----

  private applyInput(cmd: ShipCommand, dt: number): void {
    const ship = this.state.ship;

    // Throttle ramp toward target (0 if key up or no fuel).
    const target = cmd.thrust && ship.fuelMass > 0 ? 1 : 0;
    if (ship.throttle < target) {
      ship.throttle = Math.min(target, ship.throttle + THROTTLE_UP_RATE * dt);
    } else if (ship.throttle > target) {
      ship.throttle = Math.max(target, ship.throttle - THROTTLE_DOWN_RATE * dt);
    }

    // Rotation with capped angular velocity and coast decay.
    const dir = (cmd.rotateRight ? 1 : 0) - (cmd.rotateLeft ? 1 : 0);
    if (dir !== 0) {
      ship.angularVelocity += dir * ANG_ACC * dt;
      if (ship.angularVelocity > ANG_MAX)  ship.angularVelocity = ANG_MAX;
      if (ship.angularVelocity < -ANG_MAX) ship.angularVelocity = -ANG_MAX;
    } else {
      ship.angularVelocity *= Math.pow(0.5, dt / ANG_DECAY_HALF_LIFE);
      if (Math.abs(ship.angularVelocity) < ANG_MIN_SNAP) ship.angularVelocity = 0;
    }

    ship.orientation += ship.angularVelocity * dt;
  }
}