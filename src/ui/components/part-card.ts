import type { PartDef } from '@/types';
import { formatM } from '@/core/units';

export interface PartCardOptions {
  isLocked?: boolean;
  lockReason?: string | null;
  onAdd?: (part: PartDef) => void;
}

export function createPartCard(part: PartDef, opts: PartCardOptions = {}): HTMLElement {
  const card = document.createElement('div');
  card.style.cssText = `
    border: 1px solid var(--border);
    border-radius: 0;
    padding: var(--sp-2) var(--sp-3);
    margin-bottom: 4px;
    opacity: ${opts.isLocked ? '0.45' : '1'};
    background: var(--bg-panel);
  `;

  card.innerHTML = `
    <div style="display:flex; align-items:center; gap:var(--ls-sp-2); margin-bottom:4px;">
      <span style="font-size:var(--ls-size-xs); flex:1; color:var(--ls-text); font-weight:500">${part.name}</span>
      <span style="font-family:var(--ls-font-mono); font-size:0.6rem; color:var(--ls-text-micro)">${(part.baseMassKg / 1000).toFixed(2)}t</span>
      <span style="font-family:var(--ls-font-mono); font-size:0.6rem; color:var(--ls-green)">${formatM(part.baseCostM)}</span>
    </div>
    ${opts.lockReason ? `<div style="font-size:0.6rem; color:var(--ls-amber); margin-bottom:4px; line-height:1.3">${opts.lockReason}</div>` : ''}
    <div style="display:flex; gap:var(--ls-sp-2); align-items:center;">
      <span class="ls-chip ls-chip-dim" style="font-size:0.6rem; padding:1px 5px">${part.category}</span>
      ${
        !opts.isLocked
          ? `<button class="ls-btn" style="font-size:0.6rem; padding:2px 8px; margin-left:auto;" data-add-part="${part.id}">+ ADD</button>`
          : ''
      }
    </div>
  `;

  if (!opts.isLocked && opts.onAdd) {
    card.querySelector(`[data-add-part="${part.id}"]`)?.addEventListener('click', () => {
      opts.onAdd?.(part);
    });
  }

  return card;
}
