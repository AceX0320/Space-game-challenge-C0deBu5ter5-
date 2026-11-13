import type { GameState } from '@/state/store';
import { getStore } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getItems, getParts } from '@/data/index';
import { createPanel } from '@/ui/components/panel';
import { computeShipStats } from '@/builder/compute-ship-stats';
import { createFlightSim, autoFly, ringForDistance } from '@/sim/flight-sim';
import { KeyboardInput } from '@/sim/input';
import { formatDistance, formatSpeed, formatAngleDeg, formatPercent } from '@/sim/units';
import { simulateScavenge } from '@/economy/scavenge';
import { computePayout } from '@/economy/payout';
import { updateStreaks } from '@/economy/streaks';
import { applyWear } from '@/economy/wear';
import { writeSave } from '@/economy/save-load';
import { generateReport } from '@/report/generate-report';
import type { FlightResult, MissionResult } from '@/types';

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
      <p style="color:var(--text-dim)">Target Body: <strong>${body.name}</strong> | Gravity: ${body.gravityMs2.toFixed(2)} m/s² | Target: Bullseye</p>
    </div>
    <div style="display:flex; gap:0.75rem">
      <button class="primary" id="btn-autoland">⚡ AI Auto-Land</button>
      <button id="btn-abort-flight" style="border-color:var(--danger); color:var(--danger)">Abort</button>
    </div>
  `;
  container.appendChild(header);

  // Flight Canvas Container
  const canvasPanel = createPanel('Real-time Flight Telemetry & Radar');
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 440;
  canvas.style.width = '100%';
  canvas.style.height = '440px';
  canvas.style.background = '#030712';
  canvas.style.borderRadius = '4px';
  canvas.style.display = 'block';
  canvasPanel.appendChild(canvas);
  container.appendChild(canvasPanel);

  // Flight Controls Information Panel
  const infoPanel = createPanel(
    'Flight Controls & Dynamics',
    `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
      <div>
        <p style="margin:0 0 0.25rem 0">
          Manual Controls: <strong>Space / W / ArrowUp</strong> = Main Throttle, <strong>A / ArrowLeft</strong> = Pitch Left, <strong>D / ArrowRight</strong> = Pitch Right.
        </p>
        <p style="margin:0; font-size:0.85rem; color:var(--text-dim)">
          Touchdown Limits: Max V-Speed ${stats.touchdownLimits.maxVyMs} m/s, Max H-Speed ${stats.touchdownLimits.maxVxMs} m/s, Max Tilt ${stats.touchdownLimits.maxTiltDeg}°.
        </p>
      </div>
      <div id="touchdown-actions" style="display:none; gap:1rem"></div>
    </div>
    `
  );
  container.appendChild(infoPanel);
  root.appendChild(container);

  // Instantiate simulation & inputs
  const sim = createFlightSim(stats, body, state.save.difficulty, Date.now());
  const input = new KeyboardInput(window);
  input.attach();

  let animFrameId: number | null = null;
  let isCompleted = false;

  const ctx = canvas.getContext('2d');

  function completeMission(flightResult: FlightResult): void {
    if (isCompleted) return;
    isCompleted = true;
    input.detach();
    if (animFrameId) cancelAnimationFrame(animFrameId);

    const store = getStore();
    const currentState = store.getState();
    const items = getItems();

    // 1. Scavenge simulation (null on crash)
    const scavengeResult =
      flightResult.outcome === 'crash'
        ? null
        : simulateScavenge(
            stats,
            body,
            contract,
            flightResult,
            items,
            currentState.save.difficulty,
            Date.now()
          );

    // 2. Part Wear & Delta
    const updatedParts = applyWear(currentState.design.parts, currentState.save.difficulty, {});
    const partWearDelta: Record<string, number> = {};
    for (let i = 0; i < currentState.design.parts.length; i++) {
      const orig = currentState.design.parts[i]!;
      const upd = updatedParts[i]!;
      partWearDelta[orig.instanceId] = orig.condition - upd.condition;
    }

    const missionResult: MissionResult = {
      contractId: contract.id,
      difficulty: currentState.save.difficulty,
      flight: flightResult,
      scavenge: scavengeResult,
      partWearDelta,
      malfunctions: flightResult.events.filter((e) => e.kind === 'malfunction').map((e) => e.text),
    };

    // 3. Payout Calculation
    const payout = computePayout(contract, missionResult, stats, currentState.save, 0);

    // 4. Streaks Update
    const streakUpdate = updateStreaks(
      currentState.save.streaks,
      missionResult,
      stats,
      contract,
      currentState.save.safetyNets
    );

    // 5. Update SaveGame
    const newFundsM = Math.max(0, currentState.save.fundsM + payout.netM);
    const updatedCompleted = { ...currentState.save.completedContracts };
    const prevRecord = updatedCompleted[contract.id];
    updatedCompleted[contract.id] = {
      bestNetM: Math.max(prevRecord?.bestNetM ?? -Infinity, payout.netM),
      bestScore: Math.max(prevRecord?.bestScore ?? 0, payout.score.total),
      plays: (prevRecord?.plays ?? 0) + 1,
    };

    const unlocked = [...currentState.save.unlockedContractIds];
    if (contract.unlocksContractId && !unlocked.includes(contract.unlocksContractId)) {
      if (newFundsM >= contract.fundingGateM) {
        unlocked.push(contract.unlocksContractId);
      }
    }

    const updatedInventory = [...currentState.save.inventory];
    if (scavengeResult) {
      for (const item of scavengeResult.itemsFound) {
        const existing = updatedInventory.find((i) => i.itemId === item.itemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          updatedInventory.push({ itemId: item.itemId, quantity: item.quantity });
        }
      }
    }

    const updatedSave = {
      ...currentState.save,
      fundsM: newFundsM,
      completedContracts: updatedCompleted,
      unlockedContractIds: unlocked,
      streaks: streakUpdate.streaks,
      safetyNets: streakUpdate.safetyNets,
      inventory: updatedInventory,
      ownedParts: updatedParts,
    };

    writeSave(updatedSave);

    // 6. Generate Report
    const report = generateReport(contract, stats, missionResult, payout);

    // 7. Update Store
    store.update({
      stats,
      missionResult,
      payout,
      report,
      save: updatedSave,
    });

    // 8. Display Action Buttons in UI
    const actionDeck = root.querySelector('#touchdown-actions') as HTMLElement;
    if (actionDeck) {
      actionDeck.style.display = 'flex';
      if (flightResult.outcome === 'crash') {
        actionDeck.innerHTML = `
          <button class="primary" id="btn-goto-results" style="background:var(--danger)">View Incident Report →</button>
        `;
      } else {
        actionDeck.innerHTML = `
          <button class="primary" id="btn-goto-scavenge">Deploy Surface Operations →</button>
        `;
      }
      root.querySelector('#btn-goto-scavenge')?.addEventListener('click', () => {
        transitionTo('scavenge');
      });
      root.querySelector('#btn-goto-results')?.addEventListener('click', () => {
        transitionTo('results');
      });
    }
  }

  // Animation & Physics Loop
  let lastTime = performance.now();

  function loop(currentTime: number): void {
    if (isCompleted) return;

    const dtS = Math.min(0.05, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    // Read player inputs
    const cmd = input.read();
    const pitchRate = (cmd.rotateRight ? 35 : 0) - (cmd.rotateLeft ? 35 : 0);
    const throttle = cmd.thrust ? 1.0 : 0.0;

    // Step simulation
    sim.step(dtS, {
      throttle,
      pitchRate,
      rcs: 0,
      deployParachute: false,
    });

    // Render Canvas
    if (ctx) {
      const s = sim.state;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);

      // 2. Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 50; i++) {
        const sx = (i * 197) % w;
        const sy = (i * 83) % (h - 80);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // 3. Ground Surface & Landing Target
      const groundY = h - 60;
      ctx.fillStyle = body.id === 'mars' ? '#881337' : body.id === 'venus' ? '#854d0e' : '#334155';
      ctx.fillRect(0, groundY, w, 60);

      // Bullseye target rings on ground
      const centerX = w / 2;
      const ringColors = ['#1e293b', '#0369a1', '#0284c7', '#38bdf8', '#22c55e'];
      const ringWidths = [240, 180, 120, 70, 30];
      for (let r = 0; r < 5; r++) {
        ctx.fillStyle = ringColors[r] ?? '#22c55e';
        const rw = ringWidths[r] ?? 30;
        ctx.fillRect(centerX - rw / 2, groundY, rw, 8);
      }

      // 4. Spacecraft Position (Scaled for Display)
      // Viewport: target (0,0) at centerX, groundY. Height scale 1000m -> 320px
      const scaleY = (groundY - 40) / 1000;
      const craftY = Math.max(40, groundY - s.yM * scaleY);
      const craftX = Math.max(30, Math.min(w - 30, centerX + s.xM * 0.5));

      ctx.save();
      ctx.translate(craftX, craftY);
      ctx.rotate((s.tiltDeg * Math.PI) / 180);

      // Rocket Cabin
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      // Cockpit window
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, -8, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Landing Legs
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.lineTo(-16, 18);
      ctx.moveTo(8, 6);
      ctx.lineTo(16, 18);
      ctx.stroke();

      // Engine Thruster Flame
      if (s.throttle > 0.05 && s.fuelKg > 0) {
        ctx.fillStyle = s.throttle > 0.5 ? '#f97316' : '#eab308';
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.lineTo(6, 8);
        ctx.lineTo(0, 8 + s.throttle * 22 + Math.random() * 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // 5. Telemetry HUD Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(15, 15, 280, 160);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 15, 280, 160);

      ctx.font = '13px monospace';
      ctx.fillStyle = '#94a3b8';

      // Altitude
      ctx.fillText(`ALTITUDE : ${formatDistance(s.yM)}`, 25, 38);

      // Vertical Speed (color-coded)
      const vSafe = Math.abs(s.vyMs) <= stats.touchdownLimits.maxVyMs;
      ctx.fillStyle = vSafe ? '#4ade80' : '#f87171';
      ctx.fillText(`V-SPEED  : ${formatSpeed(s.vyMs)}`, 25, 60);

      // Horizontal Speed
      const hSafe = Math.abs(s.vxMs) <= stats.touchdownLimits.maxVxMs;
      ctx.fillStyle = hSafe ? '#94a3b8' : '#f87171';
      ctx.fillText(`H-SPEED  : ${formatSpeed(s.vxMs)}`, 25, 82);

      // Tilt
      const tiltSafe = Math.abs(s.tiltDeg) <= stats.touchdownLimits.maxTiltDeg;
      ctx.fillStyle = tiltSafe ? '#94a3b8' : '#f87171';
      ctx.fillText(`TILT     : ${formatAngleDeg(s.tiltDeg)}`, 25, 104);

      // Fuel & Throttle
      ctx.fillStyle = s.fuelKg > 10 ? '#38bdf8' : '#ef4444';
      const fuelPct = stats.fuelMassKg > 0 ? s.fuelKg / stats.fuelMassKg : 0;
      ctx.fillText(`FUEL     : ${s.fuelKg.toFixed(0)} kg (${formatPercent(fuelPct)})`, 25, 126);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`THROTTLE : ${formatPercent(s.throttle)}`, 25, 148);

      // Flight State Status Banner
      if (s.phase === 'landed' || s.phase === 'crashed') {
        const ring = ringForDistance(Math.abs(s.xM), state.save.difficulty);
        ctx.fillStyle = s.phase === 'landed' ? 'rgba(22, 101, 52, 0.9)' : 'rgba(153, 27, 27, 0.9)';
        ctx.fillRect(w / 2 - 200, h / 2 - 45, 400, 90);
        ctx.strokeStyle = s.phase === 'landed' ? '#4ade80' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 200, h / 2 - 45, 400, 90);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          s.phase === 'landed' ? 'TOUCHDOWN CONFIRMED' : 'MISSION FAILURE: CRASH',
          w / 2,
          h / 2 - 15
        );

        ctx.font = '14px monospace';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(
          `V-Speed: ${s.vyMs.toFixed(1)} m/s | Ring: ${ring} (Dist: ${Math.abs(s.xM).toFixed(1)}m)`,
          w / 2,
          h / 2 + 15
        );
        ctx.textAlign = 'start';
      }
    }

    // Check completion condition
    if (sim.isDone()) {
      completeMission(sim.result());
      return;
    }

    animFrameId = requestAnimationFrame(loop);
  }

  animFrameId = requestAnimationFrame(loop);

  // Auto-Land Simulation Button
  root.querySelector('#btn-autoland')?.addEventListener('click', () => {
    const flightResult = autoFly(sim);
    completeMission(flightResult);
  });

  // Abort Button
  root.querySelector('#btn-abort-flight')?.addEventListener('click', () => {
    sim.state.phase = 'crashed';
    completeMission(sim.result());
  });
}
