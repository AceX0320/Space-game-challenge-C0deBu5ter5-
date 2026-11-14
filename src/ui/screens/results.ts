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
        <div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">No mission result available</div>
        <div style="font-size:var(--ls-size-xs)">Use the debug bar to run a mock mission first.</div>
      </div>`;
    return;
  }

  // ── Left column ──────────────────────────────────────
  const leftCol = document.createElement('div');
  leftCol.style.cssText = 'flex:1; display:flex; flex-direction:column; gap:var(--ls-sp-3); min-width:0;';

  // Outcome banner
  const bannerColor = flightOutcome === 'soft' ? 'var(--ok)' : flightOutcome === 'rough' ? 'var(--warn)' : 'var(--danger)';
  const banner = document.createElement('div');
  banner.style.cssText = `border:1px solid ${bannerColor}; background:${bannerColor}18; border-radius:0; padding:var(--sp-4); display:flex; align-items:center; gap:var(--sp-4);`;
  banner.innerHTML = `
    <div style="border-left:4px solid ${bannerColor}; padding-left:var(--sp-3); flex:1">
      <div style="font-family:var(--font-mono); font-size:1.375rem; font-weight:700; color:${bannerColor}; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:6px">
        ${outcomeLabel}
      </div>
      <div style="font-size:1.125rem; color:var(--text); font-weight:500">${report.headline}</div>
    </div>
    <div>
      <span class="ls-chip ${outcomePillClass}" style="font-size:0.875rem; padding:4px 10px;">${outcomeLabel}</span>
      ${payout.isRecord ? '<span class="ls-chip ls-chip-orange" style="font-size:0.875rem; padding:4px 10px; margin-left:6px">NEW RECORD</span>' : ''}
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
        ['Contract Reward',   formatM(contract.rewardM),     'var(--text-muted)'],
        [`Streak ×${payout.streakMultiplier.toFixed(2)}`, '', 'var(--text-muted)'],
        ['Gross Reward',      `+${formatM(payout.grossRewardM)}`, 'var(--ok)'],
        ['separator', '', ''],
        ['Build Cost',        `-${formatM(payout.buildCostM)}`,  'var(--danger)'],
        ['Launch Cost',       `-${formatM(payout.launchCostM)}`, 'var(--danger)'],
        ['Repair Cost',       `-${formatM(payout.repairCostM)}`, 'var(--danger)'],
        ['separator', '', ''],
        ['Net Result',        `${payout.netM >= 0 ? '+' : ''}${formatM(payout.netM)}`, payout.netM >= 0 ? 'var(--ok)' : 'var(--danger)'],
        ['Agency Funds Now',  formatM(state.save.fundsM), 'var(--ok)'],
      ].map(([label, value, color]) => label === 'separator'
        ? `<div style="border-top:1px solid var(--border); margin:6px 0;"></div>`
        : `<div style="display:flex; justify-content:space-between; align-items:center; min-height:44px; padding:4px 0; font-size:1rem; border-bottom:1px solid rgba(42,42,43,0.5);">
            <span style="color:var(--text-muted); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.06em">${label}</span>
            <span style="font-family:var(--font-mono); font-weight:700; color:${color}">${value}</span>
           </div>`).join('')}

      <!-- Funding gate progress -->
      <div class="ls-meter" style="margin-top:var(--sp-4)">
        <div class="ls-meter-row">
          <span class="ls-meter-label" style="font-size:0.875rem">Funding Gate Progress</span>
          <span class="ls-meter-value" style="font-size:0.875rem">${formatM(state.save.fundsM)} / ${formatM(contract.fundingGateM)}</span>
        </div>
        <div class="ls-meter-track" style="height:8px;">
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
      <div class="ls-panel-body" style="max-height:180px; overflow-y:auto;">
        ${report.timeline.map(ev => {
          const color = ev.kind === 'failure' || ev.kind === 'malfunction' ? 'var(--danger)'
            : ev.kind === 'warning' ? 'var(--warn)'
            : ev.kind === 'milestone' ? 'var(--ok)'
            : 'var(--text-muted)';
          return `<div style="display:flex; gap:var(--sp-3); padding:6px 0; border-bottom:1px solid var(--border); font-size:0.875rem;">
            <span style="color:var(--text-muted); font-family:var(--font-mono); flex-shrink:0">T+${ev.tS.toFixed(0)}s</span>
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
  rightCol.style.cssText = 'width:340px; flex-shrink:0; display:flex; flex-direction:column; gap:var(--sp-3);';

  // Score breakdown
  const scorePanel = document.createElement('div');
  scorePanel.className = 'ls-panel';
  scorePanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Performance Score</span>
      <span style="font-family:var(--font-mono); font-size:1.75rem; font-weight:700; color:var(--accent)">${payout.score.total}<span style="font-size:0.875rem; color:var(--text-muted)"> / 100</span></span>
    </div>
    <div class="ls-panel-body">
      ${([ ['Landing Accuracy', payout.score.landing],
            ['Science Yield',    payout.score.science],
            ['Efficiency',       payout.score.efficiency],
            ['Decisions',        payout.score.decisions],
            ['Team Bonus',       payout.score.teamBonus],
          ] as [string, number][]).map(([label, val]) => `
        <div class="ls-meter" style="margin-bottom:var(--sp-3)">
          <div class="ls-meter-row">
            <span class="ls-meter-label" style="font-size:0.8125rem">${label}</span>
            <span class="ls-meter-value" style="font-size:0.9375rem">${val}<span style="color:var(--text-muted)">/ 100</span></span>
          </div>
          <div class="ls-meter-track" style="height:8px;">
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
        <div class="ls-advisory ${c.severity === 'critical' ? 'error' : c.severity === 'warning' ? '' : c.severity === 'good' ? 'ok' : 'info'}" style="font-size:0.9375rem; margin-bottom:var(--sp-2)">
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
            Historical benchmark:<br><em style="color:var(--ls-text)">${report.similarRealMission}</em>
          </div>` : ''}
      </div>
    `;
    rightCol.appendChild(sugPanel);
  }

  bodyEl.appendChild(rightCol);
}
