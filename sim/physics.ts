import { Vec2 } from './vec2';
import { Body } from './body';
import { Ship } from './ship';
import { G } from './constants';

// Below this relative radial speed, contact is "resting" — no impact event fires.
export const IMPACT_EPSILON = 0.5; // m/s

// ---- Gravity ----

export function gravityAt(pos: Vec2, bodies: Body[]): Vec2 {
  let a = new Vec2();
  for (const b of bodies) {
    const d = b.position.sub(pos);
    const soft2 = Math.pow(0.01 * b.radius, 2); // per-body softening
    const r2 = d.mag2() + soft2;
    const g = (G * b.mass) / r2;
    a = a.add(d.norm().scale(g));
  }
  return a;
}

export function localG(pos: Vec2, bodies: Body[]): number {
  return gravityAt(pos, bodies).mag();
}

// ---- Weight & thrust-to-weight ----

export function weight(ship: Ship, bodies: Body[]): number {
  return ship.mass * localG(ship.position, bodies);
}

export function twr(ship: Ship, bodies: Body[], throttle = 1): number {
  const w = weight(ship, bodies);
  if (w === 0) return Infinity;
  return (ship.thrust * throttle) / w;
}

// ---- Body-level derived quantities ----

export function surfaceGravity(b: Body): number {
  return (G * b.mass) / (b.radius * b.radius);
}

export function escapeVelocity(b: Body): number {
  return Math.sqrt((2 * G * b.mass) / b.radius);
}

export function orbitalVelocity(b: Body, altitude = 0): number {
  return Math.sqrt((G * b.mass) / (b.radius + altitude));
}

// ---- Position & nearest body ----
// Widened shape — Ship still works, so does a lightweight { position, radius } probe.

export function altitude(
  ship: { position: Vec2; radius: number },
  b: Body
): number {
  return ship.position.sub(b.position).mag() - b.radius - ship.radius;
}

export function nearestBody(
  ship: { position: Vec2; radius: number },
  bodies: Body[]
): { body: Body; altitude: number } | null {
  let best: { body: Body; altitude: number } | null = null;
  for (const b of bodies) {
    const alt = altitude(ship, b);
    if (!best || alt < best.altitude) best = { body: b, altitude: alt };
  }
  return best;
}

// ---- Takeoff ----

export interface TakeoffResult {
  canLiftOff: boolean;
  twr: number;
  thrustN: number;
  weightN: number;
  surfaceG: number;
  escapeVelocity: number;
  orbitalVelocity: number;
}

export function canTakeOff(
  ship: Ship,
  bodies: Body[],
  throttle = 1
): TakeoffResult {
  const nb = nearestBody(ship, bodies);
  if (!nb) throw new Error('no bodies');
  const { body, altitude: alt } = nb;

  const g = localG(ship.position, bodies);
  const w = ship.mass * g;
  const t = ship.fuelMass > 0 ? ship.thrust * throttle : 0;

  return {
    canLiftOff: t > w,
    twr: w === 0 ? Infinity : t / w,
    thrustN: t,
    weightN: w,
    surfaceG: surfaceGravity(body),
    escapeVelocity: escapeVelocity(body),
    orbitalVelocity: orbitalVelocity(body, Math.max(0, alt)),
  };
}

// ---- Landing (predictive — call BEFORE stepShip) ----

export interface LandingResult {
  onSurface: boolean;
  altitude: number;
  impactSpeed: number;      // m/s, positive
  impactAngleDeg: number;   // 0 = head-on, 90 = grazing
  crashed: boolean;
  normal: Vec2;
}

export function checkLanding(ship: Ship, bodies: Body[]): LandingResult {
  const nb = nearestBody(ship, bodies);
  if (!nb) throw new Error('no bodies');
  const { body, altitude: alt } = nb;

  const normal = ship.position.sub(body.position).norm();
  const vRel = ship.velocity.sub(body.velocity);
  const vRadial = vRel.dot(normal);
  const impactSpeed = Math.max(0, -vRadial);

  // Angle is only meaningful when actually descending.
  const vTan = vRel.sub(normal.scale(vRadial));
  const angleDeg = impactSpeed > 1e-6
    ? Math.atan2(vTan.mag(), impactSpeed) * 180 / Math.PI
    : 0;

  const onSurface = alt <= 0;
  const crashed = onSurface && (
    impactSpeed > body.maxSafeLandingSpeed ||
    angleDeg > body.maxSafeLandingAngleDeg
  );

  return { onSurface, altitude: alt, impactSpeed, impactAngleDeg: angleDeg, crashed, normal };
}

// ---- Integration ----

export interface StepOptions {
  dt: number;
  substeps?: number;
}

export function stepShip(ship: Ship, bodies: Body[], opts: StepOptions): void {
  if (!Number.isFinite(opts.dt) || opts.dt <= 0) {
    throw new Error(`stepShip: dt must be > 0 (got ${opts.dt})`);
  }
  // Clear last-impact so this call reports only this step's contacts.
  ship.lastImpact = null;

  const requested = opts.substeps ?? Math.ceil(opts.dt / 0.02);
  const substeps = Math.max(1, Math.floor(requested));
  const h = opts.dt / substeps;

  for (let i = 0; i < substeps; i++) {
    const aGrav = gravityAt(ship.position, bodies);
    const aThrust = ship.thrustForce().scale(1 / ship.mass);
    const aTotal = aGrav.add(aThrust);

    ship.velocity = ship.velocity.add(aTotal.scale(h));
    ship.position = ship.position.add(ship.velocity.scale(h));

    ship.burnFuel(h);
    resolveGround(ship, bodies);
  }
}

// ---- Ground contact ----

export function resolveGround(ship: Ship, bodies: Body[]): void {
  for (const b of bodies) {
    const d = ship.position.sub(b.position);
    const dist = d.mag();
    const surface = b.radius + ship.radius;
    if (dist >= surface) continue;

    const n = dist > 0 ? d.norm() : new Vec2(0, 1);
    ship.position = b.position.add(n.scale(surface));

    // Work in the body's frame — moving planets must not fake a crash.
    const vRel = ship.velocity.sub(b.velocity);
    const vRadial = vRel.dot(n);

    // Record the impact BEFORE zeroing velocity. First impact this step wins.
    if (vRadial < -IMPACT_EPSILON && ship.lastImpact === null) {
      const impactSpeed = -vRadial;
      const vTanI = vRel.sub(n.scale(vRadial));
      const angleDeg = Math.atan2(vTanI.mag(), impactSpeed) * 180 / Math.PI;
      ship.lastImpact = {
        bodyName: b.name,
        speed: impactSpeed,
        angleDeg,
        crashed:
          impactSpeed > b.maxSafeLandingSpeed ||
          angleDeg > b.maxSafeLandingAngleDeg,
      };
    }

    // Zero any inward radial component so we don't sink into the surface.
    let vNew = vRel;
    if (vRadial < 0) vNew = vNew.sub(n.scale(vRadial));

    // Tangential friction — per-body.
    const vr2 = vNew.dot(n);
    const vt2 = vNew.sub(n.scale(vr2));
    vNew = n.scale(vr2).add(vt2.scale(b.surfaceFriction));

    ship.velocity = vNew.add(b.velocity);
  }
}