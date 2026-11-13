import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { renderShell, mkPrimary } from '@/ui/components/shell';
import { formatM } from '@/core/units';

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
  bodyEl.style.justifyContent = 'center';
  bodyEl.style.padding = 'var(--ls-sp-8) var(--ls-sp-4)';

  const centerBox = document.createElement('div');
  centerBox.style.cssText = 'max-width:680px; width:100%; display:flex; flex-direction:column; gap:var(--ls-sp-4); text-align:center;';

  centerBox.innerHTML = `
    <div style="font-family:var(--ls-font-mono); font-size:var(--ls-size-xs); color:var(--ls-orange); letter-spacing:0.15em; text-transform:uppercase">
      NASA Space Apps Challenge 2026
    </div>
    <h1 style="font-size:2.4rem; font-weight:700; color:var(--ls-text); letter-spacing:0.02em; margin:0">
      LAUNCHSMITH
    </h1>
    <p style="font-size:var(--ls-size-base); color:var(--ls-text-dim); line-height:1.6; margin:0 auto; max-width:540px">
      Design, engineer, fly, and land scientific spacecraft across the Solar System. Balance propulsion physics, payload limits, and agency capital.
    </p>

    <div class="ls-panel" style="text-align:left; margin-top:var(--ls-sp-2);">
      <div class="ls-panel-header"><span class="ls-panel-title">Agency Standing</span></div>
      <div class="ls-panel-body" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--ls-sp-3);">
        <div>
          <div class="ls-micro">Available Capital</div>
          <div style="font-family:var(--ls-font-mono); font-size:var(--ls-size-lg); font-weight:700; color:var(--ls-green)">
            ${formatM(state.save.fundsM)}
          </div>
        </div>
        <div>
          <div class="ls-micro">Operational Difficulty</div>
          <div style="font-family:var(--ls-font-mono); font-size:var(--ls-size-lg); font-weight:700; color:var(--ls-text); text-transform:uppercase">
            ${state.save.difficulty}
          </div>
        </div>
        <div>
          <div class="ls-micro">Contracts Completed</div>
          <div style="font-family:var(--ls-font-mono); font-size:var(--ls-size-base); color:var(--ls-text)">
            ${Object.keys(state.save.completedContracts).length} missions logged
          </div>
        </div>
        <div>
          <div class="ls-micro">Active Craft Blueprint</div>
          <div style="font-family:var(--ls-font-mono); font-size:var(--ls-size-base); color:var(--ls-text)">
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

  centerBox.querySelector('#home-start-btn')?.addEventListener('click', () => transitionTo('contracts'));
  centerBox.querySelector('#home-research-btn')?.addEventListener('click', () => transitionTo('research'));
  centerBox.querySelector('#home-team-btn')?.addEventListener('click', () => transitionTo('team'));
}
