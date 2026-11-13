import { Vec2 } from './vec2';
import type { ShipStats } from '@/types';

export interface Impact {
  bodyName: string;
  speed: number; // m/s, positive
  angleDeg: number; // 0 = straight down onto surface, 90 = grazing
  crashed: boolean;
}

export class Ship {
  position: Vec2;
  velocity: Vec2;
  radius: number;

  dryMass = 1000; // kg
  fuelMass = 800; // kg
  cargoMass = 0; // kg
  playerMass = 80; // kg
  mass = 0; // computed by updateMass()

  thrust = 40_000; // N at full throttle
  fuelBurnRate = 2.0; // kg/s at full throttle
  throttle = 0; // 0..1
  orientation = Math.PI / 2; // radians, "up" at start
  angularVelocity = 0; // rad/s — driven by GameEngine.applyInput

  lastImpact: Impact | null = null;

  constructor(pos: Vec2 = new Vec2(), radius = 2) {
    this.position = pos.clone();
    this.velocity = new Vec2();
    this.radius = radius;
    this.updateMass();
  }

  updateMass(): void {
    const components: [string, number][] = [
      ['dryMass', this.dryMass],
      ['fuelMass', this.fuelMass],
      ['cargoMass', this.cargoMass],
      ['playerMass', this.playerMass],
    ];
    for (const [name, v] of components) {
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`Ship.${name} must be finite and >= 0 (got ${v})`);
      }
    }
    this.mass = this.dryMass + this.fuelMass + this.cargoMass + this.playerMass;
    if (this.mass <= 0) {
      throw new Error(`Ship mass must be > 0 (got ${this.mass})`);
    }
  }

  /** Force vector at current throttle & orientation. Zero if no fuel or throttle=0. */
  thrustForce(): Vec2 {
    if (this.throttle <= 0 || this.fuelMass <= 0) return new Vec2();
    const dir = new Vec2(Math.cos(this.orientation), Math.sin(this.orientation));
    return dir.scale(this.thrust * this.throttle);
  }

  /** Burns fuel for dt seconds at current throttle, then recomputes mass. */
  burnFuel(dt: number): void {
    if (this.throttle <= 0 || this.fuelMass <= 0) return;
    this.fuelMass = Math.max(0, this.fuelMass - this.fuelBurnRate * this.throttle * dt);
    this.updateMass();
  }

  /**
   * Instantiate a Ship from computed ShipStats.
   */
  static fromStats(stats: ShipStats, pos: Vec2 = new Vec2()): Ship {
    const ship = new Ship(pos, 2.5);
    ship.dryMass = Math.max(100, stats.dryMassKg);
    ship.fuelMass = Math.max(0, stats.fuelMassKg);
    ship.cargoMass = 0;
    ship.playerMass = 0;
    ship.thrust = stats.thrustN;

    // Estimate Isp from rocket equation or default to ~300s
    let isp = 300;
    if (stats.deltaVms > 0 && stats.fuelMassKg > 0 && stats.dryMassKg > 0) {
      const g0 = 9.80665;
      const massRatio = (stats.dryMassKg + stats.fuelMassKg) / stats.dryMassKg;
      if (massRatio > 1) {
        isp = stats.deltaVms / (g0 * Math.log(massRatio));
      }
    }
    ship.fuelBurnRate = stats.thrustN > 0 ? stats.thrustN / (Math.max(50, isp) * 9.80665) : 0;
    ship.updateMass();
    return ship;
  }
}
