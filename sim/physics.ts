import { Vec2 } from './vec2';
import { Body } from './body';
import { Ship } from './ship';
import { G } from './constants';

// ---- 1. Gravity ----

/** Total gravitational acceleration at `pos` from all bodies. */
export function gravityAt(pos: Vec2, bodies: Body[]): Vec2 {
  let a = new Vec2();
  for (const b of bodies) {
    const d = b.position.sub(pos);
    const soft2 = Math.pow(0.01 * b.radius, 2);   // per-body softening
    const r2 = d.mag2() + soft2;
    const g = (G * b.mass) / r2;
    a = a.add(d.norm().scale(g));
  }
  return a;
}

/** Gravity magnitude at `pos` — used for HUD & takeoff/landing checks. */
export function localG(pos: Vec2, bodies: Body[]): number {
  return gravityAt(pos, bodies).mag();
}

// ---- 2. Weight ----

/** Weight = current ship mass × local g. Changes with fuel/cargo/player. */
export function weight(ship: Ship, bodies: Body[]): number {
  return ship.mass * localG(ship.position, bodies);
}

// ---- 3. Thrust-to-Weight ----

/**
 * TWR = thrust / weight.
 * TWR > 1  → can lift off.
 * TWR = 1  → hover.
 * TWR < 1  → cannot leave surface.
 */
export function twr(ship: Ship, bodies: Body[], throttle = 1): number {
  const w = weight(ship, bodies);
  if (w === 0) return Infinity;
  return (ship.thrust * throttle) / w;
}

// ---- 4. Orbit helpers (very useful for takeoff target) ----

export function surfaceGravity(b: Body): number {
  return (G * b.mass) / (b.radius * b.radius);
}

export function escapeVelocity(b: Body): number {
  return Math.sqrt((2 * G * b.mass) / b.radius);
}

export function orbitalVelocity(b: Body, altitude = 0): number {
  return Math.sqrt((G * b.mass) / (b.radius + altitude));
}

// ---- 5. Altitude & surface ----

export function altitude(ship: Ship, b: Body): number {
  return ship.position.sub(b.position).mag() - b.radius - ship.radius;
}

/** Nearest body (by altitude below other bodies' surfaces). */
export function nearestBody(ship: Ship, bodies: Body[]): { body: Body; altitude: number } | null {
  let best: { body: Body; altitude: number } | null = null;
  for (const b of bodies) {
    const alt = altitude(ship, b);
    if (!best || alt < best.altitude) best = { body: b, altitude: alt };
  }
  return best;
}

// ---- 6. Takeoff check ----

export interface TakeoffResult {
  canLiftOff: boolean;
  twr: number;
  thrustN: number;
  weightN: number;
  surfaceG: number;
  escapeVelocity: number;
  orbitalVelocity: number;
}

export function canTakeOff(ship: Ship, bodies: Body[], throttle = 1): TakeoffResult {
  const nb = nearestBody(ship, bodies);
  if (!nb) throw new Error('no bodies');
  const { body, altitude: alt } = nb;

  const g = localG(ship.position, bodies);
  const w = ship.mass * g;
  const t = ship.fuelMass > 0 ? ship.thrust * throttle : 0;   // ← fix

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

// ---- 7. Landing check ----

export const MAX_SAFE_LANDING_SPEED = 20; // m/s — tune per planet
export const MAX_SAFE_LANDING_ANGLE_DEG = 30;

export interface LandingResult {
  onSurface: boolean;
  altitude: number;
  impactSpeed: number;          // m/s, radial component toward surface
  impactAngleDeg: number;       // angle from surface normal
  crashed: boolean;
  normal: Vec2;                 // outward surface normal
}

export function checkLanding(ship: Ship, bodies: Body[]): LandingResult {
  const nb = nearestBody(ship, bodies);
  if (!nb) throw new Error('no bodies');
  const { body, altitude: alt } = nb;

  const normal = ship.position.sub(body.position).norm();
  const vRel = ship.velocity.sub(body.velocity);          // ← NEW: relative velocity
  const vRadial = vRel.dot(normal);                        // negative = toward surface
  const impactSpeed = Math.max(0, -vRadial);

  const vTan = vRel.sub(normal.scale(vRadial));            // ← uses vRel now
  const angleDeg = Math.atan2(vTan.mag(), Math.abs(vRadial)) * 180 / Math.PI;

  const onSurface = alt <= 0;
  const crashed = onSurface && (
    impactSpeed > MAX_SAFE_LANDING_SPEED ||
    angleDeg > MAX_SAFE_LANDING_ANGLE_DEG
  );

  return { onSurface, altitude: alt, impactSpeed, impactAngleDeg: angleDeg, crashed, normal };
}

// ---- 8. Integration step (pure, no world class needed) ----

export interface StepOptions {
  dt: number;
  substeps?: number;
}

export function stepShip(ship: Ship, bodies: Body[], opts: StepOptions) {
  const substeps = opts.substeps ?? Math.max(1, Math.ceil(opts.dt / 0.02));
  const h = opts.dt / substeps;

  for (let i = 0; i < substeps; i++) {
    // 1. gravity from all bodies
    const aGrav = gravityAt(ship.position, bodies);

    // 2. thrust (mass can be changed by burnFuel, so compute after)
    const aThrust = ship.thrustForce().scale(1 / ship.mass);

    // 3. total acceleration
    const aTotal = aGrav.add(aThrust);

    // 4. semi-implicit Euler (fine for gameplay; velocity Verlet better for pure orbits)
    ship.velocity = ship.velocity.add(aTotal.scale(h));
    ship.position = ship.position.add(ship.velocity.scale(h));

    // 5. fuel burn changes mass
    ship.burnFuel(h);

    // 6. ground contact
    resolveGround(ship, bodies);
  }
}

// ---- 9. Ground contact ----

export function resolveGround(ship: Ship, bodies: Body[]) {
  for (const b of bodies) {
    const d = ship.position.sub(b.position);
    const dist = d.mag();
    const surface = b.radius + ship.radius;
    if (dist >= surface) continue;

    const n = dist > 0 ? d.norm() : new Vec2(0, 1);
    ship.position = b.position.add(n.scale(surface));

    // Work in the body's frame so a moving planet doesn't fake a crash.
    const vRel = ship.velocity.sub(b.velocity);
const vRadial = vRel.dot(n);

// Capture impact data BEFORE zeroing velocity — this is the actual contact event.
if (vRadial < 0) {
  const impactSpeed = -vRadial;
  const vTanImpact = vRel.sub(n.scale(vRadial));
  const angleDeg = Math.atan2(vTanImpact.mag(), impactSpeed) * 180 / Math.PI;
  ship.lastImpact = {
    bodyName: b.name,
    speed: impactSpeed,
    angleDeg,
    crashed:
      impactSpeed > MAX_SAFE_LANDING_SPEED ||
      angleDeg > MAX_SAFE_LANDING_ANGLE_DEG,
  };
}

let vNew = vRel;
if (vRadial < 0) vNew = vNew.sub(n.scale(vRadial));

const vRadialResolved = vNew.dot(n);
const vTanResolved = vNew.sub(n.scale(vRadialResolved));
vNew = n.scale(vRadialResolved).add(vTanResolved.scale(0.98));

ship.velocity = vNew.add(b.velocity);
}
}