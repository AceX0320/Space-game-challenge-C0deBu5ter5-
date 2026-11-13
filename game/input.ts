import { ShipCommand } from './commands';

/**
 * Which physical keys (KeyboardEvent.code) map to which action.
 * `code` is layout-independent and modifier-independent — the right choice
 * for games. (e.key gives 'w'/'W'/'z' depending on layout and shift.)
 */
export interface KeyMap {
  thrust: string[];
  rotateLeft: string[];
  rotateRight: string[];
}

export const DEFAULT_KEY_MAP: Readonly<KeyMap> = Object.freeze({
  thrust:      ['KeyW', 'Space'],
  rotateLeft:  ['KeyA', 'ArrowLeft'],
  rotateRight: ['KeyD', 'ArrowRight'],
});

/** Codes whose default browser action (scrolling) we suppress while attached. */
const PREVENT_DEFAULT_CODES = new Set([
  'Space',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
]);

/**
 * Keyboard → ShipCommand adapter.
 *
 * Lifecycle:
 *   const input = new KeyboardInput();
 *   input.attach();           // on mount
 *   … engine.update(dt, input.read()) …
 *   input.detach();           // on unmount
 *
 * Behaviour:
 *   - Tracks physical keys down (Set of KeyboardEvent.code).
 *   - Clears all keys on window blur to prevent "stuck thrust" after alt-tab.
 *   - Suppresses page-scroll for Space/Arrows only.
 *   - attach()/detach() are idempotent.
 *
 * Does not implement throttle ramp, deadzones, or any gameplay logic.
 * That belongs in the engine's applyInput().
 */
export class KeyboardInput {
  private readonly keys = new Set<string>();
  private attached = false;
  private map: KeyMap;
  private target: Window;

  private readonly handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private readonly handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private readonly handleBlur = () => {
    this.keys.clear();
  };

  constructor(target: Window = window, map: KeyMap = DEFAULT_KEY_MAP) {
    this.target = target;
    this.map = map;
  }

  attach(): void {
    if (this.attached) return;
    this.target.addEventListener('keydown', this.handleKeyDown);
    this.target.addEventListener('keyup', this.handleKeyUp);
    this.target.addEventListener('blur', this.handleBlur);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('blur', this.handleBlur);
    this.keys.clear();
    this.attached = false;
  }

  /** True if any of the codes for `action` are currently held. */
  private anyDown(codes: string[]): boolean {
    for (const c of codes) {
      if (this.keys.has(c)) return true;
    }
    return false;
  }

  /** Build a fresh command from the current keyboard state. */
  read(): ShipCommand {
    return {
      thrust:      this.anyDown(this.map.thrust),
      rotateLeft:  this.anyDown(this.map.rotateLeft),
      rotateRight: this.anyDown(this.map.rotateRight),
    };
  }
}