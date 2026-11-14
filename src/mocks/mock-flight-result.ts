import type { FlightResult } from '@/types';

export const mockFlightResult: FlightResult = {
  outcome: 'soft',
  partUsage: {},
  touchdownStress: 0.1,
  landingRing: 5, // Bullseye!
  distanceFromTargetM: 14.2,
  touchdownVyMs: -1.8,
  touchdownVxMs: 0.4,
  touchdownTiltDeg: 2.1,
  fuelLeftKg: 420,
  ascentFuelUsedPct: 22.0,
  corrections: 3,
  events: [
    { tS: 0, kind: 'milestone', text: 'Liftoff confirmed from launch site.' },
    { tS: 85, kind: 'info', text: 'Ascent phase completed. Trajectory nominal.' },
    { tS: 240, kind: 'milestone', text: 'Lunar orbit insertion burn successful.' },
    { tS: 410, kind: 'info', text: 'Powered descent initiated at 15km altitude.' },
    { tS: 580, kind: 'milestone', text: 'Touchdown! Spacecraft safely on the surface.' },
  ],
};
