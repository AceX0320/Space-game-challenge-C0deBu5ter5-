import { Impact } from '../sim/ship';

/**
 * Per-frame event signals produced by the engine.
 *
 * Lifecycle:
 *   - `emptyEvents()` is called at the start of every `GameEngine.update()`.
 *   - `engine.foldEvents()` populates whatever fired during that update.
 *   - The caller reads them and then the next `update()` replaces the struct.
 *
 * Flags are one-shot: true in exactly the frame the event occurred, false
 * otherwise. There is no queue and no ordering — if you need to log events
 * over time, snapshot them into your own list inside the game loop.
 */
export interface ShipEvents {
  /** Fuel hit 0 this frame (was > 0 last frame). Fires once per fuel-exhaustion. */
  fuelEmpty: boolean;

  /** Ship made contact with a body and the impact was under its safe threshold. */
  landed: boolean;

  /** Ship made contact with a body and exceeded its safe speed or angle. */
  crashed: boolean;

  /**
   * Ship escaped the local gravity well. Reserved — the engine does not set
   * this yet; criterion TBD (distance? velocity?). Always false until wired up.
   */
  escaped: boolean;

  /**
   * Raw impact data for this frame, if any. Non-null implies exactly one of
   * `landed` / `crashed` is true.
   */
  impact: Impact | null;
}

/**
 * Fresh events struct with everything cleared. Call once per frame BEFORE
 * folding new events in — do not reuse the previous frame's struct.
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
 * True if any event fired this frame. Use as an early-out in the game loop
 * before inspecting individual flags.
 */
export function hasAny(events: ShipEvents): boolean {
  return (
    events.fuelEmpty ||
    events.landed ||
    events.crashed ||
    events.escaped ||
    events.impact !== null
  );
}