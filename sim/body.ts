import { Vec2 } from './vec2';
import { DEFAULT_DENSITY } from './constants';

export class Body {
  name: string;
  position: Vec2;
  velocity: Vec2;
  radius: number;   // m
  mass: number;     // kg

  constructor(p: {
    name: string;
    position: Vec2;
    velocity?: Vec2;
    radius: number;
    mass?: number;         // optional — if missing, derived from density
    density?: number;      // kg/m³
  }) {
    this.name = p.name;
    this.position = p.position.clone();
    this.velocity = (p.velocity ?? new Vec2()).clone();
    this.radius = p.radius;

    if (p.mass != null) {
      this.mass = p.mass;
    } else {
      const rho = p.density ?? DEFAULT_DENSITY;
      // 3D sphere mass from radius; 2D rendering still works.
      this.mass = rho * (4 / 3) * Math.PI * Math.pow(p.radius, 3);
    }
  }
}