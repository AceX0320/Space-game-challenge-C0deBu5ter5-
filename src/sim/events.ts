import type { Impact } from './ship';

/**
 * Per-frame event signals produced by the simulation engine.
 * One-shot: true only in the frame the event fired, false otherwise.
 */
export interface ShipEvents {
  /** Fuel hit 0 this frame (was > 0 last frame). Fires once per fuel-exhaustion. */
  fuelEmpty: boolean;

  /** Ship made contact with a body and the impact was under its safe threshold. */
  landed: boolean;

  /** Ship made contact with a body and exceeded its safe speed or angle. */
  crashed: boolean;

  /** Ship escaped the local gravity well. Reserved. */
  escaped: boolean;

  /**
   * Raw impact data for this frame, if any.
   */
  impact: Impact | null;
}

/**
 * Fresh events struct with everything cleared.
 */
export function emptyEvents(): ShipEvents {
  return {
    fuelEmpty: false,
    landed: false,
    crashed: false,
    escaped: false,
    impact: null,
  };
}

/**
 * True if any event fired this frame.
 */
export function hasAny(events: ShipEvents): boolean {
  return (
    events.fuelEmpty || events.landed || events.crashed || events.escaped || events.impact !== null
  );
}
