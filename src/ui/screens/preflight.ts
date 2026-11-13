import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getParts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { computeShipStats } from '@/builder/compute-ship-stats';
import { validateDesign } from '@/builder/validate-design';
import { formatM } from '@/core/units';

export function renderPreflight(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find((b) => b.id === contract.bodyId) ?? bodies[0]!;
  const parts = getParts();

  const stats = computeShipStats(state.design, parts, body);
  const violations = validateDesign(state.design, stats, contract);
  const isGo = violations.length === 0;

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Flight Readiness Review (FRR)</h1>
      <p style="color:var(--text-dim)">Pre-flight Go / No-Go Decision for ${contract.title}</p>
    </div>
    <div style="font-size:1.3rem; font-weight:bold; color: ${isGo ? 'var(--accent)' : 'var(--danger)'}">
      STATUS: ${isGo ? 'GO FOR LAUNCH' : 'NO-GO'}
    </div>
  `;
  container.appendChild(header);

  const panel = createPanel(
    'Systems Check Matrix',
    `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1.5rem">
      <div>
        <p><strong>Target Destination:</strong> ${body.name} (${body.gravityMs2} m/s²)</p>
        <p><strong>Atmosphere:</strong> ${body.atmosphere ? 'Present (Drag & Heating Active)' : 'None (Vacuum)'}</p>
        <p><strong>Launch Cost:</strong> ${formatM(stats.costM * 0.1)}</p>
        <p><strong>Total Project Cost:</strong> ${formatM(stats.costM * 1.1)}</p>
      </div>
      <div>
        <p><strong>Payload Delta-V:</strong> ${stats.deltaVms.toFixed(0)} m/s</p>
        <p><strong>Touchdown TWR:</strong> ${stats.twr.toFixed(2)}</p>
        <p><strong>Overall Reliability:</strong> ${(stats.reliability * 100).toFixed(1)}%</p>
        <p><strong>Failure Risk:</strong> ${((1 - stats.reliability) * 100).toFixed(1)}%</p>
      </div>
    </div>
    ${
      violations.length > 0
        ? `<div style="background:#450a0a; border:1px solid #ef4444; padding:0.75rem; border-radius:4px; margin-bottom:1rem">
             <strong>Violations preventing launch:</strong><br>
             ${violations.join('<br>')}
           </div>`
        : `<p style="color:var(--accent); margin-bottom:1rem">✓ All flight constraints within design tolerances.</p>`
    }
    <div style="display:flex; gap:1rem">
      <button class="primary" id="btn-launch" ${!isGo ? 'disabled style="opacity:0.5"' : ''}>Initiate Launch Sequence 🚀</button>
      <button id="btn-back-hangar">Return to Hangar</button>
    </div>
    `
  );

  container.appendChild(panel);
  root.appendChild(container);

  root.querySelector('#btn-launch')?.addEventListener('click', () => {
    transitionTo('flight');
  });

  root.querySelector('#btn-back-hangar')?.addEventListener('click', () => {
    transitionTo('hangar');
  });
}

