/**
 * Screen 05: Results → results phase
 * No Figma frame found — built from shared shell and design language.
 * Score breakdown, payout lines, streak multipliers, funding gate, full report.
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getContracts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { formatM } from '@/core/units';

export function renderResults(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find(c => c.id === state.activeContractId) ?? contracts[0]!;

  const payout = state.payout;
  const report = state.report;

  // Buttons
  const nextBtn = mkPrimary('Next Contract →', () => transitionTo('contracts'));
  const researchBtn = mkSecondary('Research Lab', () => transitionTo('research'));
  const replayBtn = mkSecondary('Replay Mission', () => transitionTo('hangar'));

  const flightOutcome = state.missionResult?.flight?.outcome;
  const outcomeLabel = flightOutcome
    ? { soft: 'SOFT LANDING', rough: 'ROUGH LANDING', crash: 'MISSION FAILURE — CRASH', abort: 'MISSION ABORTED' }[flightOutcome]
    : '—';
  const outcomePillClass = flightOutcome === 'soft' ? 'ls-chip-green'
    : flightOutcome === 'rough' ? 'ls-chip-amber'
    : 'ls-chip-dim';

  const bodyEl = renderShell(root, state, {
    leftActions: [replayBtn, researchBtn],
    rightCta: nextBtn,
    craftName: state.design.name,
    craftStatus: flightOutcome === 'soft' ? 'nominal' : flightOutcome === 'rough' ? 'warning' : 'error',
  });
  bodyEl.style.display = 'flex';
  bodyEl.style.padding = 'var(--ls-sp-4)';
  bodyEl.style.gap = 'var(--ls-sp-4)';
  bodyEl.style.overflowY = 'auto';

  if (!payout || !report) {
    // No result data — user jumped here directly (dev only)
    bodyEl.innerHTML = `
      <div style="margin:auto; text-align:center; color:var(--ls-text-dim);">
        <div style="font-size:2rem; margin-bottom:var(--ls-sp-3)">📊</div>
        <div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">No mission result available</div>
        <div style="font-size:var(--ls-size-xs)">Use the debug bar to run a mock mission first.</div>
      </div>`;
    return;
  }

  // ── Left column ──────────────────────────────────────
  const leftCol = document.createElement('div');
  leftCol.style.cssText = 'flex:1; display:flex; flex-direction:column; gap:var(--ls-sp-3); min-width:0;';

  // Outcome banner
  const bannerColor = flightOutcome === 'soft' ? 'var(--ls-green)' : flightOutcome === 'rough' ? 'var(--ls-amber)' : 'var(--ls-red)';
  const banner = document.createElement('div');
  banner.style.cssText = `border:1px solid ${bannerColor}; background:${bannerColor}18; border-radius:var(--ls-radius-md); padding:var(--ls-sp-4); display:flex; align-items:center; gap:var(--ls-sp-4);`;
  banner.innerHTML = `
    <div style="font-size:2.5rem">${flightOutcome === 'soft' ? '🎉' : flightOutcome === 'rough' ? '⚠️' : '💥'}</div>
    <div style="flex:1">
      <div style="font-family:var(--ls-font-mono); font-size:var(--ls-size-lg); font-weight:700; color:${bannerColor}; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px">
        ${outcomeLabel}
      </div>
      <div style="font-size:var(--ls-size-xs); color:var(--ls-text-dim)">${report.headline}</div>
    </div>
    <div>
      <span class="ls-chip ${outcomePillClass}">${outcomeLabel}</span>
      ${payout.isRecord ? '<span class="ls-chip ls-chip-orange" style="margin-left:4px">NEW RECORD</span>' : ''}
    </div>
  `;
  leftCol.appendChild(banner);

  // Financial settlement
  const finPanel = document.createElement('div');
  finPanel.className = 'ls-panel';
  finPanel.innerHTML = `
    <div class="ls-panel-header"><span class="ls-panel-title">Financial Settlement</span></div>
    <div class="ls-panel-body">
      ${[
        ['Contract Reward',   formatM(contract.rewardM),     'var(--ls-text-dim)'],
        [`Streak ×${payout.streakMultiplier.toFixed(2)}`, '', 'var(--ls-text-dim)'],
        ['Gross Reward',      `+${formatM(payout.grossRewardM)}`, 'var(--ls-green)'],
        ['separator', '', ''],
        ['Build Cost',        `-${formatM(payout.buildCostM)}`,  'var(--ls-red)'],
        ['Launch Cost',       `-${formatM(payout.launchCostM)}`, 'var(--ls-red)'],
        ['Repair Cost',       `-${formatM(payout.repairCostM)}`, 'var(--ls-red)'],
        ['separator', '', ''],
        ['Net Result',        `${payout.netM >= 0 ? '+' : ''}${formatM(payout.netM)}`, payout.netM >= 0 ? 'var(--ls-green)' : 'var(--ls-red)'],
        ['Agency Funds Now',  formatM(state.save.fundsM), 'var(--ls-green)'],
      ].map(([label, value, color]) => label === 'separator'
        ? `<div style="border-top:1px solid var(--ls-border); margin:4px 0;"></div>`
        : `<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:var(--ls-size-xs);">
            <span style="color:var(--ls-text-dim); font-family:var(--ls-font-mono); text-transform:uppercase; letter-spacing:0.06em">${label}</span>
            <span style="font-family:var(--ls-font-mono); font-weight:600; color:${color}">${value}</span>
           </div>`).join('')}

      <!-- Funding gate progress -->
      <div class="ls-meter" style="margin-top:var(--ls-sp-3)">
        <div class="ls-meter-row">
          <span class="ls-meter-label">Funding Gate Progress</span>
          <span class="ls-meter-value">${formatM(state.save.fundsM)} / ${formatM(contract.fundingGateM)}</span>
        </div>
        <div class="ls-meter-track">
          <div class="ls-meter-fill ${state.save.fundsM >= contract.fundingGateM ? 'ok' : 'info'}"
            style="width:${Math.min(100, (state.save.fundsM / contract.fundingGateM) * 100).toFixed(0)}%"></div>
        </div>
      </div>
    </div>
  `;
  leftCol.appendChild(finPanel);

  // Mission timeline
  if (report.timeline.length) {
    const tlPanel = document.createElement('div');
    tlPanel.className = 'ls-panel';
    tlPanel.innerHTML = `
      <div class="ls-panel-header"><span class="ls-panel-title">Mission Timeline</span></div>
      <div class="ls-panel-body" style="max-height:160px; overflow-y:auto;">
        ${report.timeline.map(ev => {
          const color = ev.kind === 'failure' || ev.kind === 'malfunction' ? 'var(--ls-red)'
            : ev.kind === 'warning' ? 'var(--ls-amber)'
            : ev.kind === 'milestone' ? 'var(--ls-green)'
            : 'var(--ls-text-dim)';
          return `<div style="display:flex; gap:var(--ls-sp-2); padding:3px 0; border-bottom:1px solid var(--ls-border); font-size:var(--ls-size-xs);">
            <span style="color:var(--ls-text-micro); font-family:var(--ls-font-mono); flex-shrink:0">T+${ev.tS.toFixed(0)}s</span>
            <span style="color:${color}">${ev.text}</span>
          </div>`;
        }).join('')}
      </div>
    `;
    leftCol.appendChild(tlPanel);
  }

  bodyEl.appendChild(leftCol);

  // ── Right column ──────────────────────────────────────
  const rightCol = document.createElement('div');
  rightCol.style.cssText = 'width:300px; flex-shrink:0; display:flex; flex-direction:column; gap:var(--ls-sp-3);';

  // Score breakdown
  const scorePanel = document.createElement('div');
  scorePanel.className = 'ls-panel';
  scorePanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Performance Score</span>
      <span style="font-family:var(--ls-font-mono); font-size:var(--ls-size-lg); font-weight:700; color:var(--ls-orange)">${payout.score.total}<span style="font-size:var(--ls-size-xs); color:var(--ls-text-dim)"> / 100</span></span>
    </div>
    <div class="ls-panel-body">
      ${([ ['Landing Accuracy', payout.score.landing],
            ['Science Yield',    payout.score.science],
            ['Efficiency',       payout.score.efficiency],
            ['Decisions',        payout.score.decisions],
            ['Team Bonus',       payout.score.teamBonus],
          ] as [string, number][]).map(([label, val]) => `
        <div class="ls-meter" style="margin-bottom:var(--ls-sp-2)">
          <div class="ls-meter-row">
            <span class="ls-meter-label">${label}</span>
            <span class="ls-meter-value">${val}<span style="color:var(--ls-text-micro)">/ 100</span></span>
          </div>
          <div class="ls-meter-track">
            <div class="ls-meter-fill ${val >= 80 ? 'ok' : val >= 50 ? 'warn' : 'bad'}" style="width:${val}%"></div>
          </div>
        </div>`).join('')}
    </div>
  `;
  rightCol.appendChild(scorePanel);

  // Mission causes
  const causesPanel = document.createElement('div');
  causesPanel.className = 'ls-panel';
  causesPanel.innerHTML = `
    <div class="ls-panel-header"><span class="ls-panel-title">Flight Analysis</span></div>
    <div class="ls-panel-body">
      ${report.causes.map(c => `
        <div class="ls-advisory ${c.severity === 'critical' ? 'error' : c.severity === 'warning' ? '' : c.severity === 'good' ? 'ok' : 'info'}">
          <div class="ls-advisory-title">${c.severity.toUpperCase()}</div>
          ${c.text}
        </div>`).join('')}
    </div>
  `;
  rightCol.appendChild(causesPanel);

  // Suggestions
  if (report.suggestions.length) {
    const sugPanel = document.createElement('div');
    sugPanel.className = 'ls-panel';
    sugPanel.innerHTML = `
      <div class="ls-panel-header"><span class="ls-panel-title">NASA Advisory</span></div>
      <div class="ls-panel-body">
        ${report.suggestions.map(s => `<div class="ls-advisory info" style="margin-bottom:4px"><div class="ls-advisory-title">Recommendation</div>${s}</div>`).join('')}
        ${report.similarRealMission ? `
          <div style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); border-top:1px solid var(--ls-border); padding-top:var(--ls-sp-2); margin-top:var(--ls-sp-2);">
            🏛 Historical benchmark:<br><em style="color:var(--ls-text)">${report.similarRealMission}</em>
          </div>` : ''}
      </div>
    `;
    rightCol.appendChild(sugPanel);
  }

  bodyEl.appendChild(rightCol);
}
