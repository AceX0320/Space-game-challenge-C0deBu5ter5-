import { describe, it, expect, beforeEach } from 'vitest';
import { getStore, initStore } from '@/state/store';
import { DEFAULT_FLAGS } from '@/config/feature-flags';
import { renderHome } from './screens/home';
import { renderContracts } from './screens/contracts';
import { renderHangar } from './screens/hangar';
import { renderPreflight } from './screens/preflight';
import { renderFlight } from './screens/flight';
import { renderScavenge } from './screens/scavenge';
import { renderResults } from './screens/results';
import { renderResearch } from './screens/research';
import { renderTeam } from './screens/team';

describe('UI Screen Rendering Tests (JSDOM)', () => {
  let root: HTMLElement;

  beforeEach(() => {
    initStore({ ...DEFAULT_FLAGS, teamMode: true });
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('renders Home screen cleanly', () => {
    const state = getStore().getState();
    renderHome(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('LAUNCHSMITH');
  });

  it('renders Contracts / Mission Select screen cleanly', () => {
    const state = getStore().getState();
    renderContracts(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('First Light');
  });

  it('renders Hangar screen cleanly', () => {
    const state = getStore().getState();
    renderHangar(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('Component Hierarchy');
    expect(root.textContent).toContain('Installed Hardware');
  });

  it('renders Preflight screen cleanly', () => {
    const state = getStore().getState();
    renderPreflight(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('Systems Check Matrix');
  });

  it('renders Flight screen cleanly', () => {
    const state = getStore().getState();
    renderFlight(root, state);
    expect(root.querySelector('canvas')).toBeTruthy();
  });

  it('renders Scavenge screen cleanly', () => {
    const state = getStore().getState();
    renderScavenge(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('Action Deck');
    expect(root.textContent).toContain('Surface Operations');
  });

  it('renders Results screen cleanly', () => {
    const state = getStore().getState();
    renderResults(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
  });

  it('renders Research screen cleanly', () => {
    const state = getStore().getState();
    renderResearch(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('Research Grants');
  });

  it('renders Team screen cleanly when teamMode is true', () => {
    const state = getStore().getState();
    renderTeam(root, state);
    expect(root.querySelector('.ls-wordmark')).toBeTruthy();
    expect(root.textContent).toContain('Mission Director');
  });
});
