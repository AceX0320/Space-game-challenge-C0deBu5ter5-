import { describe, expect, it } from 'vitest';
import { computeShipStats } from './compute-ship-stats';
import type { Body, PartDef, ShipDesign } from '@/types';

const moonBody: Body = {
  id: 'moon',
  name: 'Moon',
  source: 'nasa',
  gravityMs2: 1.62,
  atmosphere: null,
  baseLifetimeS: 86400,
  solarFlux: 1.0,
};

const mockParts: PartDef[] = [
  {
    id: 'engine-test',
    name: 'Test Engine',
    category: 'engine',
    source: 'game',
    description: 'Test',
    baseMassKg: 500,
    baseCostM: 8,
    basePowerW: 200,
    baseWearPerMission: 8,
    params: [{ key: 'thrustScale', label: 'Thrust', min: 0.5, max: 2, step: 0.1, default: 1, unit: '×', explain: '' }],
    stats: { thrustN: 450000, ispS: 282 },
  },
  {
    id: 'tank-test',
    name: 'Test Tank',
    category: 'tank',
    source: 'game',
    description: 'Test',
    baseMassKg: 200,
    baseCostM: 2,
    basePowerW: 0,
    baseWearPerMission: 2,
    params: [{ key: 'volume', label: 'Volume', min: 0.5, max: 4, step: 0.5, default: 1, unit: '×', explain: '' }],
    stats: { fuelCapacityKg: 2000 },
  },
];

const mockDesign: ShipDesign = {
  id: 'd1',
  name: 'Test Ship',
  parts: [
    { instanceId: 'e1', partId: 'engine-test', paramValues: { thrustScale: 1 }, condition: 100, maxCondition: 100 },
    { instanceId: 't1', partId: 'tank-test', paramValues: { volume: 1 }, condition: 100, maxCondition: 100 },
  ],
};

describe('computeShipStats', () => {
  it('returns valid ShipStats for a simple design', () => {
    const stats = computeShipStats(mockDesign, mockParts, moonBody);
    expect(stats.totalMassKg).toBeGreaterThan(0);
    expect(stats.costM).toBeGreaterThan(0);
    expect(stats.deltaVms).toBeGreaterThan(0);
  });

  it('computes positive TWR with engine + fuel', () => {
    const stats = computeShipStats(mockDesign, mockParts, moonBody);
    expect(stats.twr).toBeGreaterThan(0);
  });

  it('reliability is 1.0 when all parts are at 100% condition', () => {
    const stats = computeShipStats(mockDesign, mockParts, moonBody);
    expect(stats.reliability).toBeCloseTo(1.0);
  });

  it('returns empty violations for a valid design', () => {
    const stats = computeShipStats(mockDesign, mockParts, moonBody);
    expect(stats.violations).toEqual([]);
  });
});
