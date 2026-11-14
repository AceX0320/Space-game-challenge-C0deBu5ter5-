import type { GameState } from '@/state/store';
import { getStore } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { renderShell, mkPrimary } from '@/ui/components/shell';
import { formatM } from '@/core/units';
import { writeSave } from '@/economy/save-load';
import type { Difficulty } from '@/types';

export function renderHome(root: HTMLElement, state: GameState): void {
  const startBtn = mkPrimary('Select Flight Contract →', () => transitionTo('contracts'));

  const bodyEl = renderShell(root, state, {
    rightCta: startBtn,
    craftName: state.design.name,
    craftStatus: 'nominal',
  });
  bodyEl.style.display = 'flex';
  bodyEl.style.flexDirection = 'column';
  bodyEl.style.alignItems = 'center';
  bodyEl.style.justifyContent = 'flex-start';
  bodyEl.style.padding = 'var(--ls-sp-6) var(--ls-sp-4) 90px';
  bodyEl.style.overflowY = 'auto';
  bodyEl.style.overscrollBehavior = 'contain';

  const centerBox = document.createElement('div');
  centerBox.style.cssText = 'max-width:720px; width:100%; display:flex; flex-direction:column; gap:var(--ls-sp-4); text-align:center; margin:auto 0;';

  const curDiff = state.save.difficulty;
  const diffDescriptions: Record<Difficulty, string> = {
    easy: 'Relaxed: 1.5× contract budget cap, 0× part wear & tear, +50% larger bullseye landing zones, guided telemetry hints.',
    normal: 'Authentic: 1.0× contract budget cap, standard component degradation per mission, standard planetary gravity & drag.',
    hard: 'Hardcore: 0.8× budget cap, 1.75× accelerated wear & tear, mid-flight random system malfunctions, precision landing required.',
    sandbox: 'Creative: Unlimited agency capital ($999,999M), zero wear & tear, explore all bodies and spacecraft freely.',
  };

  centerBox.innerHTML = `
    <div style="font-family:var(--font-mono); font-size:0.6875rem; color:var(--accent); letter-spacing:0.15em; text-transform:uppercase">
      NASA Space Apps Challenge 2026
    </div>
    <h1 style="font-family:var(--font-ui); font-size:2.4rem; font-weight:700; color:var(--text); letter-spacing:0.75px; margin:0">
      LAUNCHSMITH
    </h1>
    <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin:0 auto; max-width:540px">
      Design, engineer, fly, and land scientific spacecraft across the Solar System. Balance propulsion physics, payload limits, and agency capital.
    </p>

    <!-- Operational Difficulty Selector -->
    <div class="ls-panel" style="text-align:left; margin-top:var(--sp-2);">
      <div class="ls-panel-header">
        <span class="ls-panel-title">Mission Difficulty & Game Mode</span>
        <span class="ls-chip ls-chip-orange" style="text-transform:uppercase">${curDiff} MODE</span>
      </div>
      <div class="ls-panel-body" style="display:flex; flex-direction:column; gap:var(--sp-3);">
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
          ${(['easy', 'normal', 'hard', 'sandbox'] as Difficulty[]).map((d) => `
            <button type="button" class="ls-btn ${curDiff === d ? 'ls-btn-primary' : ''}" data-diff="${d}" style="justify-content:center; text-transform:uppercase; font-weight:700; font-size:0.8125rem; padding:8px 0;">
              ${d}
            </button>
          `).join('')}
        </div>
        <div style="font-size:0.8125rem; color:var(--text-muted); background:var(--bg-inset); padding:8px 12px; border:1px solid var(--border); line-height:1.4;">
          <strong style="color:var(--text); text-transform:uppercase">${curDiff}:</strong> ${diffDescriptions[curDiff]}
        </div>
      </div>
    </div>

    <!-- Agency Standing -->
    <div class="ls-panel" style="text-align:left;">
      <div class="ls-panel-header"><span class="ls-panel-title">Agency Standing</span></div>
      <div class="ls-panel-body" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-3);">
        <div>
          <div class="ls-micro">Available Capital</div>
          <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:var(--ok)">
            ${formatM(state.save.fundsM)}
          </div>
        </div>
        <div>
          <div class="ls-micro">Operational Difficulty</div>
          <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:var(--text); text-transform:uppercase">
            ${state.save.difficulty}
          </div>
        </div>
        <div>
          <div class="ls-micro">Contracts Completed</div>
          <div style="font-family:var(--font-mono); font-size:0.875rem; color:var(--text)">
            ${Object.keys(state.save.completedContracts).length} missions logged
          </div>
        </div>
        <div>
          <div class="ls-micro">Active Craft Blueprint</div>
          <div style="font-family:var(--font-mono); font-size:0.875rem; color:var(--text)">
            ${state.design.name} (${state.design.parts.length} parts)
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex; justify-content:center; gap:var(--ls-sp-3); margin-top:var(--ls-sp-2)">
      <button class="ls-btn ls-btn-primary" id="home-start-btn" style="padding:10px 24px; font-size:var(--ls-size-sm)">
        Accept Contracts
      </button>
      <button class="ls-btn" id="home-research-btn">
        Research Laboratory
      </button>
      ${
        state.flags.teamMode
          ? `<button class="ls-btn" id="home-team-btn">Hot-Seat Review</button>`
          : ''
      }
    </div>
  `;

  bodyEl.appendChild(centerBox);

  // Difficulty selection clicks
  centerBox.querySelectorAll('button[data-diff]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const chosen = (e.currentTarget as HTMLElement).getAttribute('data-diff') as Difficulty;
      if (!chosen || chosen === state.save.difficulty) return;
      const updatedSave = { ...state.save, difficulty: chosen };
      if (chosen === 'sandbox' && updatedSave.fundsM < 999999) {
        updatedSave.fundsM = 999999;
      }
      writeSave(updatedSave);
      getStore().update({ save: updatedSave });
    });
  });

  centerBox.querySelector('#home-start-btn')?.addEventListener('click', () => transitionTo('contracts'));
  centerBox.querySelector('#home-research-btn')?.addEventListener('click', () => transitionTo('research'));
  centerBox.querySelector('#home-team-btn')?.addEventListener('click', () => transitionTo('team'));
}
