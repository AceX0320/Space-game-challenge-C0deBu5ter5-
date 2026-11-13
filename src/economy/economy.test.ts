import { describe, expect, it } from 'vitest';
import { newSave } from './save-load';
import { applyWear, failureChance, getDamageState, repairPart, replacePart } from './wear';
import { getFundingGateStatus, nextContractUnlocked } from './funding-gate';
import { computePayout } from './payout';
import { buySafetyNet, computeStreakMultiplier, updateStreaks } from './streaks';
import { mockMissionResult } from '@/mocks/mock-mission-result';
import { mockShipStats } from '@/mocks/mock-ship-stats';
import type { Contract, MissionResult, PartInstance } from '@/types';

describe('newSave', () => {
  it('creates a save with correct starting funds for normal', () => {
    const save = newSave('normal');
    expect(save.fundsM).toBe(60);
    expect(save.difficulty).toBe('normal');
    expect(save.unlockedContractIds).toContain('first-light');
  });
  it('creates a save with more funds for easy', () => {
    expect(newSave('easy').fundsM).toBe(100);
  });
});

describe('applyWear', () => {
  const part: PartInstance = {
    instanceId: 'e1',
    partId: 'engine',
    paramValues: {},
    condition: 100,
    maxCondition: 100,
  };
  it('reduces condition on normal difficulty', () => {
    const result = applyWear([part], 'normal', {});
    expect(result[0]!.condition).toBeLessThan(100);
  });
  it('does not reduce condition on easy difficulty', () => {
    const result = applyWear([part], 'easy', {});
    expect(result[0]!.condition).toBe(100);
  });
  it('uses PartDef baseWearPerMission and scales engine wear by count', () => {
    const singleMerlin: PartInstance = {
      instanceId: 'm1',
      partId: 'engine-merlin-class',
      paramValues: { count: 1 },
      condition: 100,
      maxCondition: 100,
    };
    const quadMerlin: PartInstance = {
      ...singleMerlin,
      instanceId: 'm4',
      paramValues: { count: 4 },
    };
    const [resSingle, resQuad] = applyWear([singleMerlin, quadMerlin], 'normal', {});
    expect(resSingle!.condition).toBe(92); // 100 - 8
    expect(resQuad!.condition).toBeLessThan(resSingle!.condition);
  });
});

describe('failureChance', () => {
  it('returns 0 for high condition part', () => {
    const part: PartInstance = {
      instanceId: 'e1',
      partId: 'e',
      paramValues: {},
      condition: 90,
      maxCondition: 100,
    };
    expect(failureChance(part)).toBe(0);
  });
  it('returns positive for low condition part', () => {
    const part: PartInstance = {
      instanceId: 'e1',
      partId: 'e',
      paramValues: {},
      condition: 20,
      maxCondition: 100,
    };
    expect(failureChance(part)).toBeGreaterThan(0);
  });
});

describe('getDamageState, repairPart, and replacePart', () => {
  it('classifies damage states accurately across condition thresholds', () => {
    const base: PartInstance = {
      instanceId: 'p1',
      partId: 'hull-standard',
      paramValues: {},
      condition: 80,
      maxCondition: 100,
    };
    expect(getDamageState({ ...base, condition: 80 })).toBe('scratched');
    expect(getDamageState({ ...base, condition: 50 })).toBe('bent');
    expect(getDamageState({ ...base, condition: 15 })).toBe('penetrated');
    expect(getDamageState({ ...base, condition: 0 })).toBe('destroyed');
  });

  it('restores condition and lowers maxCondition', () => {
    const part: PartInstance = {
      instanceId: 'e1',
      partId: 'e',
      paramValues: {},
      condition: 30,
      maxCondition: 100,
    };
    const { part: repaired, costM } = repairPart(part);
    expect(repaired.condition).toBeGreaterThan(30);
    expect(repaired.maxCondition).toBeLessThan(100);
    expect(repaired.condition).toBe(repaired.maxCondition);
    expect(costM).toBeGreaterThan(0);
  });

  it('does not repair destroyed parts (condition <= 0) and requires replacePart', () => {
    const destroyed: PartInstance = {
      instanceId: 'e1',
      partId: 'engine-merlin-class',
      paramValues: { count: 2 },
      condition: 0,
      maxCondition: 65,
    };
    const repairAttempt = repairPart(destroyed);
    expect(repairAttempt.part.condition).toBe(0);
    expect(repairAttempt.costM).toBe(0);

    const replaced = replacePart(destroyed);
    expect(replaced.part.condition).toBe(100);
    expect(replaced.part.maxCondition).toBe(100);
    expect(replaced.costM).toBe(16); // baseCostM (8) * count (2)
  });
});

describe('nextContractUnlocked and getFundingGateStatus', () => {
  const contract: Contract = {
    id: 'c1',
    title: 'T',
    bodyId: 'moon',
    objective: 'o',
    requiredInstruments: [],
    budgetCapM: 50,
    rewardM: 60,
    fundingGateM: 80,
  };
  it('returns true when funds meet gate', () => {
    const save = newSave('normal');
    save.fundsM = 80;
    expect(nextContractUnlocked(save, contract)).toBe(true);
  });
  it('returns false when funds below gate', () => {
    const save = newSave('normal');
    save.fundsM = 50;
    expect(nextContractUnlocked(save, contract)).toBe(false);
  });
  it('computes detailed funding gate status with shortfall and progress percentage', () => {
    const save = newSave('normal'); // 60M
    const status = getFundingGateStatus(save, contract);
    expect(status.unlocked).toBe(false);
    expect(status.shortfallM).toBe(20);
    expect(status.progressPct).toBe(75);
  });
});

describe('updateStreaks and buySafetyNet', () => {
  const contract: Contract = {
    id: 'first-light',
    title: 'First Light',
    bodyId: 'moon',
    objective: 'Land camera',
    requiredInstruments: ['camera'],
    budgetCapM: 50,
    rewardM: 60,
    fundingGateM: 70,
  };

  it('increments qualifying streaks and computes multiplier capped at 2.0', () => {
    const save = newSave('normal');
    const res = updateStreaks(save.streaks, mockMissionResult, mockShipStats, contract, 0);
    expect(res.streaks.cleanAscent).toBe(1);
    expect(res.streaks.smoothHands).toBe(1);
    expect(res.streaks.pinpoint).toBe(1);
    expect(res.streaks.softTouch).toBe(1);
    expect(res.streaks.frugal).toBe(1);
    expect(res.multiplier).toBe(1.25);
    expect(
      computeStreakMultiplier({
        cleanAscent: 10,
        smoothHands: 10,
        pinpoint: 5,
        softTouch: 5,
        frugal: 5,
      })
    ).toBe(2.0);
  });

  it('consumes a safety net on crash to preserve streaks, or resets streaks when no safety net exists', () => {
    const activeStreaks = {
      cleanAscent: 2,
      smoothHands: 2,
      pinpoint: 1,
      softTouch: 1,
      frugal: 0,
    };
    const crashedMission: MissionResult = {
      ...mockMissionResult,
      flight: { ...mockMissionResult.flight, outcome: 'crash', landingRing: 0 },
    };

    const protectedRes = updateStreaks(activeStreaks, crashedMission, mockShipStats, contract, 1);
    expect(protectedRes.safetyNets).toBe(0);
    expect(protectedRes.streaks.cleanAscent).toBe(2);
    expect(protectedRes.multiplier).toBe(1.3);

    const resetRes = updateStreaks(activeStreaks, crashedMission, mockShipStats, contract, 0);
    expect(resetRes.streaks.cleanAscent).toBe(0);
    expect(resetRes.multiplier).toBe(1);
  });

  it('allows buying a safety net when funds are sufficient', () => {
    const save = newSave('normal');
    const updated = buySafetyNet(save);
    expect(updated.safetyNets).toBe(1);
    expect(updated.fundsM).toBe(55);
  });
});

describe('computePayout', () => {
  const contract: Contract = {
    id: 'first-light',
    title: 'First Light',
    bodyId: 'moon',
    objective: 'Land camera',
    requiredInstruments: ['camera'],
    budgetCapM: 50,
    rewardM: 60,
    fundingGateM: 70,
    bonusObjectives: [{ id: 'bullseye', text: 'Bullseye landing', extraRewardM: 10 }],
  };

  it('rewards soft landing more than rough landing and zero on crash', () => {
    const save = newSave('normal');
    const softPayout = computePayout(contract, mockMissionResult, mockShipStats, save, 0);

    const roughMission: MissionResult = {
      ...mockMissionResult,
      flight: { ...mockMissionResult.flight, outcome: 'rough' },
    };
    const roughPayout = computePayout(contract, roughMission, mockShipStats, save, 0);

    const crashMission: MissionResult = {
      ...mockMissionResult,
      flight: { ...mockMissionResult.flight, outcome: 'crash' },
    };
    const crashPayout = computePayout(contract, crashMission, mockShipStats, save, 0);

    expect(softPayout.grossRewardM).toBeGreaterThan(roughPayout.grossRewardM);
    expect(crashPayout.grossRewardM).toBe(0);
    expect(crashPayout.netM).toBeLessThan(0);
  });

  it('applies 30% anti-farming penalty on replay only if tentative net fails to beat bestNetM', () => {
    const save = newSave('normal');
    const firstPayout = computePayout(contract, mockMissionResult, mockShipStats, save, 0);
    expect(firstPayout.isRecord).toBe(true);

    // Replay that fails to beat record -> 30% reward penalty applied
    const saveWithHighRecord = {
      ...save,
      completedContracts: {
        'first-light': { bestNetM: firstPayout.netM + 10, bestScore: 90, plays: 1 },
      },
    };
    const penalizedPayout = computePayout(
      contract,
      mockMissionResult,
      mockShipStats,
      saveWithHighRecord,
      0
    );
    expect(penalizedPayout.isRecord).toBe(false);
    expect(penalizedPayout.grossRewardM).toBeCloseTo(firstPayout.grossRewardM * 0.3, 1);

    // Replay that beats previous record -> full reward preserved
    const saveWithLowRecord = {
      ...save,
      completedContracts: {
        'first-light': { bestNetM: firstPayout.netM - 5, bestScore: 70, plays: 1 },
      },
    };
    const recordBeatPayout = computePayout(
      contract,
      mockMissionResult,
      mockShipStats,
      saveWithLowRecord,
      0
    );
    expect(recordBeatPayout.isRecord).toBe(true);
    expect(recordBeatPayout.grossRewardM).toBe(firstPayout.grossRewardM);
  });
});
