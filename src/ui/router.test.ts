import { describe, expect, it, beforeEach } from 'vitest';
import { DEFAULT_FLAGS } from '@/config/feature-flags';
import { initStore, getStore } from '@/state/store';
import { renderRouter } from './router';

describe('game router', () => {
  beforeEach(() => {
    initStore(DEFAULT_FLAGS);
    document.body.innerHTML = '';
  });

  it('does not expose developer shortcuts that bypass the mission flow', () => {
    const appRoot = document.createElement('div');
    document.body.appendChild(appRoot);

    renderRouter(appRoot, getStore().getState());

    expect(document.querySelector('#debug-bar')).toBeNull();
    expect(document.querySelector('#btn-mock-mission')).toBeNull();
  });
});
