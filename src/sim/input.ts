import { ShipCommand } from './commands';

export interface KeyMap {
  thrust: string[];
  rotateLeft: string[];
  rotateRight: string[];
}

export const DEFAULT_KEY_MAP: Readonly<KeyMap> = Object.freeze({
  thrust: ['KeyW', 'Space', 'ArrowUp'],
  rotateLeft: ['KeyA', 'ArrowLeft'],
  rotateRight: ['KeyD', 'ArrowRight'],
});

const PREVENT_DEFAULT_CODES = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

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

  private anyDown(codes: string[]): boolean {
    for (const c of codes) {
      if (this.keys.has(c)) return true;
    }
    return false;
  }

  read(): ShipCommand {
    return {
      thrust: this.anyDown(this.map.thrust),
      rotateLeft: this.anyDown(this.map.rotateLeft),
      rotateRight: this.anyDown(this.map.rotateRight),
    };
  }
}
