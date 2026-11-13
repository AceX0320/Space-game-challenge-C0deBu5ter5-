import { describe, it, expect } from 'vitest';
import { Vec2 } from './vec2';
import { SimBody as Body } from './body';
import { Ship } from './ship';
import {
  localG,
  weight,
  twr,
  altitude,
  canTakeOff,
  checkLanding,
  stepShip,
  orbitalVelocity,
  escapeVelocity,
  surfaceGravity,
} from './physics';
import { EARTH_MASS, EARTH_RADIUS, MOON_MASS, MOON_RADIUS } from './constants';

describe('Physics Engine Core (from Game&engine branch)', () => {
  const earth = new Body({
    name: 'Earth',
    position: new Vec2(0, 0),
    radius: EARTH_RADIUS,
    mass: EARTH_MASS,
  });
  const moon = new Body({
    name: 'Moon',
    position: new Vec2(3.84e8, 0),
    radius: MOON_RADIUS,
    mass: MOON_MASS,
  });

  it('computes correct surface gravity and velocities for Earth', () => {
    const g = surfaceGravity(earth);
    expect(g).toBeCloseTo(9.82, 1);

    const vEsc = escapeVelocity(earth);
    expect(vEsc / 1000).toBeCloseTo(11.19, 1);

    const vOrb400 = orbitalVelocity(earth, 400e3);
    expect(vOrb400 / 1000).toBeCloseTo(7.67, 1);
  });

  it('evaluates takeoff conditions and TWR on pad', () => {
    const ship = new Ship(new Vec2(0, EARTH_RADIUS + 2));
    ship.thrust = 40_000;
    ship.orientation = Math.PI / 2;
    ship.throttle = 1;

    const padG = localG(ship.position, [earth]);
    expect(padG).toBeCloseTo(9.82, 1);

    const w = weight(ship, [earth]);
    expect(w).toBeGreaterThan(0);

    const currentTwr = twr(ship, [earth]);
    const takeoff = canTakeOff(ship, [earth]);
    expect(takeoff.twr).toBeCloseTo(currentTwr, 2);
  });

  it('steps ship trajectory and burns fuel', () => {
    const ship = new Ship(new Vec2(0, EARTH_RADIUS + 2));
    ship.thrust = 40_000;
    ship.orientation = Math.PI / 2;
    ship.throttle = 1;
    const initialMass = ship.mass;

    for (let i = 0; i < 60; i++) {
      stepShip(ship, [earth], { dt: 1 / 60 });
    }

    expect(ship.mass).toBeLessThan(initialMass);
    expect(altitude(ship, earth)).toBeGreaterThanOrEqual(0);
  });

  it('detects freefall impact on Moon surface', () => {
    const lunar = new Ship(new Vec2(3.84e8, MOON_RADIUS + 20));
    lunar.velocity = new Vec2(0, -10);
    lunar.thrust = 0;
    lunar.throttle = 0;

    let impacted = false;
    for (let i = 0; i < 60 * 10; i++) {
      stepShip(lunar, [earth, moon], { dt: 1 / 60 });
      if (lunar.lastImpact) {
        impacted = true;
        expect(lunar.lastImpact.bodyName).toBe('Moon');
        expect(lunar.lastImpact.speed).toBeGreaterThan(0);
        break;
      }
    }
    expect(impacted).toBe(true);
  });

  it('derives mass from density for unknown-weight body', () => {
    const mystery = new Body({
      name: 'Mystery',
      position: new Vec2(1e9, 0),
      radius: 4e6,
      density: 3500,
    });
    expect(mystery.mass).toBeGreaterThan(0);
    expect(surfaceGravity(mystery)).toBeCloseTo(3.91, 1);
  });

  it('predicts landing check prior to ground resolution', () => {
    const lander = new Ship(new Vec2(3.84e8, MOON_RADIUS + 50));
    lander.velocity = new Vec2(0, -5);
    const landing = checkLanding(lander, [moon]);
    expect(landing.altitude).toBeCloseTo(48, 0);
    expect(landing.impactSpeed).toBeCloseTo(5, 1);
  });
});
