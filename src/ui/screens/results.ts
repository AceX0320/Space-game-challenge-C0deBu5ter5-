import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getContracts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { formatM } from '@/core/units';

export function renderResults(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;

  const payout = state.payout ?? {
    grossRewardM: 60,
    buildCostM: 28.5,
    launchCostM: 2.8,
    repairCostM: 0,
    streakMultiplier: 1.05,
    netM: 28.7,
    isRecord: true,
    score: { landing: 100, science: 90, efficiency: 85, decisions: 100, teamBonus: 0, total: 94 },
  };

  const report = state.report ?? {
    headline: 'Mission Complete: Successful Landing & Science Operations',
    outcome: 'soft',
    causes: [
      { severity: 'good' as const, text: 'Touchdown velocity was well within leg damping limits.' },
      { severity: 'good' as const, text: 'Instruments collected and downlinked 20 MB of planetary samples.' },
    ],
    suggestions: ['Upgrade to lighter composite tanks to expand payload margins on higher-tier contracts.'],
    timeline: [],
    similarRealMission: 'Surveyor 1 (1966) — NASA Lunar Soft Landing Mission',
  };

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Post-Mission Debrief & Financial Statement</h1>
      <p style="color:var(--text-dim)">Contract: <strong>${contract.title}</strong> (${contract.bodyId})</p>
    </div>
    <div style="font-size:1.2rem; font-weight:bold; color: ${payout.netM >= 0 ? 'var(--accent)' : 'var(--danger)'}">
      Net Profit: ${payout.netM >= 0 ? '+' : ''}${formatM(payout.netM)}
    </div>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'grid-2';

  // Financial Breakdown
  const financialPanel = createPanel(
    'Financial Settlement',
    `
    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem">
      <span>Contract Reward:</span>
      <span>${formatM(contract.rewardM)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem">
      <span>Streak Multiplier:</span>
      <span>×${payout.streakMultiplier.toFixed(2)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:#4ade80">
      <span>Gross Reward:</span>
      <strong>+${formatM(payout.grossRewardM)}</strong>
    </div>
    <div style="border-top:1px solid var(--border); margin:0.5rem 0"></div>
    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:#f87171">
      <span>Spacecraft Build Cost:</span>
      <span>-${formatM(payout.buildCostM)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:#f87171">
      <span>Launch Vehicle Cost:</span>
      <span>-${formatM(payout.launchCostM)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; color:#f87171">
      <span>Maintenance / Repairs:</span>
      <span>-${formatM(payout.repairCostM)}</span>
    </div>
    <div style="border-top:1px solid var(--border); margin:0.5rem 0"></div>
    <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:bold; color:${payout.netM >= 0 ? 'var(--accent)' : 'var(--danger)'}">
      <span>Total Net Result:</span>
      <span>${payout.netM >= 0 ? '+' : ''}${formatM(payout.netM)}</span>
    </div>
    <div style="margin-top:1rem; font-size:0.85rem; color:var(--text-dim)">
      Funding Gate for Next Tier: ${formatM(contract.fundingGateM)} (Agency Total: ${formatM(state.save.fundsM)})
    </div>
    `
  );
  grid.appendChild(financialPanel);

  // Score & Evaluation
  const scorePanel = createPanel(
    `Performance Rating: ${payout.score.total} / 100`,
    `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:1rem">
      <div>Landing Accuracy: <strong>${payout.score.landing}%</strong></div>
      <div>Science Yield: <strong>${payout.score.science}%</strong></div>
      <div>Resource Efficiency: <strong>${payout.score.efficiency}%</strong></div>
      <div>Decision Quality: <strong>${payout.score.decisions}%</strong></div>
    </div>
    <div style="background:#0f172a; padding:0.75rem; border-radius:4px; margin-bottom:0.75rem">
      <div style="font-weight:bold; color:var(--primary); margin-bottom:0.3rem">${report.headline}</div>
      ${report.causes.map((c) => `<div style="font-size:0.85rem; margin-bottom:0.2rem">• ${c.text}</div>`).join('')}
    </div>
    ${report.suggestions.length > 0 ? `<div style="font-size:0.85rem; color:var(--warning); margin-bottom:0.5rem">💡 <strong>NASA Advisory:</strong> ${report.suggestions.join(' ')}</div>` : ''}
    <div style="font-size:0.8rem; color:var(--text-dim); margin-top:0.5rem">
      🏛️ <em>Historical NASA Benchmark:</em> ${report.similarRealMission}
    </div>
    `
  );
  grid.appendChild(scorePanel);

  container.appendChild(grid);

  const actionsBar = document.createElement('div');
  actionsBar.style.display = 'flex';
  actionsBar.style.gap = '1rem';
  actionsBar.style.marginTop = '1rem';
  actionsBar.innerHTML = `
    <button class="primary" id="btn-next-contract">Return to Contracts Table →</button>
    <button id="btn-open-research">Research Laboratory</button>
    <button id="btn-retry-contract">Replay for Higher Efficiency</button>
  `;
  container.appendChild(actionsBar);

  root.appendChild(container);

  root.querySelector('#btn-next-contract')?.addEventListener('click', () => {
    transitionTo('contracts');
  });

  root.querySelector('#btn-open-research')?.addEventListener('click', () => {
    transitionTo('research');
  });

  root.querySelector('#btn-retry-contract')?.addEventListener('click', () => {
    transitionTo('hangar');
  });
}
