import { describe, expect, it } from 'vitest';
import { getStore, initStore } from '@/state/store';
import { runMockMission, transitionTo } from '@/state/flow';
import { getBodies, getContracts, getItems, getParts, getResearch } from '@/data/index';

describe('Data Validation & Flow Integration', () => {
  it('validates all static datasets without error', () => {
    expect(getBodies().length).toBeGreaterThanOrEqual(5);
    expect(getContracts().length).toBeGreaterThanOrEqual(6);
    expect(getParts().length).toBeGreaterThanOrEqual(12);
    expect(getItems().length).toBeGreaterThanOrEqual(6);
    expect(getResearch().length).toBeGreaterThanOrEqual(8);
  });

  it('initializes store and runs mock mission end-to-end', () => {
    initStore();
    const store = getStore();

    expect(store.getState().phase).toBe('home');

    transitionTo('contracts');
    expect(store.getState().phase).toBe('contracts');

    // Run the full mock mission
    runMockMission();

    const state = store.getState();
    expect(state.phase).toBe('results');
    expect(state.stats).toBeDefined();
    expect(state.missionResult).toBeDefined();
    expect(state.payout).toBeDefined();
    expect(state.report).toBeDefined();
    expect(state.report?.headline).toBeDefined();
    expect(state.payout?.score.total).toBeGreaterThan(0);
  });
});
