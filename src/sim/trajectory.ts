import { Vec2 } from './vec2';
import { SimBody as Body } from './body';
import { Ship } from './ship';
import { gravityAt, nearestBody } from './physics';

export interface TrajectoryImpact {
  body: Body;
  /** Seconds from "now" until predicted contact. */
  timeToImpact: number;
  /** Predicted relative radial speed at contact, m/s, positive. */
  impactSpeed: number;
  /** Predicted impact angle from surface normal, degrees. */
  impactAngleDeg: number;
}

export interface Trajectory {
  points: Vec2[];
  impact: TrajectoryImpact | null;
  /** Total time span of the prediction, in seconds. */
  horizon: number;
}

export function emptyTrajectory(horizon = 0): Trajectory {
  return { points: [], impact: null, horizon };
}

export interface TrajectoryOptions {
  /** Total preview window in seconds. Default 60. */
  horizon?: number;
  /** Number of evenly-spaced sample points. Default 180. */
  points?: number;
  /** Internal integration step in seconds. Default 0.05. */
  physicsDt?: number;
  /** If true, hold the ship's current throttle as constant thrust. Default false. */
  includeThrust?: boolean;
}

const DEFAULTS = {
  horizon: 60,
  points: 180,
  physicsDt: 0.05,
  includeThrust: false,
};

const MAX_TRAVEL_PER_STEP = 5; // meters
const MAX_STEPS_PER_POINT = 50;

/**
 * Predict the ship's trajectory from its current state.
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
  const thrustAcc = thrustOn ? ship.thrustForce().scale(1 / ship.mass) : new Vec2();

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

function computeImpact(pos: Vec2, vel: Vec2, body: Body, timeToImpact: number): TrajectoryImpact {
  const normal = pos.sub(body.position).norm();
  const vRel = vel.sub(body.velocity);
  const vRadial = vRel.dot(normal);
  const impactSpeed = Math.max(0, -vRadial);
  const vTan = vRel.sub(normal.scale(vRadial));
  const angleDeg = impactSpeed > 1e-6 ? (Math.atan2(vTan.mag(), impactSpeed) * 180) / Math.PI : 0;

  return {
    body,
    timeToImpact,
    impactSpeed,
    impactAngleDeg: angleDeg,
  };
}
