import type { GamePhase } from '@/types';
import type { GameState } from '@/state/store';
import { runMockMission, transitionTo } from '@/state/flow';
import { renderHome } from './screens/home';
import { renderContracts } from './screens/contracts';
import { renderHangar } from './screens/hangar';
import { renderPreflight } from './screens/preflight';
import { renderFlight } from './screens/flight';
import { renderScavenge } from './screens/scavenge';
import { renderResults } from './screens/results';
import { renderResearch } from './screens/research';
import { renderTeam } from './screens/team';

const ALL_PHASES: GamePhase[] = [
  'home',
  'contracts',
  'hangar',
  'preflight',
  'flight',
  'scavenge',
  'results',
  'research',
  'team',
];

export function renderRouter(appRoot: HTMLElement, state: GameState): void {
  // Ensure debug bar exists or is updated
  let debugBar = document.getElementById('debug-bar');
  if (!debugBar) {
    debugBar = document.createElement('div');
    debugBar.id = 'debug-bar';
    debugBar.className = 'debug-bar';
    document.body.insertBefore(debugBar, document.body.firstChild);
  }

  debugBar.innerHTML = `
    <span>🛠️ DEV DEBUG BAR:</span>
    ${ALL_PHASES.map(
      (phase) =>
        `<button data-phase="${phase}" style="${state.phase === phase ? 'background:#4338ca; border-color:#818cf8;' : ''}">${phase}</button>`
    ).join('')}
    <button class="primary" id="btn-mock-mission" style="margin-left:auto">▶ Run Mock Mission (End-to-End)</button>
  `;

  debugBar.querySelectorAll('button[data-phase]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const phase = (e.currentTarget as HTMLElement).getAttribute('data-phase') as GamePhase;
      if (phase) {
        transitionTo(phase);
      }
    });
  });

  debugBar.querySelector('#btn-mock-mission')?.addEventListener('click', () => {
    runMockMission();
  });

  // Render current phase screen into appRoot
  switch (state.phase) {
    case 'home':
      renderHome(appRoot, state);
      break;
    case 'contracts':
      renderContracts(appRoot, state);
      break;
    case 'hangar':
      renderHangar(appRoot, state);
      break;
    case 'preflight':
      renderPreflight(appRoot, state);
      break;
    case 'flight':
      renderFlight(appRoot, state);
      break;
    case 'scavenge':
      renderScavenge(appRoot, state);
      break;
    case 'results':
      renderResults(appRoot, state);
      break;
    case 'research':
      renderResearch(appRoot, state);
      break;
    case 'team':
      renderTeam(appRoot, state);
      break;
  }

  // Render persistent footer with version/commit stamp
  let footer = document.getElementById('app-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.id = 'app-footer';
    footer.className = 'app-footer';
    document.body.appendChild(footer);
  }
  footer.innerHTML = `
    <div>Launchsmith v0.1.0 · NASA Space Apps Challenge 2026</div>
    <div>Commit Build: <strong>#setup-init (Hour 0–1 Scaffold)</strong> · Environment: <strong>Client-Only Static</strong></div>
  `;
}
