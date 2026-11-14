import { describe, expect, it } from 'vitest';
import { computeShipStats } from './compute-ship-stats';
import { validateDesign } from './validate-design';
import { getBodies, getContracts, getParts } from '@/data/index';
import { mockDesign } from '@/mocks/mock-design';

describe('validateDesign launch readiness', () => {
  it('blocks a craft that can land on the target but cannot lift off from Earth', () => {
    const body = getBodies().find((candidate) => candidate.id === 'moon')!;
    const contract = getContracts()[0]!;
    const stats = computeShipStats(mockDesign, getParts(), body);
    const underpoweredEarthLaunch = {
      ...stats,
      totalMassKg: 1_000,
      thrustN: 5_000,
      twr: 3,
    };

    expect(validateDesign(mockDesign, underpoweredEarthLaunch, contract)).toContain(
      'Earth launch thrust-to-weight ratio 0.51 is below 1.0 — the spacecraft cannot lift off'
    );
  });
});
