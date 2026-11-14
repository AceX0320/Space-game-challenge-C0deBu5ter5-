import { describe, expect, it } from 'vitest';
import { classifyTouchdown, ringForDistance } from './landing';
import { atmosphericDensity, dragForce } from './atmosphere';
import { rollMalfunctions } from './malfunctions';
import {
  createFlightSim,
  autoFly,
  LAUNCH_TARGET_ALTITUDE_M,
  TARGET_APPROACH_ALTITUDE_M,
} from './flight-sim';
import { computePayout } from '@/economy/payout';
import { simulateScavenge } from '@/economy/scavenge';
import { generateReport } from '@/report/generate-report';
import type { ShipStats, Body, Difficulty, Contract, SaveGame, MissionResult } from '@/types';

const mockLimits = { maxVyMs: 6, maxVxMs: 3, maxTiltDeg: 15 };

describe('classifyTouchdown', () => {
  it('returns soft for safe landing', () => {
    expect(classifyTouchdown(3, 1, 5, mockLimits)).toBe('soft');
  });
  it('returns rough for slightly exceeded limits', () => {
    expect(classifyTouchdown(8, 1, 5, mockLimits)).toBe('rough');
  });
  it('returns crash for badly exceeded limits', () => {
    expect(classifyTouchdown(20, 1, 5, mockLimits)).toBe('crash');
  });
});

describe('ringForDistance', () => {
  it('returns 5 (bullseye) for centre landing', () => {
    expect(ringForDistance(0, 'normal')).toBe(5);
  });
  it('returns 0 for very far landing', () => {
    expect(ringForDistance(99999, 'normal')).toBe(0);
  });
  it('returns lower rings for mid distances', () => {
    expect(ringForDistance(400, 'normal')).toBeGreaterThan(0);
  });
});

describe('atmosphericDensity', () => {
  it('returns 0 for no atmosphere', () => {
    expect(atmosphericDensity(null, 0)).toBe(0);
  });
  it('returns positive density at surface', () => {
    const spec = { surfaceDensityKgM3: 0.02, scaleHeightM: 11100 };
    expect(atmosphericDensity(spec, 0)).toBeCloseTo(0.02);
  });
  it('decreases with altitude', () => {
    const spec = { surfaceDensityKgM3: 0.02, scaleHeightM: 11100 };
    expect(atmosphericDensity(spec, 11100)).toBeLessThan(atmosphericDensity(spec, 0));
  });
});

describe('dragForce', () => {
  it('returns 0 when speed is 0', () => {
    expect(dragForce(1.2, 0, 10)).toBe(0);
  });
  it('returns positive force for positive speed', () => {
    expect(dragForce(1.2, 100, 10)).toBeGreaterThan(0);
  });
});

describe('rollMalfunctions', () => {
  it('returns [] when not hard difficulty', () => {
    const design = { id: 'd1', name: 'D1', parts: [] };
    expect(
      rollMalfunctions(design as Parameters<typeof rollMalfunctions>[0], 'normal' as Difficulty, 42)
    ).toEqual([]);
  });
});

describe('createFlightSim + autoFly Integration Tests', () => {
  const moonShipStats: ShipStats = {
    totalMassKg: 1000,
    dryMassKg: 500,
    fuelMassKg: 500,
    deltaVms: 2500,
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

  const moonBody: Body = {
    id: 'moon',
    name: 'Moon',
    source: 'nasa',
    gravityMs2: 1.62,
    atmosphere: null,
    baseLifetimeS: 86400,
    solarFlux: 1.0,
  };

  it('starts on Earth and requires throttle before transferring to the destination', () => {
    const sim = createFlightSim(moonShipStats, moonBody, 'normal', 42);
    expect(sim.state.phase).toBe('ascent');
    expect(sim.state.yM).toBe(0);

    for (let i = 0; i < 20; i += 1) {
      sim.step(0.05, { throttle: 0, pitchRate: 0, rcs: 0, deployParachute: false });
    }
    expect(sim.state.phase).toBe('ascent');
    expect(sim.state.yM).toBe(0);

    for (let i = 0; i < 2_000 && sim.state.phase === 'ascent'; i += 1) {
      sim.step(0.05, { throttle: 1, pitchRate: 0, rcs: 0, deployParachute: false });
    }
    expect(sim.state.phase, JSON.stringify(sim.state)).toBe('transit');
    expect(sim.state.yM).toBe(LAUNCH_TARGET_ALTITUDE_M);

    for (let i = 0; i < 200 && sim.state.phase === 'transit'; i += 1) {
      sim.step(0.05, { throttle: 0, pitchRate: 0, rcs: 0, deployParachute: false });
    }
    expect(sim.state.phase).toBe('descent');
    expect(sim.state.yM).toBe(TARGET_APPROACH_ALTITUDE_M);
  });

  it('1. Determinism: same stats, body, difficulty, and seed produce identical FlightResult twice', () => {
    const sim1 = createFlightSim(moonShipStats, moonBody, 'normal', 12345);
    const result1 = autoFly(sim1);

    const sim2 = createFlightSim(moonShipStats, moonBody, 'normal', 12345);
    const result2 = autoFly(sim2);

    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.landingRing).toBe(result2.landingRing);
    expect(result1.distanceFromTargetM).toBeCloseTo(result2.distanceFromTargetM, 4);
    expect(result1.touchdownVyMs).toBeCloseTo(result2.touchdownVyMs, 4);
    expect(result1.touchdownVxMs).toBeCloseTo(result2.touchdownVxMs, 4);
    expect(result1.fuelLeftKg).toBeCloseTo(result2.fuelLeftKg, 4);
  });

  it('2. A well-built Moon ship lands soft with autoFly', () => {
    const sim = createFlightSim(moonShipStats, moonBody, 'normal', 42);
    const result = autoFly(sim);

    expect(result.outcome, JSON.stringify({ state: sim.state, events: result.events })).toBe('soft');
    expect(sim.isDone()).toBe(true);
    expect(Math.abs(result.touchdownVyMs)).toBeLessThanOrEqual(
      moonShipStats.touchdownLimits.maxVyMs
    );
    expect(Math.abs(result.touchdownVxMs)).toBeLessThanOrEqual(
      moonShipStats.touchdownLimits.maxVxMs
    );
  });

  it('3. An underpowered ship (TWR below 1) crashes with autoFly', () => {
    // Weight on Moon = 1000 kg * 1.62 m/s² = 1620 N
    // Thrust = 500 N => TWR = 0.31 (far below 1)
    const underpoweredStats: ShipStats = {
      ...moonShipStats,
      thrustN: 500,
      twr: 0.31,
    };

    const sim = createFlightSim(underpoweredStats, moonBody, 'normal', 42);
    const result = autoFly(sim);

    expect(result.outcome).toBe('crash');
    expect(result.events.some((event) => event.text.includes('Launch failed'))).toBe(true);
  });

  it('4. FlightResult from real sim flows cleanly through computePayout and generateReport', () => {
    const sim = createFlightSim(moonShipStats, moonBody, 'normal', 42);
    const flightResult = autoFly(sim);

    const mockContract: Contract = {
      id: 'moon-landing-01',
      title: 'First Light: Moon Landing',
      bodyId: 'moon',
      objective: 'Land softly on the Moon and deploy surface sensors.',
      requiredInstruments: ['camera'],
      budgetCapM: 60,
      rewardM: 80,
      fundingGateM: 100,
    };

    const mockSave: SaveGame = {
      version: 1,
      fundsM: 50,
      difficulty: 'normal',
      unlockedContractIds: ['moon-landing-01'],
      completedContracts: {},
      streaks: {
        cleanAscent: 1,
        smoothHands: 1,
        pinpoint: 1,
        softTouch: 1,
        frugal: 1,
      },
      safetyNets: 0,
      inventory: [],
      researched: [],
      ownedParts: [],
      currentDesign: null,
    };

    const scavengeResult = simulateScavenge(
      moonShipStats,
      moonBody,
      mockContract,
      flightResult,
      [
        {
          id: 'regolith',
          name: 'Regolith Sample',
          bodyIds: ['moon'],
          requiresInstrument: ['camera'],
          dataMB: 20,
          scienceValue: 30,
          source: 'nasa',
        },
      ],
      'normal',
      42
    );

    const missionResult: MissionResult = {
      contractId: mockContract.id,
      difficulty: 'normal',
      flight: flightResult,
      scavenge: scavengeResult,
      partWearDelta: {},
      malfunctions: [],
    };

    const payout = computePayout(mockContract, missionResult, moonShipStats, mockSave, 0);
    expect(payout.grossRewardM).toBeGreaterThan(0);
    expect(payout.netM).toBeDefined();

    const report = generateReport(mockContract, moonShipStats, missionResult, payout);
    expect(report.headline).toBeDefined();
    expect(report.causes.length).toBeGreaterThanOrEqual(1);
    expect(report.suggestions).toBeDefined();
  });

  it('5. Higher difficulty shrinks landing rings (same distance yields equal or lower ring)', () => {
    const testDistanceM = 250;

    const easyRing = ringForDistance(testDistanceM, 'easy');
    const normalRing = ringForDistance(testDistanceM, 'normal');
    const hardRing = ringForDistance(testDistanceM, 'hard');

    expect(easyRing).toBeGreaterThanOrEqual(normalRing);
    expect(normalRing).toBeGreaterThanOrEqual(hardRing);
  });
});
