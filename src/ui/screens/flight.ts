import type { GameState } from '@/state/store';
import { getStore } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getItems, getParts } from '@/data/index';
import { computeShipStats } from '@/builder/compute-ship-stats';
import {
  createFlightSim,
  autoFly,
  ringForDistance,
  LAUNCH_TARGET_ALTITUDE_M,
} from '@/sim/flight-sim';
import { KeyboardInput } from '@/sim/input';
import { formatDistance, formatSpeed, formatAngleDeg, formatPercent } from '@/sim/units';
import { simulateScavenge } from '@/economy/scavenge';
import { computePayout } from '@/economy/payout';
import { updateStreaks } from '@/economy/streaks';
import { applyWear } from '@/economy/wear';
import { writeSave } from '@/economy/save-load';
import { generateReport } from '@/report/generate-report';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import type { FlightResult, MissionResult } from '@/types';

export function renderFlight(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find((b) => b.id === contract.bodyId) ?? bodies[0]!;
  const parts = getParts();
  const stats = computeShipStats(state.design, parts, body);

  let isCompleted = false;
  let animFrameId: number | null = null;

  // Primary CTA (initially disabled/hidden until touchdown)
  const ctaBtn = mkPrimary('Awaiting Touchdown…', () => {});
  ctaBtn.disabled = true;

  const autoLandBtn = mkSecondary('⚡ AI Auto-Fly', () => {
    if (isCompleted) return;
    const flightResult = autoFly(sim);
    completeMission(flightResult);
  });

  const abortBtn = mkSecondary('Abort Mission', () => {
    if (isCompleted) return;
    sim.state.phase = 'crashed';
    completeMission(sim.result());
  });
  abortBtn.style.borderColor = 'var(--ls-red)';
  abortBtn.style.color = 'var(--ls-red)';

  const bodyEl = renderShell(root, state, {
    leftActions: [abortBtn, autoLandBtn],
    rightCta: ctaBtn,
    craftName: `${state.design.name} · IN FLIGHT`,
    craftStatus: 'nominal',
  });
  bodyEl.style.display = 'flex';
  bodyEl.style.flexDirection = 'column';
  bodyEl.style.padding = 'var(--ls-sp-3)';
  bodyEl.style.gap = 'var(--ls-sp-2)';

  // Flight Canvas Container
  const canvasPanel = document.createElement('div');
  canvasPanel.className = 'ls-panel';
  canvasPanel.style.cssText = 'flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative; min-height:480px;';

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 560;
  canvas.style.cssText = 'width:100%; height:100%; background:#040711; display:block;';
  canvas.setAttribute('aria-label', `Live mission route from Earth to ${body.name}, with the spacecraft's current flight position.`);
  canvasPanel.appendChild(canvas);
  bodyEl.appendChild(canvasPanel);

  // Controls Guide Bar
  const controlsGuide = document.createElement('div');
  controlsGuide.style.cssText = `
    display:flex; justify-content:space-between; align-items:center;
    padding:var(--ls-sp-2) var(--ls-sp-3); border:1px solid var(--ls-border);
    border-radius:var(--ls-radius-sm); background:var(--ls-panel);
    font-size:var(--ls-size-xs); font-family:var(--ls-font-mono); color:var(--ls-text-dim);
  `;
  controlsGuide.innerHTML = `
    <div>
      <span class="ls-micro">Mission:</span> Hold throttle to launch from Earth; follow the route marker through transfer, then manage powered landing on ${body.name}.
    </div>
    <div>
      <span class="ls-micro">Flight controls:</span>
      <span style="color:var(--ls-text)">SPACE / W / ↑</span> Throttle &nbsp;|&nbsp;
      <span style="color:var(--ls-text)">A / ←</span> Pitch Left &nbsp;|&nbsp;
      <span style="color:var(--ls-text)">D / →</span> Pitch Right
    </div>
    <span><span class="ls-micro">Landing limits:</span> Vy ≤ ${stats.touchdownLimits.maxVyMs} m/s &nbsp;|&nbsp; Vx ≤ ${stats.touchdownLimits.maxVxMs} m/s &nbsp;|&nbsp; Tilt ≤ ${stats.touchdownLimits.maxTiltDeg}°</span>
  `;
  bodyEl.appendChild(controlsGuide);

  const touchControls = document.createElement('div');
  touchControls.style.cssText = 'display:flex; flex-wrap:wrap; justify-content:center; gap:var(--ls-sp-2);';
  touchControls.innerHTML = `
    <button class="ls-btn" data-hold="left" aria-label="Hold to pitch left">◀ PITCH LEFT</button>
    <button class="ls-btn ls-btn-primary" data-hold="thrust" aria-label="Hold to apply throttle">▲ HOLD THROTTLE</button>
    <button class="ls-btn" data-hold="right" aria-label="Hold to pitch right">PITCH RIGHT ▶</button>
    <label style="display:flex;align-items:center;gap:var(--ls-sp-2);padding:0 var(--ls-sp-2);font:var(--ls-size-xs) var(--ls-font-mono);color:var(--ls-text-dim)">
      THROTTLE <input data-analog-throttle type="range" min="0" max="100" value="0" aria-label="Throttle level" style="accent-color:var(--ls-orange)"/>
      <output data-throttle-readout>0%</output>
    </label>
    <button class="ls-btn" data-hold="chute" aria-label="Hold to deploy parachute">▱ PARACHUTE</button>
  `;
  if (!body.atmosphere || (stats.parachuteAreaM2 ?? 0) <= 0) {
    const parachuteButton = touchControls.querySelector<HTMLButtonElement>('[data-hold="chute"]');
    if (parachuteButton) {
      parachuteButton.disabled = true;
      parachuteButton.textContent = body.atmosphere ? '▱ NO PARACHUTE INSTALLED' : '▱ NO ATMOSPHERE';
    }
  }
  bodyEl.appendChild(touchControls);

  // Instantiate simulation & inputs
  const sim = createFlightSim(stats, body, state.save.difficulty, Date.now());
  const input = new KeyboardInput(window);
  input.attach();
  const heldControls = new Set<string>();
  const throttleSlider = touchControls.querySelector<HTMLInputElement>('[data-analog-throttle]');
  const throttleReadout = touchControls.querySelector<HTMLOutputElement>('[data-throttle-readout]');
  let analogThrottle = 0;
  const onThrottleInput = (): void => {
    analogThrottle = Number(throttleSlider?.value ?? 0) / 100;
    if (throttleReadout) throttleReadout.value = `${Math.round(analogThrottle * 100)}%`;
  };
  throttleSlider?.addEventListener('input', onThrottleInput);
  const activeHoldButton = (target: EventTarget | null): HTMLButtonElement | null =>
    target instanceof Element ? target.closest<HTMLButtonElement>('[data-hold]') : null;
  const onPointerDown = (event: PointerEvent): void => {
    const button = activeHoldButton(event.target);
    if (!button) return;
    event.preventDefault();
    const control = button.dataset['hold'];
    if (control) heldControls.add(control);
    button.classList.add('is-holding');
    button.style.filter = 'brightness(1.35)';
    button.setPointerCapture?.(event.pointerId);
  };
  const releasePointerControl = (event: PointerEvent): void => {
    const button = activeHoldButton(event.target);
    if (button) {
      const control = button.dataset['hold'];
      if (control) heldControls.delete(control);
      button.classList.remove('is-holding');
      button.style.filter = '';
    } else {
      heldControls.clear();
      touchControls.querySelectorAll<HTMLButtonElement>('.is-holding').forEach((element) => {
        element.classList.remove('is-holding');
        element.style.filter = '';
      });
    }
  };
  const clearPointerControls = (): void => {
    heldControls.clear();
    touchControls.querySelectorAll<HTMLButtonElement>('.is-holding').forEach((element) => {
      element.classList.remove('is-holding');
      element.style.filter = '';
    });
  };
  touchControls.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', releasePointerControl);
  window.addEventListener('pointercancel', releasePointerControl);
  window.addEventListener('blur', clearPointerControls);

  const ctx = canvas.getContext('2d');

  function completeMission(flightResult: FlightResult): void {
    if (isCompleted) return;
    isCompleted = true;
    input.detach();
    clearPointerControls();
    touchControls.removeEventListener('pointerdown', onPointerDown);
    throttleSlider?.removeEventListener('input', onThrottleInput);
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerup', releasePointerControl);
      window.removeEventListener('pointercancel', releasePointerControl);
      window.removeEventListener('blur', clearPointerControls);
    }
    if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(animFrameId);
    }

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

    // 8. Update Shell Status Pill and Primary CTA
    ctaBtn.disabled = false;
    if (flightResult.outcome === 'crash') {
      ctaBtn.textContent = 'View Incident Report →';
      ctaBtn.className = 'ls-btn ls-btn-primary';
      ctaBtn.style.background = 'var(--ls-red)';
      ctaBtn.style.borderColor = 'var(--ls-red)';
      ctaBtn.onclick = () => transitionTo('results');
    } else {
      ctaBtn.textContent = 'Deploy Surface Operations →';
      ctaBtn.className = 'ls-btn ls-btn-primary';
      ctaBtn.onclick = () => transitionTo('scavenge');
    }

    // Update pill
    const pill = root.querySelector('.ls-craft-pill');
    if (pill) {
      const dot = pill.querySelector('.ls-pill-dot');
      if (dot) dot.className = `ls-pill-dot ${flightResult.outcome === 'soft' ? '' : 'error'}`;
      const span = pill.querySelector('span:last-child');
      if (span) span.textContent = `${state.design.name} · ${flightResult.outcome.toUpperCase()}`;
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
    const pitchRight = cmd.rotateRight || heldControls.has('right');
    const pitchLeft = cmd.rotateLeft || heldControls.has('left');
    const pitchRate = (pitchRight ? 35 : 0) - (pitchLeft ? 35 : 0);
    const throttle = cmd.thrust || heldControls.has('thrust') ? 1.0 : analogThrottle;

    // Step simulation
    sim.step(dtS, {
      throttle,
      pitchRate,
      rcs: 0,
      deployParachute: heldControls.has('chute'),
    });

    // Render Canvas
    if (ctx) {
      const s = sim.state;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, w, h);

      // 2. Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 60; i++) {
        const sx = (i * 233) % w;
        const sy = (i * 97) % (h - 90);
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }

      // 3. Surface view: Earth during launch, destination during descent.
      const groundY = h - 70;
      const centerX = w / 2;
      const isAscent = s.phase === 'ascent';
      const isTransit = s.phase === 'transit';
      const isDescent = !isAscent && !isTransit;
      if (!isTransit) {
        ctx.fillStyle = isAscent
          ? '#1d5368'
          : body.id === 'mars'
            ? '#4c1d24'
            : body.id === 'venus'
              ? '#4a3b1a'
              : '#1e293b';
        ctx.fillRect(0, groundY, w, 70);
        ctx.strokeStyle = '#526177';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();
      }

      if (isAscent) {
        ctx.fillStyle = '#9ec8df';
        ctx.fillRect(centerX - 40, groundY - 8, 80, 8);
        ctx.fillStyle = '#7896a8';
        ctx.fillRect(centerX - 24, groundY - 22, 48, 14);
        ctx.fillStyle = '#d9e7ff';
        ctx.font = '12px monospace';
        ctx.fillText('EARTH LAUNCH PAD', centerX + 52, groundY - 8);
      }

      if (isDescent) {
        const ringColors = ['#0f172a', '#1e3a5f', '#1d4ed8', '#0284c7', '#1FA971'];
        const ringWidths = [300, 220, 150, 80, 36];
        for (let r = 0; r < 5; r++) {
          ctx.fillStyle = ringColors[r] ?? '#1FA971';
          const rw = ringWidths[r] ?? 36;
          ctx.fillRect(centerX - rw / 2, groundY, rw, 8);
        }
        ctx.strokeStyle = '#FF5A1F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, groundY - 12);
        ctx.lineTo(centerX, groundY);
        ctx.stroke();
      }

      // 4. Spacecraft Position: launch altitude, transfer arc, or landing approach.
      const descentScaleY = (groundY - 50) / 1000;
      const launchScaleY = (groundY - 90) / LAUNCH_TARGET_ALTITUDE_M;
      const craftX = isTransit
        ? 90 + (w - 180) * s.phaseProgress
        : Math.max(40, Math.min(w - 40, centerX + s.xM * 0.6));
      const craftY = isTransit
        ? groundY * 0.48 - Math.sin(Math.PI * s.phaseProgress) * 150
        : isAscent
          ? groundY - Math.max(0, s.yM) * launchScaleY
          : Math.max(50, groundY - s.yM * descentScaleY);

      ctx.save();
      ctx.translate(craftX, craftY);
      ctx.rotate((s.tiltDeg * Math.PI) / 180);

      // Rocket Cabin
      ctx.fillStyle = '#E8EAF0';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(11, 8);
      ctx.lineTo(-11, 8);
      ctx.closePath();
      ctx.fill();

      // Cockpit window
      ctx.fillStyle = '#3A8EF6';
      ctx.beginPath();
      ctx.arc(0, -9, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Landing Legs
      ctx.strokeStyle = '#7A8AA0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-9, 6);
      ctx.lineTo(-18, 19);
      ctx.moveTo(9, 6);
      ctx.lineTo(18, 19);
      ctx.stroke();

      // Engine Thruster Flame
      if (s.throttle > 0.05 && s.fuelKg > 0) {
        ctx.fillStyle = s.throttle > 0.5 ? '#FF5A1F' : '#E8920A';
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.lineTo(6, 8);
        ctx.lineTo(0, 8 + s.throttle * 24 + Math.random() * 5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // 5. Mission route preview with a live vehicle marker.
      ctx.fillStyle = 'rgba(17, 22, 32, 0.88)';
      ctx.fillRect(326, 16, 858, 126);
      ctx.strokeStyle = '#1E2A3E';
      ctx.strokeRect(326, 16, 858, 126);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText(`MISSION PATH  ·  EARTH → ${body.name.toUpperCase()}`, 342, 34);
      const routeStartX = 390;
      const routeEndX = 1110;
      const routeY = 88;
      const routeControlY = 45;
      const routeProgress = s.phase === 'ascent'
        ? s.phaseProgress * 0.15
        : s.phase === 'transit'
          ? 0.15 + s.phaseProgress * 0.7
          : s.phase === 'landed' || s.phase === 'crashed'
            ? 1
            : 0.85 + s.phaseProgress * 0.15;
      const routePoint = (t: number): { x: number; y: number } => ({
        x: (1 - t) ** 2 * routeStartX + 2 * (1 - t) * t * centerX + t ** 2 * routeEndX,
        y: (1 - t) ** 2 * routeY + 2 * (1 - t) * t * routeControlY + t ** 2 * routeY,
      });
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#34445a';
      ctx.beginPath();
      for (let index = 0; index <= 40; index += 1) {
        const point = routePoint(index / 40);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#ff7b32';
      ctx.beginPath();
      for (let index = 0; index <= 40 * routeProgress; index += 1) {
        const point = routePoint(index / 40);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      const routeMarker = routePoint(routeProgress);
      ctx.fillStyle = '#ff7b32';
      ctx.beginPath();
      ctx.arc(routeMarker.x, routeMarker.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4aa5ff';
      ctx.beginPath();
      ctx.arc(routeStartX - 18, routeY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body.id === 'mars' ? '#c45e4d' : body.id === 'venus' ? '#d2a84c' : '#a9bdcf';
      ctx.beginPath();
      ctx.arc(routeEndX + 5, routeY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#aebbd0';
      ctx.fillText('EARTH', routeStartX - 34, 119);
      ctx.fillText(`${body.name.toUpperCase()} SURFACE`, routeEndX - 45, 119);
      ctx.fillStyle = '#ffb26b';
      ctx.textAlign = 'right';
      ctx.fillText(s.phase.toUpperCase(), 1168, 34);
      ctx.textAlign = 'start';

      // 6. Telemetry HUD Overlay (Top-Left)
      ctx.fillStyle = 'rgba(17, 22, 32, 0.85)';
      ctx.fillRect(16, 16, 290, 190);
      ctx.strokeStyle = '#1E2A3E';
      ctx.lineWidth = 1;
      ctx.strokeRect(16, 16, 290, 190);

      // Header in HUD
      ctx.font = '10px monospace';
      ctx.fillStyle = '#4E5C72';
      ctx.fillText(`${s.phase.toUpperCase()} TELEMETRY`, 26, 32);

      ctx.font = '12px monospace';

      // Altitude
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('ALTITUDE :', 26, 54);
      ctx.fillStyle = '#E8EAF0';
      ctx.fillText(formatDistance(s.yM), 120, 54);

      // Vertical Speed (color-coded)
      const vSafe = isAscent || isTransit || Math.abs(s.vyMs) <= stats.touchdownLimits.maxVyMs;
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('V-SPEED  :', 26, 76);
      ctx.fillStyle = vSafe ? '#1FA971' : '#E03535';
      ctx.fillText(formatSpeed(s.vyMs), 120, 76);

      // Horizontal Speed
      const hSafe = isAscent || isTransit || Math.abs(s.vxMs) <= stats.touchdownLimits.maxVxMs;
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('H-SPEED  :', 26, 98);
      ctx.fillStyle = hSafe ? '#1FA971' : '#E03535';
      ctx.fillText(formatSpeed(s.vxMs), 120, 98);

      // Tilt
      const tiltSafe = Math.abs(s.tiltDeg) <= stats.touchdownLimits.maxTiltDeg;
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('TILT     :', 26, 120);
      ctx.fillStyle = tiltSafe ? '#1FA971' : '#E03535';
      ctx.fillText(formatAngleDeg(s.tiltDeg), 120, 120);

      // Fuel & Throttle
      const fuelPct = stats.fuelMassKg > 0 ? s.fuelKg / stats.fuelMassKg : 0;
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('FUEL     :', 26, 142);
      ctx.fillStyle = s.fuelKg > 20 ? '#3A8EF6' : '#E03535';
      ctx.fillText(`${s.fuelKg.toFixed(0)} kg (${formatPercent(fuelPct)})`, 120, 142);

      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('THROTTLE :', 26, 164);
      ctx.fillStyle = '#FF5A1F';
      ctx.fillText(formatPercent(s.throttle), 120, 164);

      // Heat
      ctx.fillStyle = '#7A8AA0';
      ctx.fillText('THERMAL  :', 26, 186);
      ctx.fillStyle = s.heatMJ > 5 ? '#E03535' : s.heatMJ > 1 ? '#E8920A' : '#1FA971';
      ctx.fillText(`${s.heatMJ.toFixed(1)} MJ`, 120, 186);

      // Flight State Status Banner on Landing / Crash
      if (s.phase === 'landed' || s.phase === 'crashed') {
        const ring = ringForDistance(Math.abs(s.xM), state.save.difficulty);
        const isSoft = s.phase === 'landed';

        ctx.fillStyle = isSoft ? 'rgba(31, 169, 113, 0.92)' : 'rgba(224, 53, 53, 0.92)';
        ctx.fillRect(w / 2 - 220, h / 2 - 50, 440, 100);
        ctx.strokeStyle = isSoft ? '#1FA971' : '#E03535';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 220, h / 2 - 50, 440, 100);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          isSoft ? 'TOUCHDOWN CONFIRMED' : 'MISSION FAILURE: CRASH',
          w / 2,
          h / 2 - 16
        );

        ctx.font = '13px monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(
          `V-Speed: ${s.vyMs.toFixed(1)} m/s | Ring: ${ring} (Dist: ${Math.abs(s.xM).toFixed(1)}m)`,
          w / 2,
          h / 2 + 14
        );

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(
          isSoft ? 'Select "Deploy Surface Operations" below to begin scavenging.' : 'Select "View Incident Report" below to debrief.',
          w / 2,
          h / 2 + 34
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

  // Clean up animation on DOM removal
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (typeof document === 'undefined' || !document.body || !document.body.contains(canvas)) {
        if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
          try {
            cancelAnimationFrame(animFrameId);
          } catch {
            // ignore in headless test environment
          }
        }
        try {
          input.detach();
        } catch {
          // ignore in headless test environment
        }
        clearPointerControls();
        touchControls.removeEventListener('pointerdown', onPointerDown);
        throttleSlider?.removeEventListener('input', onThrottleInput);
        if (typeof window !== 'undefined') {
          window.removeEventListener('pointerup', releasePointerControl);
          window.removeEventListener('pointercancel', releasePointerControl);
          window.removeEventListener('blur', clearPointerControls);
        }
        observer.disconnect();
      }
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
}
