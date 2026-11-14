/**
 * Screen 04: Scavenge → scavenge phase
 * Figma frame 25:4268 (canonical shell reference).
 * Three-column: Action Deck | Radar map | Surface meters.
 * Decision: pre-computed result played back against a countdown timer.
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { formatM } from '@/core/units';
import type { ScavengeResult } from '@/types';

/** Deterministic seeded position for a scavenge item. TODO(owner-3): replace with real positions */
function seededPos(itemId: string, range: number): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < itemId.length; i++) h = (Math.imul(31, h) + itemId.charCodeAt(i)) | 0;
  const angle = ((h & 0xff) / 255) * Math.PI * 2;
  const dist  = (((h >> 8) & 0xff) / 255) * range * 0.8 + range * 0.1;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function renderScavenge(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find(c => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find(b => b.id === contract.bodyId) ?? bodies[0]!;

  const scavenge: ScavengeResult | null = state.missionResult?.scavenge ?? null;
  const flightResult = state.missionResult?.flight;
  const stats = state.stats;

  // Playback state
  let elapsedS = 0;
  const totalS = scavenge?.timeAvailableS ?? 7200;
  let playbackTimer: ReturnType<typeof setInterval> | null = null;
  let finished = false;

  // Part-failure event check (for disabling Collect Sample)
  const hasPartFailure =
    (scavenge?.events ?? []).some((e) => e.kind === 'failure' || e.kind === 'malfunction') ||
    scavenge?.endedBy === 'part-failure';

  // CTA
  const finishBtn = mkPrimary('Finish & See Results →', () => transitionTo('results'));
  const returnBtn = mkSecondary('Return to Orbit', () => {
    // TODO(owner-3): implement early return — for now same as finish
    transitionTo('results');
  });

  const bodyEl = renderShell(root, state, {
    leftActions: [returnBtn],
    rightCta: finishBtn,
    craftName: `${state.design.name} · ${flightResult?.outcome?.toUpperCase() ?? 'LANDED'}`,
    craftStatus: (flightResult?.outcome === 'soft') ? 'nominal' : 'warning',
  });
  bodyEl.style.display = 'flex';

  /* ── LEFT: Action Deck ──────────────────────────────── */
  const leftCol = document.createElement('div');
  leftCol.className = 'ls-col-left';
  leftCol.style.padding = 'var(--ls-sp-3)';

  const actionItems = [
    {
      label: 'Deploy Instrument',
      detail: '12 Wh · 45 min cycle',
      disabled: false,
      disabledReason: '',
    },
    {
      label: 'Send Data',
      detail: '8 Wh · uplink queued',
      disabled: scavenge !== null && scavenge.dataSentMB >= scavenge.dataGeneratedMB,
      disabledReason: 'No buffered data to transmit',
    },
    {
      label: 'Collect Sample',
      detail: '6 Wh · robotic arm',
      disabled: hasPartFailure,
      disabledReason: hasPartFailure ? 'Fault: actuator seal failure' : '',
    },
  ];

  leftCol.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--sp-3)">Action Deck</div>`;
  for (const action of actionItems) {
    const card = document.createElement('div');
    card.style.cssText = `
      border:1px solid ${action.disabled ? 'var(--border)' : 'var(--border)'};
      border-radius:0;
      padding:var(--sp-3);
      margin-bottom:var(--sp-2);
      opacity:${action.disabled ? '0.45' : '1'};
      background:var(--bg-panel);
    `;
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:var(--sp-2); margin-bottom:4px;">
        <span style="font-size:0.75rem; font-weight:600; color:var(--text)">${action.label}</span>
      </div>
      <div style="font-size:0.65rem; color:var(--text-muted); font-family:var(--font-mono); margin-bottom:var(--sp-2)">${action.detail}</div>
      ${action.disabledReason ? `<div style="font-size:0.65rem; color:var(--warn)">${action.disabledReason}</div>` : ''}
      <button class="ls-btn" ${action.disabled ? 'disabled' : ''} style="width:100%; margin-top:var(--sp-2); justify-content:center;">
        ${action.label}
      </button>
    `;
    leftCol.appendChild(card);
  }

  // Site info
  leftCol.innerHTML += `
    <div style="margin-top:auto; padding-top:var(--ls-sp-3); border-top:1px solid var(--ls-border);">
      <div style="display:flex; justify-content:space-between; font-size:var(--ls-size-xs); font-family:var(--ls-font-mono); color:var(--ls-text-dim);">
        <span>Site Radius</span><span style="color:var(--ls-text)">100 m</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:var(--ls-size-xs); font-family:var(--ls-font-mono); color:var(--ls-text-dim); margin-top:4px">
        <span>Drift</span><span style="color:var(--ls-text)">0.000 m/s</span>
      </div>
    </div>
  `;

  bodyEl.appendChild(leftCol);

  /* ── CENTRE: Radar map + countdown ─────────────────── */
  const mainCol = document.createElement('div');
  mainCol.className = 'ls-col-main';

  // Countdown timer (prominent — design omits it, but concept requires it)
  const countdownEl = document.createElement('div');
  countdownEl.style.cssText = `
    border-bottom:1px solid var(--ls-border);
    padding:var(--ls-sp-2) var(--ls-sp-4);
    display:flex;
    align-items:center;
    justify-content:space-between;
    flex-shrink:0;
  `;
  countdownEl.innerHTML = `
    <span class="ls-micro">Surface Operations</span>
    <div style="display:flex; align-items:center; gap:var(--ls-sp-3);">
      <span class="ls-micro">Elapsed</span>
      <span id="scav-elapsed" style="font-family:var(--ls-font-mono); font-size:var(--ls-size-lg); font-weight:700; color:var(--ls-orange)">0:00</span>
      <span class="ls-micro">/</span>
      <span style="font-family:var(--ls-font-mono); font-size:var(--ls-size-base); color:var(--ls-text-dim)">${formatTime(totalS)}</span>
      <span class="ls-micro">Remaining</span>
      <span id="scav-remaining" style="font-family:var(--ls-font-mono); font-size:var(--ls-size-lg); font-weight:700; color:var(--ls-green)">${formatTime(totalS)}</span>
    </div>
    <span id="scav-ended-by" class="ls-chip ls-chip-green" style="display:none">COMPLETE</span>
  `;
  mainCol.appendChild(countdownEl);

  // Radar canvas
  const radarPanel = document.createElement('div');
  radarPanel.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; padding:var(--sp-4); position:relative;';

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;
  canvas.style.cssText = 'border-radius:50%; border:1px solid var(--border); background:#0e0e0f;';
  radarPanel.appendChild(canvas);

  // Coordinate readout above radar
  const coordEl = document.createElement('div');
  coordEl.style.cssText = `position:absolute; top:var(--sp-3); left:50%; transform:translateX(-50%); font-family:var(--font-mono); font-size:0.6875rem; color:var(--text-muted); white-space:nowrap;`;
  coordEl.textContent = `${body.name.toUpperCase()} · 00°00′N 00°00′E`;
  radarPanel.appendChild(coordEl);

  mainCol.appendChild(radarPanel);

  // Event feed
  const feedEl = document.createElement('div');
  feedEl.style.cssText = 'border-top:1px solid var(--border); height:120px; overflow-y:auto; padding:var(--sp-2) var(--sp-3); flex-shrink:0;';
  feedEl.innerHTML = `<div class="ls-micro" style="margin-bottom:4px">Surface Event Log</div><div id="scav-feed" style="font-size:0.6875rem; font-family:var(--font-mono);"></div>`;
  mainCol.appendChild(feedEl);

  bodyEl.appendChild(mainCol);

  /* ── RIGHT: Surface meters ──────────────────────────── */
  const rightCol = document.createElement('div');
  rightCol.className = 'ls-col-right';
  rightCol.style.padding = 'var(--sp-3)';

  const batteryWh = stats.batteryWh;
  const powerGenW = stats.powerGenW;
  const dataGenMB = scavenge?.dataGeneratedMB ?? 0;
  const dataSentMB = scavenge?.dataSentMB ?? 0;
  const dataLostMB = Math.max(0, dataGenMB - dataSentMB);
  const salvageValue = scavenge?.itemsFound.length
    ? scavenge.itemsFound.reduce((s, i) => s + i.quantity * 0.5, 0)
    : 0;

  rightCol.innerHTML = `
    <div class="ls-micro" style="margin-bottom:var(--sp-3)">Surface Meters</div>

    <!-- Battery -->
    <div class="ls-panel" style="margin-bottom:var(--sp-2)">
      <div class="ls-panel-header"><span class="ls-panel-title">Power</span></div>
      <div class="ls-panel-body">
        <div class="ls-meter">
          <div class="ls-meter-row">
            <span class="ls-meter-label">Battery</span>
            <span class="ls-meter-value" id="batt-val">${batteryWh.toFixed(0)} Wh</span>
          </div>
          <div class="ls-meter-track"><div class="ls-meter-fill ok" id="batt-fill" style="width:100%"></div></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.6875rem; font-family:var(--font-mono); color:var(--text-muted); margin-top:4px">
          <span>Solar gen: <span style="color:var(--ok)">${(powerGenW * body.solarFlux).toFixed(0)} W</span></span>
          <span>Draw: <span style="color:var(--text)">${stats.powerDrawW.toFixed(0)} W</span></span>
        </div>
      </div>
    </div>

    <!-- Data -->
    <div class="ls-panel" style="margin-bottom:var(--sp-2)">
      <div class="ls-panel-header"><span class="ls-panel-title">Science Data</span></div>
      <div class="ls-panel-body">
        <div class="ls-meter">
          <div class="ls-meter-row">
            <span class="ls-meter-label">Sent / Generated</span>
            <span class="ls-meter-value" id="data-val">${dataSentMB.toFixed(1)} / ${dataGenMB.toFixed(1)} MB</span>
          </div>
          <div class="ls-meter-track two-tone" id="data-track">
            <div class="seg-a" id="data-sent-bar" style="width:${dataGenMB > 0 ? (dataSentMB / dataGenMB * 100).toFixed(0) : 0}%; height:100%;"></div>
            <div class="seg-b" id="data-lost-bar" style="width:${dataGenMB > 0 ? (dataLostMB / dataGenMB * 100).toFixed(0) : 0}%; height:100%;"></div>
          </div>
        </div>
        <div style="font-size:0.6875rem; color:var(--warn); margin-top:4px; font-family:var(--font-mono);">Lost: ${dataLostMB.toFixed(1)} MB</div>
      </div>
    </div>

    <!-- Salvage -->
    <div class="ls-panel" style="margin-bottom:var(--sp-2)">
      <div class="ls-panel-header"><span class="ls-panel-title">Salvage Value</span></div>
      <div class="ls-panel-body">
        <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:var(--ok)">${formatM(salvageValue)}</div>
        <div style="font-size:0.6875rem; color:var(--text-muted); margin-top:4px">
          ${scavenge?.itemsFound.length ?? 0} item(s) found · 1× survey bonus
        </div>
      </div>
    </div>

    <!-- Surface conditions -->
    <div class="ls-panel">
      <div class="ls-panel-header"><span class="ls-panel-title">Surface Conditions</span></div>
      <div class="ls-panel-body">
        ${[
          ['Surface Temp', ((body as unknown as Record<string, unknown>)['tempRangeC'] as string) ?? (body.atmosphere ? 'Est. −60°C' : 'Est. −173°C')],
          ['Solar Flux', `${(body.solarFlux * 1361).toFixed(0)} W/m²`],
          ['Comm Window', body.id === 'moon' ? 'Direct Earth LoS' : body.id === 'mars' ? 'Orbital Relay (DSN)' : 'Deep Space Relay'],
          ['Atm Pressure', body.atmosphere ? `${(body.atmosphere.surfaceDensityKgM3 * 8.314 * 220 / 0.044).toFixed(0)} Pa` : '0 Pa'],
        ].map(([k, v]) => `
          <div style="display:flex; justify-content:space-between; font-size:0.6875rem; padding:3px 0; border-bottom:1px solid var(--border);">
            <span style="color:var(--text-muted); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.06em">${k}</span>
            <span style="font-family:var(--font-mono); color:var(--text);">${v}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Items found list -->
    <div style="margin-top:var(--sp-3)">
      <div class="ls-micro" style="margin-bottom:var(--sp-2)">Items Found</div>
      <div id="items-found">
        ${(scavenge?.itemsFound.length ?? 0) === 0
          ? '<div style="color:var(--text-muted); font-size:0.6875rem">None yet…</div>'
          : (scavenge?.itemsFound ?? []).map(it => `
              <div style="border-left:2px solid var(--ok); padding:3px var(--sp-2); margin-bottom:4px; font-size:0.6875rem; font-family:var(--font-mono);">
                <span style="color:var(--text)">${it.itemId}</span> ×${it.quantity}
                <span style="color:var(--text-muted)"> T+${formatTime(it.tS)}</span>
                ${it.transmitted ? '<span style="color:var(--ok)"> [OK]</span>' : ''}
              </div>`).join('')}
      </div>
    </div>
  `;

  bodyEl.appendChild(rightCol);

  /* ── Draw radar canvas ────────────────────────────── */
  function drawRadar(progressFraction: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const maxR = Math.min(W, H) / 2 - 4;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0e0e0f';
    ctx.fillRect(0, 0, W, H);

    // Range rings
    const rings = [25, 75, 100];
    for (const r of rings) {
      const rPx = (r / 100) * maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(171, 137, 127, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ab897f';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`${r}m`, cx + rPx + 2, cy);
    }

    // Sweep line
    const sweepAngle = progressFraction * Math.PI * 2 * 4; // 4 rotations over mission
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepAngle);
    const grad = ctx.createLinearGradient(0, 0, maxR, 0);
    grad.addColorStop(0, 'rgba(255,90,31,0.7)');
    grad.addColorStop(1, 'rgba(255,90,31,0)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(maxR, 0);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Landed craft (centre)
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5a1f';
    ctx.fill();
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff5a1f';
    ctx.fillText('LANDER', cx + 8, cy - 8);

    // Item markers
    const items = scavenge?.itemsFound ?? [];
    for (const item of items) {
      const tFraction = totalS > 0 ? item.tS / totalS : 1;
      if (tFraction > progressFraction) continue; // not discovered yet

      const pos = seededPos(item.itemId, 100);
      const px = cx + (pos.x / 100) * maxR;
      const py = cy + (pos.y / 100) * maxR;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#61dda0';
      ctx.fill();
      ctx.fillStyle = '#61dda0';
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.fillText(item.itemId.substring(0, 6), px + 5, py);
    }

    // Scale bar
    ctx.fillStyle = '#ab897f';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('0            50m          100m', 8, H - 8);
  }

  /* ── Playback timer ────────────────────────────────── */
  const playbackEvents = [...(scavenge?.events ?? [])];
  const discoveryEvents = [...(scavenge?.itemsFound ?? [])];
  const feedEl2 = root.querySelector('#scav-feed') as HTMLElement | null;

  function addFeedLine(text: string, color = 'var(--ls-text-dim)') {
    if (!feedEl2) return;
    const line = document.createElement('div');
    line.style.cssText = `color:${color}; border-bottom:1px solid var(--ls-border); padding:2px 0;`;
    line.textContent = text;
    feedEl2.prepend(line);
  }

  if (!scavenge) {
    addFeedLine('[No scavenge data — run a mock mission first]', 'var(--ls-amber)');
  }

  drawRadar(0);

  const TICK_RATE_MS = 100;
  const SPEED_FACTOR = totalS / 30; // play entire mission in ~30s

  playbackTimer = setInterval(() => {
    if (finished) return;
    elapsedS = Math.min(elapsedS + SPEED_FACTOR * (TICK_RATE_MS / 1000), totalS);
    const fraction = totalS > 0 ? elapsedS / totalS : 1;

    // Update countdown
    const elEl = root.querySelector('#scav-elapsed') as HTMLElement | null;
    const remEl = root.querySelector('#scav-remaining') as HTMLElement | null;
    if (elEl) elEl.textContent = formatTime(elapsedS);
    if (remEl) {
      const rem = Math.max(0, totalS - elapsedS);
      remEl.textContent = formatTime(rem);
      remEl.style.color = rem < totalS * 0.2 ? 'var(--ls-red)' : 'var(--ls-green)';
    }

    // Trigger playback events
    for (const ev of playbackEvents) {
      if (ev.tS <= elapsedS && !((ev as (typeof ev) & {_shown?: boolean})._shown)) {
        (ev as (typeof ev) & {_shown?: boolean})._shown = true;
        const color = ev.kind === 'failure' || ev.kind === 'malfunction' ? 'var(--ls-red)'
          : ev.kind === 'warning' ? 'var(--ls-amber)' : 'var(--ls-green)';
        addFeedLine(`T+${formatTime(ev.tS)} ${ev.text}`, color);
      }
    }

    for (const item of discoveryEvents) {
      if (item.tS <= elapsedS && !((item as (typeof item) & {_shown?: boolean})._shown)) {
        (item as (typeof item) & {_shown?: boolean})._shown = true;
        addFeedLine(`T+${formatTime(item.tS)} Found: ${item.itemId} ×${item.quantity}`, 'var(--ls-green)');
      }
    }

    drawRadar(fraction);

    if (elapsedS >= totalS) {
      finished = true;
      clearInterval(playbackTimer!);
      const endedEl = root.querySelector('#scav-ended-by') as HTMLElement | null;
      if (endedEl) {
        endedEl.style.display = '';
        const reason = scavenge?.endedBy ?? 'timer';
        endedEl.textContent = reason === 'timer' ? 'MISSION COMPLETE'
          : reason === 'power' ? 'POWER LOST'
          : reason === 'data-full' ? 'DATA FULL'
          : 'PART FAILURE';
        endedEl.className = `ls-chip ${reason === 'timer' ? 'ls-chip-green' : 'ls-chip-amber'}`;
      }
      addFeedLine('Surface operations concluded.', 'var(--ls-orange)');
    }
  }, TICK_RATE_MS);

  // Clean up timer when navigating away
  const origUpdate = getContracts; // just a reference to prevent lint errors
  void origUpdate; // suppress unused warning

  // Store cleanup on root mutation (navigation replaces root.innerHTML)
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const obs = new MutationObserver(() => {
      if (typeof document === 'undefined' || !document.body || !document.body.contains(canvas)) {
        if (playbackTimer) clearInterval(playbackTimer);
        obs.disconnect();
      }
    });
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }
}
