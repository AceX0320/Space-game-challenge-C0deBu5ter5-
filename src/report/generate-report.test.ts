import { describe, expect, it } from 'vitest';
import { generateReport } from './generate-report';
import type { Contract, MissionResult, PayoutResult, ShipStats } from '@/types';

const mockContract: Contract = {
  id: 'first-light',
  title: 'First Light',
  bodyId: 'moon',
  objective: 'Soft-land a camera on the lunar surface',
  requiredInstruments: ['camera'],
  budgetCapM: 50,
  rewardM: 60,
  fundingGateM: 70,
};

const mockStats: ShipStats = {
  totalMassKg: 1000,
  dryMassKg: 500,
  fuelMassKg: 500,
  deltaVms: 2000,
  thrustN: 15000,
  twr: 1.5,
  powerGenW: 400,
  powerDrawW: 200,
  batteryWh: 500,
  dataGenKbps: 50,
  downlinkKbps: 100,
  dataBufferMB: 100,
  costM: 30,
  reliability: 0.95,
  controlAuthority: 0.8,
  touchdownLimits: { maxVyMs: 6, maxVxMs: 3, maxTiltDeg: 15 },
  warnings: [],
  valid: true,
  violations: [],
};

const mockPayout: PayoutResult = {
  grossRewardM: 60,
  buildCostM: 30,
  launchCostM: 3,
  repairCostM: 0,
  streakMultiplier: 1,
  netM: 27,
  isRecord: true,
  score: { landing: 100, science: 100, efficiency: 90, decisions: 100, teamBonus: 0, total: 98 },
};

describe('generateReport', () => {
  it('generates a successful report for a soft landing', () => {
    const result: MissionResult = {
      contractId: 'first-light',
      difficulty: 'normal',
      flight: {
        outcome: 'soft',
        landingRing: 5,
        distanceFromTargetM: 10,
        touchdownVyMs: -2.5,
        touchdownVxMs: 0.5,
        touchdownTiltDeg: 2,
        fuelLeftKg: 100,
        ascentFuelUsedPct: 20,
        corrections: 2,
        events: [],
      },
      scavenge: {
        itemsFound: [{ itemId: 'regolith-sample', tS: 100, quantity: 2, transmitted: true }],
        dataGeneratedMB: 10,
        dataSentMB: 10,
        timeUsedS: 500,
        timeAvailableS: 86400,
        endedBy: 'timer',
        events: [],
      },
      partWearDelta: {},
      malfunctions: [],
    };

    const report = generateReport(mockContract, mockStats, result, mockPayout);
    expect(report.outcome).toBe('soft');
    expect(report.headline).toContain('Successful');
    expect(report.causes.length).toBeGreaterThan(0);
    expect(report.similarRealMission).toBeDefined();
  });

  it('generates crash report with suggestions', () => {
    const result: MissionResult = {
      contractId: 'first-light',
      difficulty: 'normal',
      flight: {
        outcome: 'crash',
        landingRing: 0,
        distanceFromTargetM: 5000,
        touchdownVyMs: -25,
        touchdownVxMs: 5,
        touchdownTiltDeg: 45,
        fuelLeftKg: 0,
        ascentFuelUsedPct: 100,
        corrections: 10,
        events: [],
      },
      scavenge: null,
      partWearDelta: {},
      malfunctions: [],
    };

    const lossPayout: PayoutResult = {
      grossRewardM: 0,
      buildCostM: 30,
      launchCostM: 3,
      repairCostM: 10,
      streakMultiplier: 1,
      netM: -43,
      isRecord: false,
      score: { landing: 0, science: 0, efficiency: 0, decisions: 50, teamBonus: 0, total: 12 },
    };

    const report = generateReport(mockContract, mockStats, result, lossPayout);
    expect(report.outcome).toBe('crash');
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});
