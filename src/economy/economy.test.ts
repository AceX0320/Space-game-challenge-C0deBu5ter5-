import { describe, expect, it } from 'vitest';
import { newSave } from './save-load';
import { applyWear, failureChance, repairPart } from './wear';
import { nextContractUnlocked } from './funding-gate';
import type { Contract, PartInstance } from '@/types';

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
  const part: PartInstance = { instanceId: 'e1', partId: 'engine', paramValues: {}, condition: 100, maxCondition: 100 };
  it('reduces condition on normal difficulty', () => {
    const result = applyWear([part], 'normal', {});
    expect(result[0]!.condition).toBeLessThan(100);
  });
  it('does not reduce condition on easy difficulty', () => {
    const result = applyWear([part], 'easy', {});
    expect(result[0]!.condition).toBe(100);
  });
});

describe('failureChance', () => {
  it('returns 0 for high condition part', () => {
    const part: PartInstance = { instanceId: 'e1', partId: 'e', paramValues: {}, condition: 90, maxCondition: 100 };
    expect(failureChance(part)).toBe(0);
  });
  it('returns positive for low condition part', () => {
    const part: PartInstance = { instanceId: 'e1', partId: 'e', paramValues: {}, condition: 20, maxCondition: 100 };
    expect(failureChance(part)).toBeGreaterThan(0);
  });
});

describe('repairPart', () => {
  it('restores condition and lowers maxCondition', () => {
    const part: PartInstance = { instanceId: 'e1', partId: 'e', paramValues: {}, condition: 30, maxCondition: 100 };
    const { part: repaired } = repairPart(part);
    expect(repaired.condition).toBeGreaterThan(30);
    expect(repaired.maxCondition).toBeLessThan(100);
  });
});

describe('nextContractUnlocked', () => {
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
});
