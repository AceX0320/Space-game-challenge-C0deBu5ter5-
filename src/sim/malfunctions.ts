import type { Difficulty, MissionEvent, ShipDesign } from '@/types';
import { createRng, randPick } from '@/core/rng';
import { DEFAULT_FLAGS } from '@/config/feature-flags';

const MALFUNCTION_POOL: Array<{ kind: MissionEvent['kind']; text: string }> = [
  { kind: 'malfunction', text: 'Engine-out: one engine has shut down. Thrust reduced.' },
  { kind: 'malfunction', text: 'Sensor drift: HUD readings offset by ±15%. Trust your margins.' },
  { kind: 'malfunction', text: 'Power brownout: non-essential systems shut down temporarily.' },
  { kind: 'malfunction', text: 'Comms blackout: downlink interrupted. Data buffering locally.' },
  { kind: 'malfunction', text: 'Stuck gimbal: attitude control limited. Use RCS.' },
  { kind: 'malfunction', text: 'Fuel leak: slow propellant loss detected. Watch your Δv budget.' },
];

/**
 * Roll for random malfunctions during a mission.
 * Returns [] when malfunctions feature flag is off or difficulty is not 'hard'.
 * See concept file section 7 (Malfunctions — Hard mode only).
 * TODO(owner-1): integrate with real flight-sim to apply effects to ShipStats mid-flight.
 */
export function rollMalfunctions(
  design: ShipDesign,
  difficulty: Difficulty,
  seed: number
): MissionEvent[] {
  if (!DEFAULT_FLAGS.malfunctions || difficulty !== 'hard') return [];

  const rng = createRng(seed);
  const count = design.parts.length > 8 ? 2 : 1;
  const events: MissionEvent[] = [];
  for (let i = 0; i < count; i++) {
    const malfunction = randPick(rng, MALFUNCTION_POOL);
    const tS = 60 + Math.floor(rng() * 300); // random time 1–6 minutes in
    events.push({ tS, ...malfunction });
  }
  return events;
}
