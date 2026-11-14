import type { Difficulty, PartDef, PartInstance } from '@/types';
import { formatM } from '@/core/units';

export interface BudgetPanelOptions {
  costM: number;
  budgetCapM: number;
  fundsM: number;
  difficulty: Difficulty;
  installedParts: PartInstance[];
  catalog: PartDef[];
  onRemovePart?: (instanceId: string) => void;
  onReviewParts?: () => void;
}

// Track whether popup was shown for current over-budget state
let wasOverBudget = false;
let toastShownForCap = false;

/**
 * Creates the large high-visibility budget panel for the Hangar screen.
 */
export function createBudgetPanel(opts: BudgetPanelOptions): {
  element: HTMLElement;
  setPreviewCost: (partCostM: number | null) => void;
} {
  const container = document.createElement('div');
  container.className = 'ls-panel budget-panel-container';
  container.style.cssText = 'border-bottom: 2px solid var(--border); margin-bottom: var(--sp-3);';

  const isSandbox = opts.difficulty === 'sandbox';
  const isOver = !isSandbox && opts.costM > opts.budgetCapM;
  const overByM = Math.max(0, opts.costM - opts.budgetCapM);
  const remainingM = opts.budgetCapM - opts.costM;
  const pct = isSandbox ? 0 : Math.min(100, (opts.costM / opts.budgetCapM) * 100);

  // Trigger popup when first crossing the cap
  if (isOver && !wasOverBudget) {
    wasOverBudget = true;
    setTimeout(() => {
      showOverBudgetModal(opts);
    }, 100);
  } else if (!isOver) {
    wasOverBudget = false; // Re-arm popup when returning under cap
  }

  // 90% Toast warning
  if (!isSandbox && pct >= 90 && pct <= 100 && !toastShownForCap) {
    toastShownForCap = true;
    showBudgetToast(`Notice: Budget is at ${pct.toFixed(0)}% of the allowed cap.`);
  } else if (pct < 85) {
    toastShownForCap = false;
  }

  const fillClass = pct > 100 || isOver ? 'bad' : pct >= 80 ? 'warn' : 'ok';

  container.innerHTML = `
    <div class="ls-panel-header" style="padding: 8px 12px;">
      <span class="ls-panel-title">Mission Budget & Allocation</span>
      <span class="ls-chip ${isSandbox ? 'ls-chip-green' : isOver ? 'ls-chip-orange' : 'ls-chip-green'}">
        ${isSandbox ? 'SANDBOX' : isOver ? 'OVER CAP' : 'NOMINAL'}
      </span>
    </div>
    <div class="ls-panel-body" style="padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
      <!-- Three Big Numbers -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center;">
        <div style="background: var(--bg-card); padding: 8px; border: 1px solid var(--border);">
          <div class="ls-micro" style="margin-bottom: 2px;">Used</div>
          <div style="font-family: var(--font-mono); font-size: 1.1875rem; font-weight: 700; color: ${isOver ? 'var(--danger)' : 'var(--text)'};" id="budget-used-num">
            ${formatM(opts.costM)}
          </div>
        </div>
        <div style="background: var(--bg-card); padding: 8px; border: 1px solid var(--border);">
          <div class="ls-micro" style="margin-bottom: 2px;">Cap</div>
          <div style="font-family: var(--font-mono); font-size: 1.1875rem; font-weight: 700; color: var(--ok);">
            ${isSandbox ? 'UNLIMITED' : formatM(opts.budgetCapM)}
          </div>
        </div>
        <div style="background: var(--bg-card); padding: 8px; border: 1px solid var(--border);">
          <div class="ls-micro" style="margin-bottom: 2px;">${isOver ? 'Over By' : 'Remaining'}</div>
          <div style="font-family: var(--font-mono); font-size: 1.1875rem; font-weight: 700; color: ${isOver ? 'var(--danger)' : 'var(--ok)'};" id="budget-remain-num">
            ${isSandbox ? '—' : isOver ? `+${formatM(overByM)}` : formatM(remainingM)}
          </div>
        </div>
      </div>

      <!-- Wide Budget Bar with Cap Marker and Ghost Preview -->
      <div style="margin-top: 4px;">
        <div style="position: relative; height: 10px; background: var(--bg-inset); border: 1px solid var(--border); overflow: hidden;">
          <!-- Actual Fill -->
          <div class="ls-meter-fill ${fillClass}" id="budget-bar-fill" style="position: absolute; left: 0; top: 0; height: 100%; width: ${Math.min(100, pct)}%; transition: width 0.2s ease;"></div>
          <!-- Ghost Preview Bar -->
          <div id="budget-bar-ghost" style="position: absolute; top: 0; height: 100%; width: 0; opacity: 0.6; display: none; transition: width 0.15s ease;"></div>
          <!-- Cap marker at 100% (right edge or reference line) -->
          <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 2px; background: var(--text); z-index: 2;" title="Budget Cap (100%)"></div>
        </div>
        <!-- Ghost text readout -->
        <div id="budget-ghost-text" style="font-family: var(--font-mono); font-size: 0.75rem; margin-top: 4px; display: none;"></div>
      </div>

      <!-- Agency Funds Line -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid var(--border); font-size: 0.8125rem; font-family: var(--font-mono); color: var(--text-muted);">
        <span>Available Agency Funds:</span>
        <span style="font-weight: 700; color: var(--ok); font-size: 0.9375rem;">${formatM(opts.fundsM)}</span>
      </div>

      ${
        isOver
          ? `
        <div style="background: rgba(224, 53, 53, 0.12); border: 1px solid var(--danger); padding: 8px 10px; display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--danger);">
          <span style="font-weight: 700; font-family: var(--font-mono);">[!] BUDGET EXCEEDED:</span>
          <span>Launch authority denied until within cap.</span>
        </div>`
          : ''
      }
    </div>
  `;

  // Ghost preview updater
  const ghostBar = container.querySelector('#budget-bar-ghost') as HTMLElement;
  const ghostText = container.querySelector('#budget-ghost-text') as HTMLElement;

  function setPreviewCost(partCostM: number | null): void {
    if (isSandbox || partCostM === null || partCostM <= 0) {
      if (ghostBar) ghostBar.style.display = 'none';
      if (ghostText) ghostText.style.display = 'none';
      return;
    }

    const projectedCostM = opts.costM + partCostM;
    const projectedPct = (projectedCostM / opts.budgetCapM) * 100;
    const willExceed = projectedCostM > opts.budgetCapM;

    if (ghostBar) {
      ghostBar.style.display = 'block';
      const basePct = Math.min(100, pct);
      const addedPct = Math.min(100 - basePct, (partCostM / opts.budgetCapM) * 100);

      ghostBar.style.left = `${basePct}%`;
      ghostBar.style.width = `${addedPct}%`;
      ghostBar.style.background = willExceed ? 'var(--danger)' : 'var(--accent)';
    }

    if (ghostText) {
      ghostText.style.display = 'block';
      if (willExceed) {
        ghostText.style.color = 'var(--danger)';
        ghostText.textContent = `+${formatM(partCostM)} → ${formatM(projectedCostM)} (Exceeds cap by ${formatM(projectedCostM - opts.budgetCapM)})`;
      } else {
        ghostText.style.color = 'var(--text-muted)';
        ghostText.textContent = `+${formatM(partCostM)} → Projected: ${formatM(projectedCostM)} (${projectedPct.toFixed(0)}%)`;
      }
    }
  }

  return { element: container, setPreviewCost };
}

/**
 * High-priority accessible alert dialog when budget cap is exceeded.
 */
export function showOverBudgetModal(opts: BudgetPanelOptions): void {
  // Identify 3 most expensive installed parts
  const partCosts = opts.installedParts
    .map((inst) => {
      const def = opts.catalog.find((d) => d.id === inst.partId);
      return {
        instanceId: inst.instanceId,
        name: def?.name ?? inst.partId,
        costM: def?.baseCostM ?? 0,
      };
    })
    .sort((a, b) => b.costM - a.costM)
    .slice(0, 3);

  const overByM = opts.costM - opts.budgetCapM;

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'budget-dialog-title');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(14, 14, 15, 0.88);
    display: flex; align-items: center; justify-content: center; z-index: 2000;
  `;

  const dialog = document.createElement('div');
  dialog.className = 'ls-panel';
  dialog.style.cssText = `
    max-width: 480px; width: 92%; border: 2px solid var(--danger);
    background: var(--bg-panel); border-radius: 0; box-shadow: 0 0 0 1px var(--border);
  `;

  dialog.innerHTML = `
    <div class="ls-panel-header" style="background: rgba(224,53,53,0.15); border-bottom: 1px solid var(--danger); padding: 10px 14px;">
      <span class="ls-panel-title" id="budget-dialog-title" style="color: var(--danger); font-size: 0.9375rem;">
        [!] BUDGET CAP EXCEEDED
      </span>
      <button class="ls-btn ls-btn-ghost" style="padding: 2px 6px; font-size: 0.875rem;" id="btn-budget-close" aria-label="Close dialog">✕</button>
    </div>
    <div class="ls-panel-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
      <p style="font-size: 0.9375rem; color: var(--text); line-height: 1.5; margin: 0;">
        The current spacecraft configuration exceeds the designated contract budget cap. Spacecraft cannot be authorized for launch while over budget.
      </p>

      <!-- Key Figures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; background: var(--bg-card); padding: 10px; border: 1px solid var(--border);">
        <div>
          <div class="ls-micro">Cost</div>
          <div style="font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; color: var(--danger);">${formatM(opts.costM)}</div>
        </div>
        <div>
          <div class="ls-micro">Cap</div>
          <div style="font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; color: var(--ok);">${formatM(opts.budgetCapM)}</div>
        </div>
        <div>
          <div class="ls-micro">Over By</div>
          <div style="font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; color: var(--danger);">+${formatM(overByM)}</div>
        </div>
      </div>

      <!-- Top Cost Drivers -->
      <div>
        <div class="ls-micro" style="margin-bottom: 6px;">Highest Cost Components:</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${partCosts
            .map(
              (p) => `
            <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-family: var(--font-mono); padding: 4px 6px; background: var(--bg-inset); border: 1px solid var(--border);">
              <span>${p.name}</span>
              <span style="color: var(--warn);">${formatM(p.costM)}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
        ${
          opts.installedParts.length > 0
            ? `<button class="ls-btn ls-btn-primary" id="btn-remove-last" style="width: 100%; justify-content: center; background: var(--danger); border-color: var(--danger);">
                Remove Last Added Part
              </button>`
            : ''
        }
        <button class="ls-btn" id="btn-review-parts" style="width: 100%; justify-content: center;">
          Review Installed Hardware
        </button>
        <button class="ls-btn ls-btn-ghost" id="btn-keep-anyway" style="width: 100%; justify-content: center; font-size: 0.8125rem;">
          Keep Anyway (Fix Later)
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  function closeDialog(): void {
    overlay.remove();
  }

  // Focus trap / Keyboard Escape
  const closeBtn = dialog.querySelector('#btn-budget-close') as HTMLElement;
  const removeBtn = dialog.querySelector('#btn-remove-last') as HTMLElement;
  const reviewBtn = dialog.querySelector('#btn-review-parts') as HTMLElement;
  const keepBtn = dialog.querySelector('#btn-keep-anyway') as HTMLElement;

  (removeBtn ?? reviewBtn ?? closeBtn)?.focus();

  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDialog();
      window.removeEventListener('keydown', handleKeydown);
    }
  };
  window.addEventListener('keydown', handleKeydown);

  closeBtn?.addEventListener('click', () => {
    closeDialog();
    window.removeEventListener('keydown', handleKeydown);
  });

  removeBtn?.addEventListener('click', () => {
    const lastPart = opts.installedParts[opts.installedParts.length - 1];
    if (lastPart) {
      opts.onRemovePart?.(lastPart.instanceId);
    }
    closeDialog();
    window.removeEventListener('keydown', handleKeydown);
  });

  reviewBtn?.addEventListener('click', () => {
    opts.onReviewParts?.();
    closeDialog();
    window.removeEventListener('keydown', handleKeydown);
  });

  keepBtn?.addEventListener('click', () => {
    closeDialog();
    window.removeEventListener('keydown', handleKeydown);
  });
}

/**
 * Lightweight non-blocking toast warning.
 */
function showBudgetToast(message: string): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 68px; right: 20px; z-index: 1500;
    background: var(--bg-card); border: 1px solid var(--warn);
    color: var(--warn); font-family: var(--font-mono); font-size: 0.8125rem;
    padding: 8px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    animation: fadeIn 0.2s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
