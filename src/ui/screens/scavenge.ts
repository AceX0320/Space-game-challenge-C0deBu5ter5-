import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { createMeter } from '@/ui/components/meter';

export function renderScavenge(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find((b) => b.id === contract.bodyId) ?? bodies[0]!;

  const scavenge = state.missionResult?.scavenge;

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Automated Surface Scavenging Phase</h1>
      <p style="color:var(--text-dim)">Scientific sampling underway on <strong>${body.name}</strong></p>
    </div>
    <div>
      <button class="primary" id="btn-finish-scavenge">Finalize Mission & View Report →</button>
    </div>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'grid-2';

  // Gauges
  const gaugesPanel = createPanel('Lander Life-Support & Telemetry');
  gaugesPanel.appendChild(createMeter('Mission Lifetime Remaining', 7200, 10800, 's', '#38bdf8'));
  gaugesPanel.appendChild(createMeter('Power Output vs Load', 380, 500, 'W', '#eab308'));
  gaugesPanel.appendChild(createMeter('Data Buffer Utilization', 45, 100, 'MB', '#22c55e'));
  gaugesPanel.appendChild(createMeter('Downlink Antenna Link', 85, 100, '%', '#38bdf8'));
  grid.appendChild(gaugesPanel);

  // Live item feed
  const items = scavenge?.itemsFound ?? [
    { itemId: 'regolith-sample', tS: 45, quantity: 2, transmitted: true },
    { itemId: 'water-ice', tS: 120, quantity: 1, transmitted: true },
  ];

  const itemsHtml = items
    .map(
      (it) => `
      <div style="background:#1e293b; border-left:3px solid #22c55e; padding:0.5rem 0.75rem; margin-bottom:0.5rem; border-radius:0 4px 4px 0">
        <div style="display:flex; justify-content:space-between">
          <strong>${it.itemId}</strong>
          <span style="color:#4ade80">+${it.quantity} sample(s)</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-dim)">Acquired at T+${it.tS}s | Downlink: ${it.transmitted ? '✓ Transmitted' : '⏳ In Buffer'}</div>
      </div>
    `
    )
    .join('');

  const feedPanel = createPanel(
    'Live Discovery Feed',
    `
    <div style="max-height:240px; overflow-y:auto; margin-bottom:1rem">
      ${itemsHtml}
    </div>
    <p style="font-size:0.85rem; color:var(--text-dim)">
      Scientific instruments automatically detect and sample minerals, volatiles, and geological anomalies while lander power holds.
    </p>
    `
  );
  grid.appendChild(feedPanel);

  container.appendChild(grid);
  root.appendChild(container);

  root.querySelector('#btn-finish-scavenge')?.addEventListener('click', () => {
    transitionTo('results');
  });
}

