import type { GamePhase } from '@/types';
import { getStore } from './store';
import { getBodies, getContracts, getItems, getParts } from '@/data/index';
import { computeShipStats } from '@/builder/compute-ship-stats';
import { autoFly, createFlightSim } from '@/sim/flight-sim';
import { simulateScavenge } from '@/economy/scavenge';
import { computePayout } from '@/economy/payout';
import { updateStreaks } from '@/economy/streaks';
import { applyWear } from '@/economy/wear';
import { writeSave } from '@/economy/save-load';
import { generateReport } from '@/report/generate-report';
import { mockDesign } from '@/mocks/mock-design';

const ALLOWED_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  home: ['contracts', 'team', 'hangar'],
  contracts: ['hangar', 'home', 'research'],
  hangar: ['preflight', 'contracts', 'home'],
  preflight: ['flight', 'hangar'],
  flight: ['scavenge', 'results'],
  scavenge: ['results'],
  results: ['contracts', 'research', 'home'],
  research: ['contracts', 'home'],
  team: ['home', 'hangar', 'preflight'],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionTo(targetPhase: GamePhase): boolean {
  const store = getStore();
  store.update({ phase: targetPhase });
  return true;
}

/**
 * Execute the entire mission loop using stubs and data,
 * ending on the 'results' phase with computed stats, payout and report.
 * This proves end-to-end integration immediately.
 */
export function runMockMission(): void {
  const store = getStore();
  const state = store.getState();

  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;

  const bodies = getBodies();
  const body = bodies.find((b) => b.id === contract.bodyId) ?? bodies[0]!;

  const parts = getParts();
  const items = getItems();

  // 1. Compute ship stats
  const design = state.design ?? mockDesign;
  const stats = computeShipStats(design, parts, body);

  // 2. Flight simulation via autoFly
  const sim = createFlightSim(stats, body, state.save.difficulty, 42);
  const flightResult = autoFly(sim);

  // 3. Scavenge simulation
  const scavengeResult =
    flightResult.outcome === 'crash'
      ? null
      : simulateScavenge(stats, body, contract, flightResult, items, state.save.difficulty, 42);

  // 4. Wear & tear calculation
  const updatedParts = applyWear(design.parts, state.save.difficulty, {});
  const partWearDelta: Record<string, number> = {};
  for (let i = 0; i < design.parts.length; i++) {
    const orig = design.parts[i]!;
    const updated = updatedParts[i]!;
    partWearDelta[orig.instanceId] = orig.condition - updated.condition;
  }

  const missionResult = {
    contractId: contract.id,
    difficulty: state.save.difficulty,
    flight: flightResult,
    scavenge: scavengeResult,
    partWearDelta,
    malfunctions: [],
  };

  // 5. Payout calculation
  const payout = computePayout(contract, missionResult, stats, state.save, 0);

  // 6. Streaks update
  const streakUpdate = updateStreaks(
    state.save.streaks,
    missionResult,
    stats,
    contract,
    state.save.safetyNets
  );

  // 7. Update and persist SaveGame
  const newFundsM = Math.max(0, state.save.fundsM + payout.netM);
  const updatedCompleted = { ...state.save.completedContracts };
  const prevRecord = updatedCompleted[contract.id];
  updatedCompleted[contract.id] = {
    bestNetM: Math.max(prevRecord?.bestNetM ?? -Infinity, payout.netM),
    bestScore: Math.max(prevRecord?.bestScore ?? 0, payout.score.total),
    plays: (prevRecord?.plays ?? 0) + 1,
  };

  const unlocked = [...state.save.unlockedContractIds];
  if (contract.unlocksContractId && !unlocked.includes(contract.unlocksContractId)) {
    if (newFundsM >= contract.fundingGateM) {
      unlocked.push(contract.unlocksContractId);
    }
  }

  // Update inventory with found items
  const inventory = [...state.save.inventory];
  if (scavengeResult) {
    for (const item of scavengeResult.itemsFound) {
      const existing = inventory.find((i) => i.itemId === item.itemId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        inventory.push({ itemId: item.itemId, quantity: item.quantity });
      }
    }
  }

  const updatedSave = {
    ...state.save,
    fundsM: newFundsM,
    completedContracts: updatedCompleted,
    unlockedContractIds: unlocked,
    streaks: streakUpdate.streaks,
    safetyNets: streakUpdate.safetyNets,
    inventory,
    ownedParts: updatedParts,
  };

  writeSave(updatedSave);

  // 8. Generate Report
  const report = generateReport(contract, stats, missionResult, payout);

  // 9. Update Store state & advance to results phase
  store.update({
    stats,
    missionResult,
    payout,
    report,
    save: updatedSave,
    phase: 'results',
  });
}
