import { Vec2 } from '../sim/vec2';
import { Body } from '../sim/body';
import { Ship } from '../sim/ship';
import { gravityAt, nearestBody } from '../sim/physics';
import { Trajectory, TrajectoryImpact } from './state';

export interface TrajectoryOptions {
  /** Total preview window in seconds. Default 60. */
  horizon?: number;
  /** Number of evenly-spaced sample points. Default 180. */
  points?: number;
  /** Internal integration step in seconds. Default 0.05. */
  physicsDt?: number;
  /** If true, hold the ship's *current* throttle as constant thrust. Default false. */
  includeThrust?: boolean;
}

const DEFAULTS = {
  horizon: 60,
  points: 180,
  physicsDt: 0.05,
  includeThrust: false,
};

/** Max distance the probe may travel per sub-step before dt is shrunk (avoids tunneling). */
const MAX_TRAVEL_PER_STEP = 5; // meters

/** Upper bound on sub-steps per sampled point (bounds cost at high speed). */
const MAX_STEPS_PER_POINT = 50;

/**
 * Predict the ship's trajectory from its current state.
 *
 * Uses the same integrator as `stepShip` (semi-implicit Euler + gravityAt),
 * so the returned path reflects what the game will actually do — subject only
 * to the coarser `physicsDt` and the sub-step cap.
 *
 * Returned `points[0]` is always the ship's current position. The path
 * terminates either at `horizon` (impact === null) or at the first contact
 * with a body (impact !== null, last point == contact point).
 *
 * Does not mutate `ship` or `bodies`.
 */
export function predictTrajectory(
  ship: Ship,
  bodies: Body[],
  opts: TrajectoryOptions = {}
): Trajectory {
  const horizon = opts.horizon ?? DEFAULTS.horizon;
  const nPoints = opts.points ?? DEFAULTS.points;
  const userDt = opts.physicsDt ?? DEFAULTS.physicsDt;
  const thrustOn = opts.includeThrust ?? DEFAULTS.includeThrust;

  if (!Number.isFinite(horizon) || horizon <= 0) {
    throw new Error(`predictTrajectory: horizon must be > 0 (got ${horizon})`);
  }
  if (!Number.isInteger(nPoints) || nPoints < 2) {
    throw new Error(`predictTrajectory: points must be an integer >= 2 (got ${nPoints})`);
  }
  if (!Number.isFinite(userDt) || userDt <= 0) {
    throw new Error(`predictTrajectory: physicsDt must be > 0 (got ${userDt})`);
  }

  const dtPerPoint = horizon / nPoints;

  // Constant acceleration from current throttle over the whole preview.
  const thrustAcc = thrustOn
    ? ship.thrustForce().scale(1 / ship.mass)
    : new Vec2();

  // Adaptive sub-step: shrink dt when the ship is moving fast so small bodies
  // aren't tunneled through. Cap to keep per-call cost bounded.
  const speed = ship.velocity.mag();
  const safeDt = speed > 0 ? MAX_TRAVEL_PER_STEP / speed : userDt;
  const physicsDt = Math.min(userDt, safeDt);
  const stepsPerPoint = Math.min(
    MAX_STEPS_PER_POINT,
    Math.max(1, Math.round(dtPerPoint / physicsDt))
  );
  const dt = dtPerPoint / stepsPerPoint;

  let pos = ship.position.clone();
  let vel = ship.velocity.clone();
  let elapsed = 0;

  const points: Vec2[] = [pos.clone()];
  // Reused probe — nearestBody only reads .position and .radius.
  const probe: { position: Vec2; radius: number } = {
    position: pos,
    radius: ship.radius,
  };

  for (let p = 0; p < nPoints; p++) {
    for (let s = 0; s < stepsPerPoint; s++) {
      const a = gravityAt(pos, bodies).add(thrustAcc);
      vel = vel.add(a.scale(dt));
      pos = pos.add(vel.scale(dt));
      elapsed += dt;
      probe.position = pos;

      const nb = nearestBody(probe, bodies);
      if (nb && nb.altitude <= 0) {
        points.push(pos.clone());
        return {
          points,
          impact: computeImpact(pos, vel, nb.body, elapsed),
          horizon,
        };
      }
    }
    points.push(pos.clone());
  }

  return { points, impact: null, horizon };
}

/** Compute impact data at the moment of contact. Mirrors resolveGround in physics.ts. */
function computeImpact(
  pos: Vec2,
  vel: Vec2,
  body: Body,
  timeToImpact: number
): TrajectoryImpact {
  const normal = pos.sub(body.position).norm();
  const vRel = vel.sub(body.velocity);
  const vRadial = vRel.dot(normal);
  const impactSpeed = Math.max(0, -vRadial);
  const vTan = vRel.sub(normal.scale(vRadial));
  const angleDeg = impactSpeed > 1e-6
    ? Math.atan2(vTan.mag(), impactSpeed) * 180 / Math.PI
    : 0;

  return {
    body,
    timeToImpact,
    impactSpeed,
    impactAngleDeg: angleDeg,
  };
}