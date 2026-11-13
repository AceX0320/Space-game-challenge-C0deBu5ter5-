import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getResearch } from '@/data/index';
import { formatM } from '@/core/units';
import { canResearch, doResearch } from '@/economy/research';
import { getStore } from '@/state/store';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';

export function renderResearch(root: HTMLElement, state: GameState): void {
  const researchNodes = getResearch();

  const ctaBtn = mkPrimary('Return to Contracts →', () => transitionTo('contracts'));
  const backHomeBtn = mkSecondary('← Agency HQ', () => transitionTo('home'));

  const bodyEl = renderShell(root, state, {
    leftActions: [backHomeBtn],
    rightCta: ctaBtn,
    craftName: state.design.name,
    craftStatus: 'nominal',
  });
  bodyEl.style.display = 'flex';
  bodyEl.style.flexDirection = 'column';
  bodyEl.style.padding = 'var(--ls-sp-4)';
  bodyEl.style.gap = 'var(--ls-sp-3)';
  bodyEl.style.overflowY = 'auto';

  // Header banner / inventory readout
  const invPanel = document.createElement('div');
  invPanel.className = 'ls-panel';
  invPanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Planetary Sample Inventory & Research Grants</span>
      <span class="ls-funds">${formatM(state.save.fundsM)} Available</span>
    </div>
    <div class="ls-panel-body">
      <div style="display:flex; flex-wrap:wrap; gap:var(--ls-sp-2); align-items:center;">
        ${
          state.save.inventory.length > 0
            ? state.save.inventory
                .map(
                  (inv) =>
                    `<span class="ls-chip ls-chip-green" style="padding:4px 10px; font-size:var(--ls-size-xs)">
                      📦 <strong>${inv.itemId}:</strong> ${inv.quantity} unit(s)
                    </span>`
                )
                .join('')
            : '<span style="color:var(--ls-text-dim); font-size:var(--ls-size-xs)">No surface samples currently stored. Successfully land scientific probes and deploy scavenging tools to harvest samples.</span>'
        }
      </div>
    </div>
  `;
  bodyEl.appendChild(invPanel);

  // Research nodes grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:var(--ls-sp-3);';

  for (const node of researchNodes) {
    const isUnlocked = state.save.researched.includes(node.id);
    const available = canResearch(node, state.save);

    const card = document.createElement('div');
    card.className = 'ls-panel';
    card.style.cssText = `
      display: flex;
      flex-direction: column;
      border-color: ${isUnlocked ? 'var(--ls-green)' : available ? 'var(--ls-border-mid)' : 'var(--ls-border)'};
      opacity: ${isUnlocked || available ? '1' : '0.6'};
    `;

    card.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">[${node.branch.toUpperCase()}] ${node.name}</span>
        <span class="ls-chip ${isUnlocked ? 'ls-chip-green' : available ? 'ls-chip-orange' : 'ls-chip-dim'}">
          ${isUnlocked ? 'RESEARCHED' : available ? 'AVAILABLE' : 'LOCKED'}
        </span>
      </div>
      <div class="ls-panel-body" style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">
        <p style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); margin-bottom:var(--ls-sp-3); line-height:1.5">
          ${node.description}
        </p>

        <div>
          <div style="font-size:var(--ls-size-xs); font-family:var(--ls-font-mono); margin-bottom:var(--ls-sp-3)">
            <div style="display:flex; justify-content:space-between; padding:2px 0;">
              <span style="color:var(--ls-text-micro)">Cost:</span>
              <span style="color:var(--ls-green)">${formatM(node.costM)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:2px 0;">
              <span style="color:var(--ls-text-micro)">Requires Samples:</span>
              <span style="color:var(--ls-text)">
                ${
                  node.requiresItems.length > 0
                    ? node.requiresItems.map((r) => `${r.quantity}x ${r.itemId}`).join(', ')
                    : 'None (Base technology)'
                }
              </span>
            </div>
          </div>

          <div>
            ${
              isUnlocked
                ? `<div style="color:var(--ls-green); font-family:var(--ls-font-mono); font-size:var(--ls-size-xs); font-weight:600">✓ Technology Researched</div>`
                : available
                  ? `<button class="ls-btn ls-btn-primary" data-research="${node.id}" style="width:100%; justify-content:center;">Unlock Technology (${formatM(node.costM)})</button>`
                  : `<button class="ls-btn" disabled style="width:100%; justify-content:center;">Requirements Not Met</button>`
            }
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  }

  bodyEl.appendChild(grid);

  grid.querySelectorAll('button[data-research]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const nodeId = (e.currentTarget as HTMLElement).getAttribute('data-research');
      const targetNode = researchNodes.find((n) => n.id === nodeId);
      if (targetNode) {
        const updatedSave = doResearch(targetNode, state.save);
        getStore().update({ save: updatedSave });
        renderResearch(root, getStore().getState());
      }
    });
  });
}
