import { Vec2 } from './vec2';
import {
  DEFAULT_DENSITY,
  G,
  MOON_RADIUS,
  MARS_RADIUS,
  VENUS_RADIUS,
  TITAN_RADIUS,
} from './constants';
import type { Body as GameBody } from '@/types';

export interface BodyInit {
  name: string;
  position: Vec2;
  velocity?: Vec2;
  radius: number; // m, required
  mass?: number; // kg — if omitted, derived from density × volume
  density?: number; // kg/m³ — used when mass omitted; defaults to DEFAULT_DENSITY
  maxSafeLandingSpeed?: number; // m/s, default 20
  maxSafeLandingAngleDeg?: number; // degrees from surface normal, default 30
  surfaceFriction?: number; // per-step tangential multiplier, default 0.98
}

export class SimBody {
  name: string;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  mass: number;

  maxSafeLandingSpeed: number;
  maxSafeLandingAngleDeg: number;
  surfaceFriction: number;

  constructor(p: BodyInit) {
    if (!p.name || typeof p.name !== 'string') {
      throw new Error('Body.name is required and must be a non-empty string');
    }
    if (!Number.isFinite(p.radius) || p.radius <= 0) {
      throw new Error(`Body ${p.name}: radius must be a positive finite number (got ${p.radius})`);
    }

    this.name = p.name;
    this.position = p.position.clone();
    this.velocity = (p.velocity ?? new Vec2()).clone();
    this.radius = p.radius;

    if (p.mass != null) {
      if (!Number.isFinite(p.mass) || p.mass <= 0) {
        throw new Error(`Body ${p.name}: mass must be > 0 when provided (got ${p.mass})`);
      }
      this.mass = p.mass;
    } else {
      const rho = p.density ?? DEFAULT_DENSITY;
      if (!Number.isFinite(rho) || rho <= 0) {
        throw new Error(`Body ${p.name}: density must be > 0 (got ${rho})`);
      }
      // Solid sphere: m = ρ · (4/3)πr³
      this.mass = rho * (4 / 3) * Math.PI * Math.pow(p.radius, 3);
    }

    this.maxSafeLandingSpeed = p.maxSafeLandingSpeed ?? 20;
    this.maxSafeLandingAngleDeg = p.maxSafeLandingAngleDeg ?? 30;
    this.surfaceFriction = p.surfaceFriction ?? 0.98;

    if (!Number.isFinite(this.maxSafeLandingSpeed) || this.maxSafeLandingSpeed <= 0) {
      throw new Error(`Body ${p.name}: maxSafeLandingSpeed must be > 0`);
    }
    if (!Number.isFinite(this.maxSafeLandingAngleDeg) || this.maxSafeLandingAngleDeg <= 0) {
      throw new Error(`Body ${p.name}: maxSafeLandingAngleDeg must be > 0`);
    }
    if (
      !Number.isFinite(this.surfaceFriction) ||
      this.surfaceFriction < 0 ||
      this.surfaceFriction > 1
    ) {
      throw new Error(`Body ${p.name}: surfaceFriction must be in [0, 1]`);
    }
  }

  /**
   * Create a SimBody from a high-level GameBody definition.
   * Mass is mathematically derived so surface gravity matches body.gravityMs2 exactly:
   * g = G * M / R^2  =>  M = g * R^2 / G
   */
  static fromGameBody(
    body: GameBody,
    position: Vec2 = new Vec2(0, 0),
    limits?: { maxVyMs?: number; maxTiltDeg?: number }
  ): SimBody {
    let radius = MOON_RADIUS;
    const id = body.id.toLowerCase();
    if (id === 'mars') radius = MARS_RADIUS;
    else if (id === 'venus') radius = VENUS_RADIUS;
    else if (id === 'titan') radius = TITAN_RADIUS;
    else if (id === 'asteroid') radius = 50_000;

    // Derived mass ensures exact surface gravity match
    const mass = (body.gravityMs2 * Math.pow(radius, 2)) / G;

    return new SimBody({
      name: body.name,
      position,
      radius,
      mass,
      maxSafeLandingSpeed: limits?.maxVyMs ?? 6,
      maxSafeLandingAngleDeg: limits?.maxTiltDeg ?? 15,
      surfaceFriction: 0.95,
    });
  }
}

// Alias for internal sim usage
export { SimBody as Body };
