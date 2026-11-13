import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getContracts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { formatM } from '@/core/units';
import { setActiveContract } from '@/state/actions';

export function renderContracts(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';
  const contracts = getContracts();

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Flight Contracts</h1>
      <p style="color:var(--text-dim)">Choose a scientific objective and target destination</p>
    </div>
    <div style="font-weight:bold; color:var(--accent)">Available Funds: ${formatM(state.save.fundsM)}</div>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'grid-2';

  for (const c of contracts) {
    const isUnlocked = state.save.unlockedContractIds.includes(c.id);
    const completed = state.save.completedContracts[c.id];

    const card = createPanel(
      `${c.title} — ${c.bodyId.toUpperCase()}`,
      `
      <p style="margin-bottom:0.5rem"><strong>Objective:</strong> ${c.objective}</p>
      <p style="font-size:0.9rem; color:var(--text-dim)">Required: ${c.requiredInstruments.join(', ')}</p>
      <div style="margin:0.75rem 0; font-size:0.9rem">
        <span>Cap: <strong>${formatM(c.budgetCapM)}</strong></span> |
        <span>Reward: <strong>${formatM(c.rewardM)}</strong></span> |
        <span>Gate: <strong>${formatM(c.fundingGateM)}</strong></span>
      </div>
      ${completed ? `<p style="color:var(--accent); font-size:0.85rem">✓ Best Net: ${formatM(completed.bestNetM)} (Score: ${completed.bestScore})</p>` : ''}
      <div style="margin-top:1rem">
        ${
          isUnlocked
            ? `<button class="primary" data-contract="${c.id}">Accept & Open Hangar</button>`
            : `<button disabled style="opacity:0.5">Locked (Requires ${formatM(c.fundingGateM)})</button>`
        }
      </div>
      `
    );
    grid.appendChild(card);
  }

  container.appendChild(grid);
  root.appendChild(container);

  root.querySelectorAll('button[data-contract]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const contractId = (e.currentTarget as HTMLElement).getAttribute('data-contract');
      if (contractId) {
        setActiveContract(contractId);
        transitionTo('hangar');
      }
    });
  });
}
