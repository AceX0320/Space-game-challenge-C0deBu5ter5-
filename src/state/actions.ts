import { getStore } from './store';
import type { GamePhase, ShipDesign, ShipStats, TeamRole } from '@/types';
import { transitionTo } from './flow';

export function setPhase(phase: GamePhase): void {
  transitionTo(phase);
}

export function setActiveContract(contractId: string): void {
  getStore().update({ activeContractId: contractId });
}

export function updateDesign(design: ShipDesign, stats: ShipStats): void {
  getStore().update({ design, stats });
}

export function setTeamRole(role: TeamRole): void {
  const store = getStore();
  store.update({
    team: {
      ...store.getState().team,
      currentRole: role,
    },
  });
}

export function addDesignFlag(text: string): void {
  const store = getStore();
  const current = store.getState().team;
  const newFlag = {
    id: `flag-${Date.now()}`,
    role: current.currentRole,
    text,
    resolved: false,
    acceptedAsRisk: false,
  };
  store.update({
    team: {
      ...current,
      flags: [...current.flags, newFlag],
    },
  });
}

