import type { AtmosphereSpec } from '@/types';

/**
 * Compute atmospheric density at a given altitude using the barometric formula.
 * Returns 0 if the body has no atmosphere.
 * Source: standard exponential atmosphere model (game simplification).
 */
export function atmosphericDensity(spec: AtmosphereSpec | null, altitudeM: number): number {
  if (!spec) return 0;
  return spec.surfaceDensityKgM3 * Math.exp(-altitudeM / spec.scaleHeightM);
}

/**
 * Compute aerodynamic drag force (N).
 * F_drag = 0.5 * rho * v^2 * Cd * A
 * Cd assumed 1.0 (blunt body approximation, game value).
 */
export function dragForce(
  density: number,
  speedMs: number,
  dragAreaM2: number,
  cd = 1.0
): number {
  return 0.5 * density * speedMs * speedMs * cd * dragAreaM2;
}

/**
 * Compute entry heating rate (W/m²) — simplified.
 * Grows with density and speed^3 (game approximation).
 */
export function heatingRate(density: number, speedMs: number): number {
  return 1.7415e-4 * Math.sqrt(density) * Math.pow(Math.abs(speedMs), 3);
}
