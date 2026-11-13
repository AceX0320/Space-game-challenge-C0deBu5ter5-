import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { createPanel } from '@/ui/components/panel';
import { formatM } from '@/core/units';

export function renderHome(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Launchsmith 🚀</h1>
      <p style="color:var(--text-dim)">NASA Space Apps Challenge 2026 — Space Mission Design Game</p>
    </div>
    <div style="font-size:1.1rem; font-weight:bold; color:var(--accent)">
      Budget: ${formatM(state.save.fundsM)} | Difficulty: ${state.save.difficulty.toUpperCase()}
    </div>
  `;
  container.appendChild(header);

  const mainPanel = createPanel(
    'Mission Control Headquarters',
    `
    <p style="margin-bottom:1rem">
      Welcome to Launchsmith. Design, test, fly, and land spacecraft across the solar system while managing real mechanical trade-offs and agency finances.
    </p>
    <div style="display:flex; gap:1rem; margin-top:1.5rem">
      <button class="primary" id="btn-start-mission">Select Mission Contract</button>
      <button id="btn-team-mode">Team Review Mode (up to 4 players)</button>
    </div>
    `
  );
  container.appendChild(mainPanel);

  root.appendChild(container);

  root.querySelector('#btn-start-mission')?.addEventListener('click', () => {
    transitionTo('contracts');
  });

  root.querySelector('#btn-team-mode')?.addEventListener('click', () => {
    transitionTo('team');
  });
}

