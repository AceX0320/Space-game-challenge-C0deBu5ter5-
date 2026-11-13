import { Vec2 } from './vec2';

export interface Impact {
  bodyName: string;
  speed: number;        // m/s
  angleDeg: number;     // from surface normal
  crashed: boolean;
}

export class Ship {
  lastImpact: Impact | null = null;
  position: Vec2;
  velocity: Vec2;
  radius: number;

  dryMass = 1000;       // kg
  fuelMass = 800;       // kg
  cargoMass = 0;        // kg
  playerMass = 80;      // kg
  mass = 0;             // computed

  thrust = 40_000;      // N (max, at sea level of Earth-like)
  fuelBurnRate = 2.0;   // kg/s at full throttle
  throttle = 0;         // 0..1
  orientation = Math.PI / 2; // radians, "up"

  constructor(pos: Vec2, radius = 2) {
    this.position = pos.clone();
    this.velocity = new Vec2();
    this.radius = radius;
    this.updateMass();
  }

  updateMass() {
    this.mass = this.dryMass + this.fuelMass + this.cargoMass + this.playerMass;
  }

  thrustForce(): Vec2 {
    if (this.throttle <= 0 || this.fuelMass <= 0) return new Vec2();
    const dir = new Vec2(Math.cos(this.orientation), Math.sin(this.orientation));
    return dir.scale(this.thrust * this.throttle);
  }

  burnFuel(dt: number) {
    if (this.throttle <= 0 || this.fuelMass <= 0) return;
    this.fuelMass = Math.max(0, this.fuelMass - this.fuelBurnRate * this.throttle * dt);
    this.updateMass();
  }
}