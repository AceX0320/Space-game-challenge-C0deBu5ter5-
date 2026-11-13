import { Vec2 } from './vec2';
import { Body } from './body';
import { Ship } from './ship';
import {
  localG, weight, twr, altitude,
  canTakeOff, checkLanding, stepShip,
  orbitalVelocity, escapeVelocity, surfaceGravity,
} from './physics';
import { EARTH_MASS, EARTH_RADIUS, MOON_MASS, MOON_RADIUS, G } from './constants';

const earth = new Body({ name: 'Earth', position: new Vec2(0, 0), radius: EARTH_RADIUS, mass: EARTH_MASS });
const moon  = new Body({ name: 'Moon',  position: new Vec2(3.84e8, 0), radius: MOON_RADIUS, mass: MOON_MASS });

console.log('Earth surface g   :', surfaceGravity(earth).toFixed(3), 'm/s²');
console.log('Earth escape v    :', (escapeVelocity(earth) / 1000).toFixed(2), 'km/s');
console.log('Earth orbital 400 :', (orbitalVelocity(earth, 400e3) / 1000).toFixed(3), 'km/s');

// --- Scenario 1: Takeoff from Earth ---
const ship = new Ship(new Vec2(0, EARTH_RADIUS + 2));
ship.thrust = 40_000;
ship.orientation = Math.PI / 2;
ship.throttle = 1;

const padG = localG(ship.position, [earth]);
console.log('\nOn pad g          :', padG.toFixed(3), 'm/s²');
console.log('Ship mass         :', ship.mass, 'kg');
console.log('Weight on pad     :', weight(ship, [earth]).toFixed(0), 'N');
console.log('TWR               :', twr(ship, [earth]).toFixed(2));
console.log('canTakeOff        :', canTakeOff(ship, [earth]).canLiftOff);

for (let i = 0; i < 60 * 20; i++) stepShip(ship, [earth], { dt: 1 / 60 });

const nb = altitude(ship, earth);
console.log('After 20 s alt    :', (nb / 1000).toFixed(2), 'km');
console.log('Weight at alt     :', weight(ship, [earth]).toFixed(0), 'N');
console.log('Mass (fuel burned):', ship.mass.toFixed(1), 'kg');

// --- Scenario 2: Landing on Moon ---
// --- Scenario 2: Landing on Moon (freefall) ---
const lunar = new Ship(new Vec2(3.84e8, MOON_RADIUS + 50));
lunar.velocity = new Vec2(0, -10);
lunar.thrust = 0;
lunar.throttle = 0;

for (let i = 0; i < 60 * 10; i++) {
  stepShip(lunar, [earth, moon], { dt: 1 / 60 });
  if (lunar.lastImpact) {
    console.log('\nImpacted:', lunar.lastImpact.bodyName);
    console.log('Impact speed   :', lunar.lastImpact.speed.toFixed(2), 'm/s');
    console.log('Impact angle   :', lunar.lastImpact.angleDeg.toFixed(2), '°');
    console.log('Crashed        :', lunar.lastImpact.crashed);
    break;
  }
}

// --- Scenario 3: unknown-mass planet ---
const mystery = new Body({
  name: 'Mystery',
  position: new Vec2(1e9, 0),
  radius: 4e6,
  density: 3500,         // no mass given → derived
});
console.log('\nMystery mass (kg) :', mystery.mass.toExponential(3));
console.log('Mystery surface g :', surfaceGravity(mystery).toFixed(3), 'm/s²');

// --- Scenario 4: solar-system gravity ---
const between = new Vec2(1.9e8, 0);  // roughly between Earth and Moon
const gBoth = localG(between, [earth, moon]);
console.log('\ng between Earth/Moon:', gBoth.toExponential(3), 'm/s²');