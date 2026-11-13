import { Body } from '../sim/body';
import { Ship } from '../sim/ship';
import { Vec2 } from '../sim/vec2';
import { ShipEvents } from './events';

/**
 * Where and when the predicted path hits something.
 * `body` is the full reference so the HUD can draw a marker at its position.
 */
export interface TrajectoryImpact {
  body: Body;
  /** Seconds from "now" (state.time) until predicted contact. */
  timeToImpact: number;
  /** Predicted relative radial speed at contact, m/s, positive. */
  impactSpeed: number;
  /** Predicted impact angle from surface normal, degrees. */
  impactAngleDeg: number;
}

/**
 * Sampled predicted trajectory from the ship's current state.
 *
 * `points[0]` is the ship's current position; subsequent points are evenly
 * spaced in time up to `horizon`. If an impact occurs within the horizon,
 * the last point is the predicted contact point and `impact` is non-null.
 * If neither impact nor horizon is reached (rare), points simply stop.
 */
export interface Trajectory {
  points: Vec2[];
  impact: TrajectoryImpact | null;
  /** Total time span of the prediction, in seconds. */
  horizon: number;
}

/** A trajectory with no data. Use when there's nothing to predict (no bodies, etc.). */
export function emptyTrajectory(horizon = 0): Trajectory {
  return { points: [], impact: null, horizon };
}

/**
 * The full world state. The engine mutates this in place; everyone else
 * treats it as read-only. If you need to diff frames, snapshot the fields
 * you care about inside your game loop — do not hold onto `GameState` and
 * expect it to be a historical record.
 *
 * `bodies` and `ship` are the same instances you passed into `new GameEngine`.
 * The engine mutates `ship` (position, velocity, fuel, …) in place, and does
 * not mutate `Body` (bodies are static terrain in the current scope).
 */
export interface GameState {
  /** Static terrain / celestial bodies. Do not mutate from outside the engine. */
  bodies: Body[];

  /** Player ship. Engine mutates this in place each tick. */
  ship: Ship;

  /** Optional reference body for relative HUD data. Null disables relative readouts. */
  target: Body | null;

  /** Simulation time in seconds. Monotonic; frozen while paused. */
  time: number;

  /** Latest predicted trajectory. Always non-null; may have empty `points`. */
  trajectory: Trajectory;

  /**
   * Events that fired during the most recent `engine.update()` call.
   * Same object as the return value of `update()`. Replaced every tick.
   */
  events: ShipEvents;

  /** When true, `engine.update()` returns immediately without stepping. */
  paused: boolean;
}