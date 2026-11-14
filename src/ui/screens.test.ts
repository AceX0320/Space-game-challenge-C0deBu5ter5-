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

  it('updates the live spacecraft preview when a part is added', () => {
    renderHangar(root, getStore().getState());
    const preview = (): NodeListOf<SVGElement> =>
      root.querySelectorAll('svg[data-craft-preview] [data-preview-part]');
    const before = preview().length;
    const addEngine = root.querySelector<HTMLButtonElement>('[data-add="engine-merlin-class"]');

    expect(addEngine).not.toBeNull();
    addEngine!.click();

    expect(preview()).toHaveLength(before + 1);
  });

  it('updates the live spacecraft preview when a tank is tuned', () => {
    renderHangar(root, getStore().getState());
    root.querySelector<HTMLElement>('[data-inst-id="tank-1"]')?.click();
    const volumeSlider = root.querySelector<HTMLInputElement>(
      'input[data-param="volume"][data-inst="tank-1"]'
    );

    expect(volumeSlider).not.toBeNull();
    volumeSlider!.value = '4';
    volumeSlider!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(root.querySelector('[data-preview-tank]')?.getAttribute('data-tank-volume')).toBe('4.00');
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
    expect(root.querySelector('[data-hold="thrust"]')).toBeTruthy();
    expect(root.querySelector('[data-analog-throttle]')).toBeTruthy();
    expect(root.textContent).toContain('Hold throttle to launch from Earth');
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
