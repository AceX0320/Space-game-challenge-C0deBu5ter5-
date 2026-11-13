/**
 * The input structure the flight simulation and engine accept.
 * Separates "what the player wants" from "how the keyboard reports it."
 */
export interface ShipCommand {
  /** Main engine held? Throttle ramps up while true, down while false. */
  thrust: boolean;
  /** Rotate counter-clockwise (in physics frame, +y is up). */
  rotateLeft: boolean;
  /** Rotate clockwise. */
  rotateRight: boolean;
}

/** Immutable "nothing pressed" command. Safe to spread. */
export const EMPTY_COMMAND: Readonly<ShipCommand> = Object.freeze({
  thrust: false,
  rotateLeft: false,
  rotateRight: false,
});

/** Fresh mutable command with all flags false. */
export function emptyCommand(): ShipCommand {
  return { thrust: false, rotateLeft: false, rotateRight: false };
}

/**
 * Structural equality. Used by the engine to detect "input changed this frame"
 * so it can refresh predicted trajectory immediately.
 */
export function commandsEqual(a: ShipCommand, b: ShipCommand): boolean {
  return a.thrust === b.thrust && a.rotateLeft === b.rotateLeft && a.rotateRight === b.rotateRight;
}
