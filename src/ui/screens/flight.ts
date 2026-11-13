import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getParts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { computeShipStats } from '@/builder/compute-ship-stats';
import { createFlightSim } from '@/sim/flight-sim';
import { autoFly } from '@/sim/flight-sim';

export function renderFlight(root: HTMLElement, state: GameState): void {
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
      <h1>Flight Operations: Descent & Landing</h1>
      <p style="color:var(--text-dim)">Destination: <strong>${body.name}</strong> | Target: Bullseye Landing Site</p>
    </div>
    <div>
      <button class="primary" id="btn-autoland">Auto-Land Simulation →</button>
    </div>
  `;
  container.appendChild(header);

  // Flight Canvas (2D side view placeholder)
  const canvasPanel = createPanel('Real-time Flight Telemetry & Radar');
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 360;
  canvas.style.width = '100%';
  canvas.style.height = '360px';
  canvas.style.background = '#030712';
  canvas.style.borderRadius = '4px';
  canvas.style.display = 'block';

  // Draw simple 2D flight canvas graphics
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Sky/space background
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const sx = (Math.sin(i * 99) * 0.5 + 0.5) * canvas.width;
      const sy = (Math.cos(i * 33) * 0.5 + 0.5) * (canvas.height - 80);
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Ground surface
    ctx.fillStyle = body.id === 'mars' ? '#991b1b' : body.id === 'venus' ? '#ca8a04' : '#475569';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    // Landing Bullseye Rings on ground
    const centerX = canvas.width / 2;
    const groundY = canvas.height - 60;
    const ringColors = ['#1e293b', '#334155', '#0284c7', '#38bdf8', '#22c55e'];
    const ringWidths = [180, 140, 100, 60, 24];
    for (let r = 0; r < 5; r++) {
      ctx.fillStyle = ringColors[r] ?? '#22c55e';
      const w = ringWidths[r] ?? 20;
      ctx.fillRect(centerX - w / 2, groundY, w, 8);
    }

    // Spacecraft placeholder
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(centerX - 10, groundY - 80, 20, 30);
    // Legs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, groundY - 55);
    ctx.lineTo(centerX - 20, groundY - 50);
    ctx.moveTo(centerX + 10, groundY - 55);
    ctx.lineTo(centerX + 20, groundY - 50);
    ctx.stroke();

    // HUD Text overlay
    ctx.fillStyle = '#38bdf8';
    ctx.font = '14px monospace';
    ctx.fillText(`ALTITUDE: 120 m`, 20, 30);
    ctx.fillText(`V-SPEED: -3.2 m/s`, 20, 50);
    ctx.fillText(`TILT: 1.2°`, 20, 70);
    ctx.fillText(`FUEL: ${(stats.fuelMassKg * 0.8).toFixed(0)} kg`, 20, 90);
    ctx.fillText(`TARGET GRAVITY: ${body.gravityMs2} m/s²`, 20, 110);
  }

  canvasPanel.appendChild(canvas);
  container.appendChild(canvasPanel);

  // Flight Controls note
  const infoPanel = createPanel(
    'Flight Controls (Playable Moon Landing in development — Owner 1)',
    `
    <p style="margin-bottom:0.75rem">
      Interactive controls: <strong>Arrow keys</strong> for RCS tilt, <strong>Space / W</strong> for main throttle.
    </p>
    <div style="display:flex; gap:1rem">
      <button class="primary" id="btn-step-land">Complete Landing → Scavenge Phase</button>
      <button id="btn-force-crash" style="border-color:var(--danger); color:var(--danger)">Simulate Hard Crash</button>
    </div>
    `
  );
  container.appendChild(infoPanel);
  root.appendChild(container);

  root.querySelector('#btn-autoland')?.addEventListener('click', () => {
    const sim = createFlightSim(stats, body, state.save.difficulty, 42);
    autoFly(sim);
    transitionTo('scavenge');
  });

  root.querySelector('#btn-step-land')?.addEventListener('click', () => {
    transitionTo('scavenge');
  });

  root.querySelector('#btn-force-crash')?.addEventListener('click', () => {
    transitionTo('results');
  });
}
