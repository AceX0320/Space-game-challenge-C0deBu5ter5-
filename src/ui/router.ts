import type { GameState } from '@/state/store';
import { renderHome } from './screens/home';
import { renderContracts } from './screens/contracts';
import { renderHangar } from './screens/hangar';
import { renderPreflight } from './screens/preflight';
import { renderFlight } from './screens/flight';
import { renderScavenge } from './screens/scavenge';
import { renderResults } from './screens/results';
import { renderResearch } from './screens/research';
import { renderTeam } from './screens/team';

export function renderRouter(appRoot: HTMLElement, state: GameState): void {
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
