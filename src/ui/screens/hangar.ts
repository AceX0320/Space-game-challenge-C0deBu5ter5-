import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getParts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { createMeter } from '@/ui/components/meter';
import { kgToT } from '@/core/units';
import { computeShipStats } from '@/builder/compute-ship-stats';

export function renderHangar(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find((b) => b.id === contract.bodyId) ?? bodies[0]!;
  const parts = getParts();

  const stats = computeShipStats(state.design, parts, body);

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Spacecraft Assembly Hangar</h1>
      <p style="color:var(--text-dim)">Contract: <strong>${contract.title}</strong> (${body.name})</p>
    </div>
    <div>
      <button class="primary" id="btn-preflight">Go to Pre-Flight Review →</button>
    </div>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'grid-2';

  // Left column: Active design parts
  const partsListHtml = state.design.parts
    .map((p) => {
      const def = parts.find((d) => d.id === p.partId);
      return `<li style="margin-bottom:0.4rem; list-style:none">
        <strong>${def?.name ?? p.partId}</strong> — Condition: ${p.condition.toFixed(0)}%
      </li>`;
    })
    .join('');

  const designPanel = createPanel(
    `Ship Configuration: ${state.design.name}`,
    `
    <ul style="margin-bottom:1rem">${partsListHtml || '<li>No parts installed</li>'}</ul>
    <p style="font-size:0.85rem; color:var(--text-dim)">
      TODO(owner-2): Tunable parameter sliders and slot picker UI.
    </p>
    `
  );
  grid.appendChild(designPanel);

  // Right column: Live derived stats & gauges
  const statsPanel = createPanel('Telemetry & Performance Estimates');
  statsPanel.appendChild(createMeter('Total Mass', stats.totalMassKg, 10000, 'kg', '#38bdf8'));
  statsPanel.appendChild(createMeter('Delta-V (Δv)', stats.deltaVms, 5000, 'm/s', '#22c55e'));
  statsPanel.appendChild(createMeter('Thrust-to-Weight (TWR)', stats.twr, 3.0, 'x', stats.twr >= 1.1 ? '#22c55e' : '#ef4444'));
  statsPanel.appendChild(createMeter('Power Balance', stats.powerGenW, Math.max(stats.powerDrawW * 1.5, 500), 'W', '#eab308'));
  statsPanel.appendChild(createMeter('Estimated Cost', stats.costM, contract.budgetCapM, '$M', stats.costM <= contract.budgetCapM ? '#38bdf8' : '#ef4444'));

  const detailsDiv = document.createElement('div');
  detailsDiv.style.marginTop = '1rem';
  detailsDiv.innerHTML = `
    <p><strong>Target Gravity:</strong> ${body.gravityMs2} m/s²</p>
    <p><strong>Dry Mass:</strong> ${kgToT(stats.dryMassKg)} | <strong>Fuel:</strong> ${kgToT(stats.fuelMassKg)}</p>
    <p><strong>Reliability:</strong> ${(stats.reliability * 100).toFixed(0)}%</p>
    ${stats.warnings.length > 0 ? `<div style="color:var(--warning); margin-top:0.5rem">⚠️ ${stats.warnings.join('<br>⚠️ ')}</div>` : ''}
  `;
  statsPanel.appendChild(detailsDiv);

  grid.appendChild(statsPanel);
  container.appendChild(grid);
  root.appendChild(container);

  root.querySelector('#btn-preflight')?.addEventListener('click', () => {
    transitionTo('preflight');
  });
}

