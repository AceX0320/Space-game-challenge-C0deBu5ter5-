import { describe, expect, it } from 'vitest';
import { generateReport } from './generate-report';
import type {
  Body,
  Contract,
  FlightResult,
  MissionResult,
  PayoutResult,
  ScavengeResult,
  ShipStats,
} from '@/types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseContract: Contract = {
  id: 'first-light',
  title: 'First Light',
  bodyId: 'moon',
  objective: 'Soft-land a camera on the lunar surface',
  requiredInstruments: ['camera'],
  budgetCapM: 50,
  rewardM: 60,
  fundingGateM: 70,
};

const baseStats: ShipStats = {
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

const basePayout: PayoutResult = {
  grossRewardM: 60,
  buildCostM: 30,
  launchCostM: 3,
  repairCostM: 0,
  streakMultiplier: 1,
  netM: 27,
  isRecord: true,
  score: { landing: 100, science: 100, efficiency: 90, decisions: 100, teamBonus: 0, total: 98 },
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

const goodScavenge: ScavengeResult = {
  itemsFound: [{ itemId: 'regolith-sample', tS: 100, quantity: 2, transmitted: true }],
  dataGeneratedMB: 10,
  dataSentMB: 10,
  timeUsedS: 500,
  timeAvailableS: 86400,
  endedBy: 'timer',
  events: [],
};

function softFlight(overrides: Partial<FlightResult> = {}): FlightResult {
  return {
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
    ...overrides,
  };
}

function mission(
  flight: FlightResult,
  scavenge: ScavengeResult | null = goodScavenge
): MissionResult {
  return {
    contractId: 'first-light',
    difficulty: 'normal',
    flight,
    scavenge,
    partWearDelta: {},
    malfunctions: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateReport', () => {
  // 1. Soft landing with no issues
  it('soft landing with full data return — all good causes', () => {
    const report = generateReport(baseContract, baseStats, mission(softFlight()), basePayout);
    expect(report.outcome).toBe('soft');
    expect(report.headline).toMatch(/soft landing/i);
    expect(report.causes.some((c) => c.severity === 'critical')).toBe(false);
    expect(report.causes.some((c) => c.severity === 'good')).toBe(true);
  });

  // 2. Rough landing
  it('rough landing — warning, no crash', () => {
    const report = generateReport(
      baseContract,
      baseStats,
      mission(softFlight({ outcome: 'rough', touchdownVyMs: -7, touchdownTiltDeg: 3 })),
      basePayout
    );
    expect(report.outcome).toBe('rough');
    expect(report.headline).toMatch(/hard landing/i);
    expect(report.causes.some((c) => c.severity === 'warning')).toBe(true);
    expect(report.causes.some((c) => c.severity === 'critical')).toBe(false);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  // 3. Crash by vertical speed
  it('crash by excessive vertical speed — critical cause, speed suggestion', () => {
    const stats: ShipStats = { ...baseStats, twr: 1.0 }; // low TWR → "add engines" advice
    const report = generateReport(
      baseContract,
      stats,
      mission(
        softFlight({ outcome: 'crash', touchdownVyMs: -30, touchdownTiltDeg: 3, fuelLeftKg: 0 }),
        null
      ),
      lossPayout
    );
    expect(report.outcome).toBe('crash');
    expect(report.causes.some((c) => c.severity === 'critical')).toBe(true);
    expect(report.suggestions.some((s) => /engine|mass/i.test(s))).toBe(true);
  });

  // 4. Crash by tilt
  it('crash by excessive tilt — critical cause, landing leg suggestion', () => {
    const report = generateReport(
      baseContract,
      baseStats,
      mission(
        softFlight({ outcome: 'crash', touchdownVyMs: -5, touchdownTiltDeg: 40, fuelLeftKg: 10 }),
        null
      ),
      lossPayout
    );
    expect(report.outcome).toBe('crash');
    expect(report.causes.some((c) => /tilt/i.test(c.text))).toBe(true);
    expect(report.suggestions.some((s) => /leg|rcs/i.test(s))).toBe(true);
  });

  // 5. Crash is NOT overwritten by power failure
  it('crash outcome not downgraded to warning when scavenge ended by power', () => {
    const powerScavenge: ScavengeResult = {
      ...goodScavenge,
      endedBy: 'power',
      dataSentMB: 2,
      dataGeneratedMB: 10,
      timeUsedS: 60,
    };
    const report = generateReport(
      baseContract,
      baseStats,
      mission(
        softFlight({ outcome: 'crash', touchdownVyMs: -30, touchdownTiltDeg: 2, fuelLeftKg: 0 }),
        powerScavenge
      ),
      lossPayout
    );
    expect(report.outcome).toBe('crash'); // must remain crash
    expect(report.causes.some((c) => c.severity === 'critical')).toBe(true);
  });

  // 6. scavenge: null — surface section skipped entirely
  it('null scavenge — no surface cause entries', () => {
    const report = generateReport(baseContract, baseStats, mission(softFlight(), null), basePayout);
    // Should still have good causes (landing, financial) but no power/data causes
    expect(report.causes.some((c) => /power/i.test(c.text))).toBe(false);
    expect(report.causes.some((c) => /transmitted/i.test(c.text))).toBe(false);
  });

  // 7. Data lost (sent < generated)
  it('data partially lost — warning cause, comms suggestion', () => {
    const partialScavenge: ScavengeResult = {
      ...goodScavenge,
      dataGeneratedMB: 20,
      dataSentMB: 5,
      endedBy: 'timer',
    };
    const report = generateReport(
      baseContract,
      baseStats,
      mission(softFlight(), partialScavenge),
      basePayout
    );
    expect(report.headline).toMatch(/data partly lost/i);
    expect(
      report.causes.some(
        (c) =>
          /transmitted/i.test(c.text) ||
          /MB.*transmitted/i.test(c.text) ||
          /dataGeneratedMB/i.test(c.text) ||
          /generated/i.test(c.text)
      )
    ).toBe(true);
  });

  // 8. Power lost (endedBy === 'power')
  it('power lost during surface ops — warning, RTG/solar suggestion', () => {
    const powerScavenge: ScavengeResult = {
      ...goodScavenge,
      endedBy: 'power',
      dataSentMB: 3,
      dataGeneratedMB: 8,
      timeUsedS: 120,
    };
    const moonBody: Body = {
      id: 'moon',
      name: 'Moon',
      source: 'nasa',
      gravityMs2: 1.62,
      atmosphere: null,
      baseLifetimeS: 86400,
      solarFlux: 1361,
    };
    const report = generateReport(
      baseContract,
      baseStats,
      mission(softFlight(), powerScavenge),
      basePayout,
      moonBody
    );
    expect(report.causes.some((c) => /power/i.test(c.text))).toBe(true);
    expect(report.suggestions.some((s) => /solar|battery|rtg/i.test(s))).toBe(true);
  });

  // 9. Burn-up (maxHeatMJ > heatCapacityMJ)
  it('burn-up — critical heat cause, heat shield suggestion', () => {
    const stats: ShipStats = { ...baseStats, heatCapacityMJ: 50 };
    const flightWithHeat = softFlight({
      outcome: 'crash',
      touchdownVyMs: -5,
      touchdownTiltDeg: 2,
      fuelLeftKg: 10,
      maxHeatMJ: 120,
    });
    const report = generateReport(baseContract, stats, mission(flightWithHeat, null), lossPayout);
    expect(report.outcome).toBe('crash');
    expect(report.headline).toMatch(/heat|burn/i);
    expect(report.causes.some((c) => /heat/i.test(c.text))).toBe(true);
    expect(report.suggestions.some((s) => /heat shield/i.test(s))).toBe(true);
  });

  // 10. Timeline ordering (sorted by tS ascending)
  it('timeline events are sorted by tS ascending', () => {
    const flightWithEvents = softFlight({
      events: [
        { tS: 300, kind: 'info', text: 'Engine ignition' },
        { tS: 100, kind: 'milestone', text: 'Liftoff' },
      ],
    });
    const scavengeWithEvents: ScavengeResult = {
      ...goodScavenge,
      events: [{ tS: 200, kind: 'info', text: 'Instrument deployed' }],
    };
    const report = generateReport(
      baseContract,
      baseStats,
      mission(flightWithEvents, scavengeWithEvents),
      basePayout
    );
    // The timeline text is prefixed with T+m:ss, but sort is by original tS
    expect(report.timeline.length).toBe(3);
    // After sort: tS 100, 200, 300 → first entry contains "Liftoff"
    expect(report.timeline[0].text).toContain('Liftoff');
    expect(report.timeline[1].text).toContain('Instrument deployed');
    expect(report.timeline[2].text).toContain('Engine ignition');
  });
});
