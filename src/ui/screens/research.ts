import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getResearch } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { formatM } from '@/core/units';
import { canResearch, doResearch } from '@/economy/research';
import { getStore } from '@/state/store';

export function renderResearch(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';
  const researchNodes = getResearch();

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Planetary Materials Research Laboratory</h1>
      <p style="color:var(--text-dim)">Synthesize samples into advanced aerospace technologies</p>
    </div>
    <div>
      <button class="primary" id="btn-back-contracts">← Return to Contracts</button>
    </div>
  `;
  container.appendChild(header);

  // Inventory readout
  const invPanel = createPanel(
    `Laboratory Sample Storage & Available Funds: ${formatM(state.save.fundsM)}`,
    `
    <div style="display:flex; flex-wrap:wrap; gap:0.75rem">
      ${
        state.save.inventory.length > 0
          ? state.save.inventory
              .map(
                (inv) =>
                  `<span style="background:#1e293b; border:1px solid var(--border); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.85rem">
                    📦 <strong>${inv.itemId}:</strong> ${inv.quantity} unit(s)
                  </span>`
              )
              .join('')
          : '<span style="color:var(--text-dim)">No scientific samples currently in inventory. Complete scavenging missions to retrieve samples.</span>'
      }
    </div>
    `
  );
  container.appendChild(invPanel);

  // Research tree nodes grid
  const grid = document.createElement('div');
  grid.className = 'grid-2';

  for (const node of researchNodes) {
    const isUnlocked = state.save.researched.includes(node.id);
    const available = canResearch(node, state.save);

    const card = createPanel(
      `[${node.branch.toUpperCase()}] ${node.name}`,
      `
      <p style="margin-bottom:0.5rem">${node.description}</p>
      <div style="font-size:0.85rem; color:var(--text-dim); margin-bottom:0.75rem">
        <div><strong>Cost:</strong> ${formatM(node.costM)}</div>
        <div><strong>Requires:</strong> ${
          node.requiresItems.length > 0
            ? node.requiresItems.map((r) => `${r.quantity}x ${r.itemId}`).join(', ')
            : 'None (Base technology)'
        }</div>
      </div>
      <div>
        ${
          isUnlocked
            ? `<span style="color:var(--accent); font-weight:bold">✓ Researched & Active</span>`
            : available
              ? `<button class="accent" data-research="${node.id}">Unlock Upgrade (${formatM(node.costM)})</button>`
              : `<button disabled style="opacity:0.5">Requirements Not Met</button>`
        }
      </div>
      `
    );
    grid.appendChild(card);
  }

  container.appendChild(grid);
  root.appendChild(container);

  root.querySelector('#btn-back-contracts')?.addEventListener('click', () => {
    transitionTo('contracts');
  });

  root.querySelectorAll('button[data-research]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const nodeId = (e.currentTarget as HTMLElement).getAttribute('data-research');
      const targetNode = researchNodes.find((n) => n.id === nodeId);
      if (targetNode) {
        const updatedSave = doResearch(targetNode, state.save);
        getStore().update({ save: updatedSave });
      }
    });
  });
}

