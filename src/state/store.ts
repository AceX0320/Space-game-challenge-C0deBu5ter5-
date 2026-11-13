import type {
  DesignFlag,
  GamePhase,
  MissionReport,
  MissionResult,
  PayoutResult,
  SaveGame,
  ShipDesign,
  ShipStats,
  TeamRole,
} from '@/types';
import type { FeatureFlags } from '@/config/feature-flags';
import { DEFAULT_FLAGS } from '@/config/feature-flags';
import { loadSave, newSave } from '@/economy/save-load';
import { mockDesign } from '@/mocks/mock-design';
import { mockShipStats } from '@/mocks/mock-ship-stats';

export interface TeamState {
  currentRole: TeamRole;
  flags: DesignFlag[];
}

export interface GameState {
  phase: GamePhase;
  save: SaveGame;
  activeContractId: string;
  design: ShipDesign;
  stats: ShipStats;
  missionResult: MissionResult | null;
  payout: PayoutResult | null;
  report: MissionReport | null;
  team: TeamState;
  flags: FeatureFlags;
}

export type Listener = (state: GameState) => void;

class Store {
  private state: GameState;
  private listeners = new Set<Listener>();

  constructor(initialFlags: FeatureFlags = DEFAULT_FLAGS) {
    const save = loadSave() ?? newSave('normal');
    this.state = {
      phase: 'home',
      save,
      activeContractId: 'first-light',
      design: mockDesign,
      stats: mockShipStats,
      missionResult: null,
      payout: null,
      report: null,
      team: {
        currentRole: 'director',
        flags: [],
      },
      flags: initialFlags,
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public update(partial: Partial<GameState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

let storeInstance: Store | null = null;

export function initStore(flags: FeatureFlags = DEFAULT_FLAGS): Store {
  storeInstance = new Store(flags);
  return storeInstance;
}

export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = new Store();
  }
  return storeInstance;
}

