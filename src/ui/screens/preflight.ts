/**
 * Screen 02: Pre-flight (Go / No-Go) → preflight phase
 * No Figma frame found — built from shared shell and design language.
 * Shows a checklist of stats vs limits, violations, launch button.
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getParts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { computeShipStats } from '@/builder/compute-ship-stats';
import { validateDesign } from '@/builder/validate-design';
import { formatM } from '@/core/units';

const SVG_GO   = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><polyline points="2,8 6,13 14,4" stroke="var(--ok)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_NOGO = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><line x1="4" y1="4" x2="12" y2="12" stroke="var(--danger)" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="4" x2="4" y2="12" stroke="var(--danger)" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const SVG_WARN = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2 L14 13 H2 Z" stroke="var(--warn)" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="8" y1="6" x2="8" y2="10" stroke="var(--warn)" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="12" r="0.5" fill="var(--warn)" stroke="var(--warn)" stroke-width="0.5"/></svg>`;

function checkRow(label: string, value: string, status: 'go' | 'nogo' | 'warn', note = ''): string {
  const color = status === 'go' ? 'var(--ok)' : status === 'nogo' ? 'var(--danger)' : 'var(--warn)';
  const icon  = status === 'go' ? SVG_GO : status === 'nogo' ? SVG_NOGO : SVG_WARN;
  return `
    <div style="display:flex; align-items:center; gap:var(--sp-3); padding:6px 0; border-bottom:1px solid var(--border);">
      <span style="width:14px; display:flex; align-items:center; flex-shrink:0">${icon}</span>
      <span style="flex:1; font-family:var(--font-mono); font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted)">${label}</span>
      <span style="font-family:var(--font-mono); font-size:0.6875rem; color:${color}">${value}</span>
      ${note ? `<span style="font-size:0.625rem; color:var(--text-muted); cursor:help" title="${note}">?</span>` : ''}
    </div>`;
}

export function renderPreflight(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find(c => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find(b => b.id === contract.bodyId) ?? bodies[0]!;
  const parts = getParts();

  const stats = computeShipStats(state.design, parts, body);
  const violations = validateDesign(state.design, stats, contract);
  const isGo = violations.length === 0;

  const launchBtn = mkPrimary(isGo ? 'Initiate Launch Sequence' : 'No-Go — Fix Violations', () => {
    if (isGo) transitionTo('flight');
  });
  launchBtn.disabled = !isGo;
  const backBtn = mkSecondary('← Return to Hangar', () => transitionTo('hangar'));

  const bodyEl = renderShell(root, state, {
    leftActions: [backBtn],
    rightCta: launchBtn,
    craftName: state.design.name,
    craftStatus: isGo ? 'nominal' : 'error',
  });
  bodyEl.style.display = 'flex';
  bodyEl.style.justifyContent = 'center';
  bodyEl.style.padding = 'var(--ls-sp-6) var(--ls-sp-4)';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'max-width:800px; width:100%; display:flex; flex-direction:column; gap:var(--ls-sp-4);';

  // Status banner
  const banner = document.createElement('div');
  banner.style.cssText = `
    border:1px solid ${isGo ? 'var(--ok)' : 'var(--danger)'};
    background:${isGo ? 'rgba(97,221,160,0.06)' : 'rgba(224,53,53,0.06)'};
    border-radius:0;
    padding:var(--sp-4);
    display:flex;
    align-items:center;
    gap:var(--sp-4);
  `;
  banner.innerHTML = `
    <div style="border-left:4px solid ${isGo ? 'var(--ok)' : 'var(--danger)'}; padding-left:var(--sp-4); flex:1;">
      <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:${isGo ? 'var(--ok)' : 'var(--danger)'}; letter-spacing:0.1em; text-transform:uppercase">
        ${isGo ? 'GO FOR LAUNCH' : 'NO-GO — DESIGN VIOLATIONS'}
      </div>
      <div style="font-size:0.6875rem; color:var(--text-muted); margin-top:4px">
        Pre-flight Readiness Review · ${contract.title} → ${body.name}
      </div>
    </div>
    <div style="text-align:right; flex-shrink:0;">
      <div style="font-family:var(--font-mono); font-size:0.6875rem; color:var(--text-muted)">FAILURE RISK</div>
      <div style="font-family:var(--font-mono); font-size:1.375rem; font-weight:700; color:${(1 - stats.reliability) > 0.2 ? 'var(--danger)' : 'var(--warn)'}">
        ${((1 - stats.reliability) * 100).toFixed(1)}%
      </div>
    </div>
  `;
  wrapper.appendChild(banner);

  // Two-column: checklist + stats
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:var(--ls-sp-4);';

  // Checklist
  const checkPanel = document.createElement('div');
  checkPanel.className = 'ls-panel';
  checkPanel.innerHTML = `
    <div class="ls-panel-header"><span class="ls-panel-title">Systems Check Matrix</span></div>
    <div class="ls-panel-body">
      ${checkRow('TWR (Thrust/Weight)', `${stats.twr.toFixed(2)}×`, stats.twr >= 1.1 ? 'go' : stats.twr >= 1.0 ? 'warn' : 'nogo', 'Must be ≥ 1.1 for safe descent')}
      ${checkRow('Delta-V Budget', `${stats.deltaVms.toFixed(0)} m/s`, stats.deltaVms >= 1500 ? 'go' : stats.deltaVms >= 500 ? 'warn' : 'nogo', 'Minimum recommended: 1500 m/s')}
      ${checkRow('Total Mass', `${(stats.totalMassKg / 1000).toFixed(2)} t`, 'go')}
      ${checkRow('Power Balance', `${(stats.powerGenW - stats.powerDrawW).toFixed(0)} W net`, stats.powerGenW >= stats.powerDrawW ? 'go' : 'warn', 'Net power should be ≥ 0')}
      ${checkRow('Science Downlink', `${stats.downlinkKbps.toFixed(0)} kbps`, stats.downlinkKbps >= stats.dataGenKbps ? 'go' : 'warn', 'Should exceed data gen rate')}
      ${checkRow('Budget', `${formatM(stats.costM)} / ${formatM(contract.budgetCapM)}`, stats.costM <= contract.budgetCapM ? 'go' : 'nogo', 'Must not exceed budget cap')}
      ${checkRow('Reliability', `${(stats.reliability * 100).toFixed(0)}%`, stats.reliability >= 0.9 ? 'go' : stats.reliability >= 0.7 ? 'warn' : 'nogo', 'Product of all part conditions')}
      ${checkRow('Atmosphere', body.atmosphere ? 'Present — drag & heating active' : 'None — vacuum flight', 'go')}
    </div>
  `;
  grid.appendChild(checkPanel);

  // Violations + warnings
  const issuesPanel = document.createElement('div');
  issuesPanel.className = 'ls-panel';
  const issuesBody = `
    <div class="ls-panel-header"><span class="ls-panel-title">Flight Readiness Report</span></div>
    <div class="ls-panel-body">
      ${violations.length
        ? violations.map(v => `<div class="ls-advisory error"><div class="ls-advisory-title">Violation — Launch Blocked</div>${v}</div>`).join('')
        : '<div class="ls-advisory ok"><div class="ls-advisory-title">All Constraints Satisfied</div>No violations detected. Craft is flight-ready.</div>'}
      ${stats.warnings.map(w => `<div class="ls-advisory"><div class="ls-advisory-title">Warning</div>${w}</div>`).join('')}
      <div style="margin-top:var(--ls-sp-3)">
        <div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Mission Profile</div>
        ${[
          ['Target Body', body.name],
          ['Gravity', `${body.gravityMs2} m/s²`],
          ['Atmosphere', body.atmosphere ? `Present (${body.atmosphere.surfaceDensityKgM3} kg/m³)` : 'None'],
          ['Solar Flux', `${body.solarFlux}× Earth`],
          ['Mission Lifetime', `${(body.baseLifetimeS / 3600).toFixed(0)} h`],
          ['Launch Cost (est.)', formatM(stats.costM * 0.1)],
        ].map(([k, v]) => `
          <div style="display:flex; justify-content:space-between; font-size:var(--ls-size-xs); padding:3px 0; border-bottom:1px solid var(--ls-border);">
            <span style="color:var(--ls-text-micro); font-family:var(--ls-font-mono); text-transform:uppercase; letter-spacing:0.06em">${k}</span>
            <span style="font-family:var(--ls-font-mono); color:var(--ls-text)">${v}</span>
          </div>`).join('')}
      </div>
    </div>
  `;
  issuesPanel.innerHTML = issuesBody;
  grid.appendChild(issuesPanel);

  wrapper.appendChild(grid);
  bodyEl.appendChild(wrapper);
}
