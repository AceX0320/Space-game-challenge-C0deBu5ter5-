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

/** Set up bottom-left dev debug bar (DEV builds only). Called once. */
function initDebugBar(): HTMLElement | null {
  if (!import.meta.env.DEV) return null;

  let bar = document.getElementById('debug-bar');
  if (bar) return bar;

  bar = document.createElement('div');
  bar.id = 'debug-bar';
  bar.className = 'debug-bar';
  bar.dataset['collapsed'] = 'false';

  // Label / toggle
  const label = document.createElement('span');
  label.className = 'debug-label';
  label.textContent = 'DEV';
  label.title = 'Toggle debug bar (or press `)';
  label.addEventListener('click', () => toggleDebugBar(bar!));
  bar.appendChild(label);

  // Content wrapper (hidden when collapsed)
  const content = document.createElement('div');
  content.className = 'debug-content';
  content.style.cssText = 'display:flex; flex-wrap:wrap; gap:3px; align-items:center;';
  bar.appendChild(content);

  document.body.appendChild(bar);

  // Keyboard shortcut: backtick
  document.addEventListener('keydown', (e) => {
    if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      toggleDebugBar(bar!);
    }
  });

  return bar;
}

function toggleDebugBar(bar: HTMLElement): void {
  const collapsed = bar.dataset['collapsed'] === 'true';
  bar.dataset['collapsed'] = collapsed ? 'false' : 'true';
  bar.classList.toggle('is-collapsed', !collapsed);
}

function updateDebugBar(bar: HTMLElement, state: GameState): void {
  const content = bar.querySelector('.debug-content') as HTMLElement | null;
  if (!content) return;

  content.innerHTML = '';

  for (const phase of ALL_PHASES) {
    const btn = document.createElement('button');
    btn.textContent = phase;
    if (state.phase === phase) btn.classList.add('debug-active');
    btn.addEventListener('click', () => transitionTo(phase as GamePhase));
    content.appendChild(btn);
  }

  const mockBtn = document.createElement('button');
  mockBtn.id = 'btn-mock-mission';
  mockBtn.textContent = 'Run Mock Mission';
  mockBtn.style.marginLeft = '4px';
  mockBtn.addEventListener('click', () => runMockMission());
  content.appendChild(mockBtn);
}

export function renderRouter(appRoot: HTMLElement, state: GameState): void {
  // Debug bar: DEV only, bottom-left, never overlapping header
  const debugBar = initDebugBar();
  if (debugBar && import.meta.env.DEV) {
    updateDebugBar(debugBar, state);
  }

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
}
