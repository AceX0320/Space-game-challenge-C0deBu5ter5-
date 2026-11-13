import { describe, expect, it } from 'vitest';
import { classifyTouchdown, ringForDistance } from './landing';
import { atmosphericDensity, dragForce } from './atmosphere';
import { rollMalfunctions } from './malfunctions';
import { createFlightSim, autoFly } from './flight-sim';
import type { ShipStats, Body, Difficulty } from '@/types';

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

describe('createFlightSim + autoFly', () => {
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
  const moonBody: Body = {
    id: 'moon',
    name: 'Moon',
    source: 'nasa',
    gravityMs2: 1.62,
    atmosphere: null,
    baseLifetimeS: 86400,
    solarFlux: 1.0,
  };

  it('autoFly completes without crashing (moon, normal)', () => {
    const sim = createFlightSim(mockStats, moonBody, 'normal', 42);
    const result = autoFly(sim);
    expect(result.outcome).toMatch(/soft|rough|crash/);
    expect(result.landingRing).toBeGreaterThanOrEqual(0);
  });

  it('isDone() is true after autoFly', () => {
    const sim = createFlightSim(mockStats, moonBody, 'normal', 42);
    autoFly(sim);
    expect(sim.isDone()).toBe(true);
  });
});
