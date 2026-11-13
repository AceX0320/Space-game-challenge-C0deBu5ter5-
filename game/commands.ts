/**
 * The only thing the game layer accepts as player input.
 *
 * The engine never reads the keyboard. It only reacts to this struct.
 * That keeps the physics layer testable from scripted inputs and keeps
 * keyboard handling swappable (keyboard now, gamepad later, replay files
 * eventually).
 */
export interface ShipCommand {
  /** Main engine held? Throttle ramps up while true, down while false. */
  thrust: boolean;
  /** Rotate counter-clockwise (in physics frame, +y is up). */
  rotateLeft: boolean;
  /** Rotate clockwise. */
  rotateRight: boolean;
}

/** Immutable "nothing pressed" command. Spread it to build a new one. */
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
 * so it can refresh the predicted trajectory immediately instead of waiting
 * for the next scheduled refresh.
 */
export function commandsEqual(a: ShipCommand, b: ShipCommand): boolean {
  return (
    a.thrust === b.thrust &&
    a.rotateLeft === b.rotateLeft &&
    a.rotateRight === b.rotateRight
  );
}