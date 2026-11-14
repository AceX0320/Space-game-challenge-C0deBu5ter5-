/**
 * Screen 05: Results → Comprehensive Post-Mission Debrief & Incident Report
 * Displays flight outcome, root cause analysis, touchdown telemetry metrics,
 * component wear & tear ledger, fuel consumption audit, multiplier system breakdown,
 * financial settlement, and event timeline.
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getContracts, getParts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { formatM } from '@/core/units';
import { getDamageState } from '@/economy/wear';

export function renderResults(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;
  const partsCatalog = getParts();
  const catalogMap = new Map(partsCatalog.map((p) => [p.id, p]));

  const payout = state.payout;
  const report = state.report;
  const flight = state.missionResult?.flight;
  const stats = state.stats;

  // Buttons
  const nextBtn = mkPrimary('Next Contract →', () => transitionTo('contracts'));
  const researchBtn = mkSecondary('Research Lab', () => transitionTo('research'));
  const replayBtn = mkSecondary('Replay Mission', () => transitionTo('hangar'));

  const flightOutcome = state.missionResult?.flight?.outcome;
  const outcomeLabel = flightOutcome
    ? {
        soft: 'SOFT LANDING — SUCCESS',
        rough: 'ROUGH LANDING — COMPONENT DAMAGE',
        crash: 'MISSION FAILURE — CRAFT DESTROYED',
        abort: 'MISSION ABORTED',
      }[flightOutcome]
    : '—';

  const outcomePillClass =
    flightOutcome === 'soft'
      ? 'ls-chip-green'
      : flightOutcome === 'rough'
        ? 'ls-chip-amber'
        : 'ls-chip-orange';

  const bodyEl = renderShell(root, state, {
    leftActions: [replayBtn, researchBtn],
    rightCta: nextBtn,
    craftName: state.design.name,
    craftStatus: flightOutcome === 'soft' ? 'nominal' : flightOutcome === 'rough' ? 'warning' : 'error',
  });

  bodyEl.style.display = 'flex';
  bodyEl.style.padding = 'var(--ls-sp-4) var(--ls-sp-4) 90px';
  bodyEl.style.gap = 'var(--ls-sp-4)';
  bodyEl.style.overflowY = 'auto';
  bodyEl.style.overscrollBehavior = 'contain';

  if (!payout || !report || !flight) {
    // No result data — user jumped here directly (dev only)
    bodyEl.innerHTML = `
      <div style="margin:auto; text-align:center; color:var(--ls-text-dim);">
        <div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">No mission result available</div>
        <div style="font-size:var(--ls-size-xs)">Launch a mission from the Hangar to see telemetry & debrief results.</div>
      </div>`;
    return;
  }

  // ── Left column: Telemetry, Wear & Tear, Fuel Audit, Financial Settlement ──
  const leftCol = document.createElement('div');
  leftCol.style.cssText = 'flex:1.2; display:flex; flex-direction:column; gap:var(--ls-sp-3); min-width:0;';

  // 1. Outcome Banner
  const bannerColor =
    flightOutcome === 'soft'
      ? 'var(--ok)'
      : flightOutcome === 'rough'
        ? 'var(--warn)'
        : 'var(--danger)';

  const banner = document.createElement('div');
  banner.style.cssText = `border:1px solid ${bannerColor}; background:${bannerColor}14; padding:var(--sp-4); display:flex; align-items:center; gap:var(--sp-4);`;
  banner.innerHTML = `
    <div style="border-left:4px solid ${bannerColor}; padding-left:var(--sp-3); flex:1">
      <div style="font-family:var(--font-mono); font-size:1.25rem; font-weight:700; color:${bannerColor}; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:4px">
        ${outcomeLabel}
      </div>
      <div style="font-size:1rem; color:var(--text); font-weight:500">${report.headline}</div>
    </div>
    <div style="text-align:right; flex-shrink:0;">
      <span class="ls-chip ${outcomePillClass}" style="font-size:0.8125rem; padding:4px 10px;">${flightOutcome.toUpperCase()}</span>
      ${
        payout.isRecord
          ? '<span class="ls-chip ls-chip-orange" style="font-size:0.8125rem; padding:4px 10px; margin-left:6px">NEW PROFIT RECORD</span>'
          : ''
      }
    </div>
  `;
  leftCol.appendChild(banner);

  // 2. Touchdown Kinematics & Impact Analysis Card
  const vy = Math.abs(flight.touchdownVyMs);
  const maxVy = stats.touchdownLimits.maxVyMs;
  const vySafe = vy <= maxVy;

  const vx = Math.abs(flight.touchdownVxMs);
  const maxVx = stats.touchdownLimits.maxVxMs;
  const vxSafe = vx <= maxVx;

  const tilt = Math.abs(flight.touchdownTiltDeg);
  const maxTilt = stats.touchdownLimits.maxTiltDeg;
  const tiltSafe = tilt <= maxTilt;

  const distM = flight.distanceFromTargetM ?? 0;
  const ring = flight.landingRing;

  const telemPanel = document.createElement('div');
  telemPanel.className = 'ls-panel';
  telemPanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Touchdown Telemetry & Impact Kinematics</span>
      <span class="ls-chip ${flightOutcome === 'soft' ? 'ls-chip-green' : flightOutcome === 'rough' ? 'ls-chip-amber' : 'ls-chip-orange'}">
        ${flightOutcome === 'crash' ? 'IMPACT VIOLATION' : 'KINEMATICS NOMINAL'}
      </span>
    </div>
    <div class="ls-panel-body">
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:var(--sp-3);">
        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid ${vySafe ? 'var(--border)' : 'var(--danger)'};">
          <div class="ls-micro">Vertical Speed (Vy)</div>
          <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:${vySafe ? 'var(--ok)' : 'var(--danger)'};">
            ${vy.toFixed(1)} m/s
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">Limit: ≤ ${maxVy} m/s</div>
        </div>

        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid ${vxSafe ? 'var(--border)' : 'var(--danger)'};">
          <div class="ls-micro">Lateral Drift (Vx)</div>
          <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:${vxSafe ? 'var(--ok)' : 'var(--danger)'};">
            ${vx.toFixed(1)} m/s
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">Limit: ≤ ${maxVx} m/s</div>
        </div>

        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid ${tiltSafe ? 'var(--border)' : 'var(--danger)'};">
          <div class="ls-micro">Attitude Tilt Angle</div>
          <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:${tiltSafe ? 'var(--ok)' : 'var(--danger)'};">
            ${tilt.toFixed(1)}°
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">Limit: ≤ ${maxTilt}°</div>
        </div>

        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid var(--border);">
          <div class="ls-micro">Landing Precision</div>
          <div style="font-family:var(--font-mono); font-size:1.125rem; font-weight:700; color:var(--accent);">
            Ring ${ring} / 5
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">${distM.toFixed(1)} m from center</div>
        </div>
      </div>
      <div style="font-size:0.8125rem; color:var(--text-muted); line-height:1.4;">
        ${
          flightOutcome === 'crash'
            ? `<span style="color:var(--danger); font-weight:600">CRASH CAUSE:</span> ${
                !vySafe
                  ? `Descent rate (${vy.toFixed(1)} m/s) exceeded the ${maxVy} m/s landing gear shock threshold, collapsing landing struts on impact.`
                  : !tiltSafe
                    ? `Spacecraft attitude (${tilt.toFixed(1)}°) exceeded the ${maxTilt}° tip-over limit, causing the vehicle to topple and destroy flight systems.`
                    : !vxSafe
                      ? `Lateral drift velocity (${vx.toFixed(1)} m/s) sheared landing gear sideways upon surface contact.`
                      : 'Severe structural destruction occurred before touchdown stabilization.'
              }`
            : flightOutcome === 'rough'
              ? `<span style="color:var(--warn); font-weight:600">DAMAGE NOTICE:</span> Hard landing near structural tolerances caused shock fatigue to installed hardware.`
              : `<span style="color:var(--ok); font-weight:600">TOUCHDOWN CONFIRMED:</span> Controlled touchdown within all structural and attitude margins.`
        }
      </div>
    </div>
  `;
  leftCol.appendChild(telemPanel);

  // 3. Component Wear & Tear Ledger
  const wearDeltas = state.missionResult?.partWearDelta ?? {};
  const installedParts = state.design.parts;

  const wearPanel = document.createElement('div');
  wearPanel.className = 'ls-panel';
  wearPanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Component Health & Wear & Tear Ledger</span>
      <span class="ls-micro">${state.save.difficulty.toUpperCase()} WEAR MODE</span>
    </div>
    <div class="ls-panel-body" style="display:flex; flex-direction:column; gap:8px;">
      ${
        installedParts.length === 0
          ? '<div style="color:var(--text-muted); font-size:0.8125rem;">No components installed on craft.</div>'
          : installedParts
              .map((part) => {
                const def = catalogMap.get(part.partId);
                const name = def?.name ?? part.partId;
                const category = def?.category ?? 'hardware';
                const delta = wearDeltas[part.instanceId] ?? 0;
                const prevCondition = Math.min(100, part.condition + delta);
                const curCondition = part.condition;
                const dmgState = getDamageState(part);
                const dmgBadgeClass =
                  dmgState === 'scratched'
                    ? 'ls-chip-green'
                    : dmgState === 'bent'
                      ? 'ls-chip-amber'
                      : dmgState === 'penetrated'
                        ? 'ls-chip-orange'
                        : 'ls-chip-dim';

                return `
                  <div style="background:var(--bg-inset); border:1px solid var(--border); padding:8px 12px; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:600; font-size:0.875rem; color:var(--text);">${name}</span>
                        <span class="ls-micro" style="color:var(--text-muted); text-transform:uppercase;">[${category}]</span>
                      </div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="ls-chip ${dmgBadgeClass}" style="font-size:0.6875rem; text-transform:uppercase;">${dmgState}</span>
                        <span style="font-family:var(--font-mono); font-size:0.8125rem; color:${delta > 0 ? 'var(--danger)' : 'var(--ok)'}">
                          ${delta > 0 ? `-${delta.toFixed(1)}%` : '0%'} wear
                        </span>
                      </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">
                      <span>Condition: ${prevCondition.toFixed(0)}% → <strong style="color:var(--text)">${curCondition.toFixed(0)}%</strong></span>
                      <span>Ceiling: ${part.maxCondition}%</span>
                    </div>

                    <div class="ls-meter-track" style="height:6px; margin-top:2px;">
                      <div class="ls-meter-fill ${curCondition >= 75 ? 'ok' : curCondition >= 40 ? 'warn' : 'bad'}" style="width:${curCondition}%"></div>
                    </div>
                  </div>
                `;
              })
              .join('')
      }
    </div>
  `;
  leftCol.appendChild(wearPanel);

  // 4. Fuel Consumption & Efficiency Audit Card
  const initialFuel = stats.fuelMassKg;
  const fuelLeft = flight.fuelLeftKg;
  const fuelUsedTotal = Math.max(0, initialFuel - fuelLeft);
  const fuelLeftPct = initialFuel > 0 ? (fuelLeft / initialFuel) * 100 : 0;
  const ascentUsedPct = flight.ascentFuelUsedPct ?? 0;
  const isFuelCritical = fuelLeftPct < 5;
  const isFuelOptimal = fuelLeftPct >= 20;

  const fuelPanel = document.createElement('div');
  fuelPanel.className = 'ls-panel';
  fuelPanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Propellant Consumption & Efficiency Audit</span>
      <span class="ls-chip ${isFuelOptimal ? 'ls-chip-green' : isFuelCritical ? 'ls-chip-orange' : 'ls-chip-amber'}">
        ${isFuelOptimal ? 'OPTIMAL RESERVE' : isFuelCritical ? 'CRITICAL RESERVE' : 'ACCEPTABLE'}
      </span>
    </div>
    <div class="ls-panel-body">
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:var(--sp-2);">
        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid var(--border);">
          <div class="ls-micro">Ascent Phase Burn</div>
          <div style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:var(--text)">
            ${ascentUsedPct.toFixed(1)}%
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">Target: < 25% for bonus</div>
        </div>

        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid var(--border);">
          <div class="ls-micro">Propellant Used</div>
          <div style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:var(--text)">
            ${fuelUsedTotal.toFixed(0)} kg
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">Total: ${initialFuel.toFixed(0)} kg</div>
        </div>

        <div style="background:var(--bg-inset); padding:8px 10px; border:1px solid ${isFuelCritical ? 'var(--danger)' : 'var(--border)'};">
          <div class="ls-micro">Touchdown Reserve</div>
          <div style="font-family:var(--font-mono); font-size:1rem; font-weight:700; color:${isFuelOptimal ? 'var(--ok)' : isFuelCritical ? 'var(--danger)' : 'var(--warn)'}">
            ${fuelLeft.toFixed(0)} kg (${fuelLeftPct.toFixed(1)}%)
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted);">${fuelLeftPct >= 10 ? 'Safe margin' : 'Near dry'}</div>
        </div>
      </div>
      <div class="ls-meter-track" style="height:6px; margin-top:6px;">
        <div class="ls-meter-fill ${isFuelOptimal ? 'ok' : isFuelCritical ? 'bad' : 'warn'}" style="width:${fuelLeftPct}%"></div>
      </div>
    </div>
  `;
  leftCol.appendChild(fuelPanel);

  // 5. Financial Settlement Card
  const finPanel = document.createElement('div');
  finPanel.className = 'ls-panel';
  finPanel.innerHTML = `
    <div class="ls-panel-header"><span class="ls-panel-title">Financial Settlement & Balance Sheet</span></div>
    <div class="ls-panel-body">
      ${[
        ['Base Contract Reward', formatM(contract.rewardM), 'var(--text-muted)'],
        [`Streak Multiplier Bonus (×${payout.streakMultiplier.toFixed(2)})`, `+${formatM(Math.max(0, payout.grossRewardM - contract.rewardM))}`, 'var(--ok)'],
        ['Gross Reward Earned', `+${formatM(payout.grossRewardM)}`, 'var(--ok)'],
        ['separator', '', ''],
        ['Spacecraft Build Cost', `-${formatM(payout.buildCostM)}`, 'var(--danger)'],
        ['Launch & Transit Cost', `-${formatM(payout.launchCostM)}`, 'var(--danger)'],
        ['Wear & Repair Liability', `-${formatM(payout.repairCostM)}`, 'var(--danger)'],
        ['separator', '', ''],
        ['Net Mission Result', `${payout.netM >= 0 ? '+' : ''}${formatM(payout.netM)}`, payout.netM >= 0 ? 'var(--ok)' : 'var(--danger)'],
        ['Agency Funds Now', formatM(state.save.fundsM), 'var(--ok)'],
      ]
        .map(([label, value, color]) =>
          label === 'separator'
            ? `<div style="border-top:1px solid var(--border); margin:6px 0;"></div>`
            : `<div style="display:flex; justify-content:space-between; align-items:center; min-height:36px; padding:4px 0; font-size:0.9375rem; border-bottom:1px solid rgba(42,42,43,0.5);">
                <span style="color:var(--text-muted); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.06em">${label}</span>
                <span style="font-family:var(--font-mono); font-weight:700; color:${color}">${value}</span>
               </div>`
        )
        .join('')}

      <!-- Funding gate progress -->
      <div class="ls-meter" style="margin-top:var(--sp-4)">
        <div class="ls-meter-row">
          <span class="ls-meter-label" style="font-size:0.875rem">Funding Gate to Next Tier</span>
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

  // 6. Mission Timeline
  if (report.timeline.length) {
    const tlPanel = document.createElement('div');
    tlPanel.className = 'ls-panel';
    tlPanel.innerHTML = `
      <div class="ls-panel-header"><span class="ls-panel-title">Mission Chronology & Flight Log</span></div>
      <div class="ls-panel-body" style="max-height:220px; overflow-y:auto; overscroll-behavior:contain;">
        ${report.timeline
          .map((ev) => {
            const color =
              ev.kind === 'failure' || ev.kind === 'malfunction'
                ? 'var(--danger)'
                : ev.kind === 'warning'
                  ? 'var(--warn)'
                  : ev.kind === 'milestone'
                    ? 'var(--ok)'
                    : 'var(--text-muted)';
            return `<div style="display:flex; gap:var(--sp-3); padding:6px 0; border-bottom:1px solid var(--border); font-size:0.8125rem;">
              <span style="color:var(--text-muted); font-family:var(--font-mono); flex-shrink:0">${ev.text.split(' — ')[0]}</span>
              <span style="color:${color}">${ev.text.includes(' — ') ? ev.text.split(' — ').slice(1).join(' — ') : ev.text}</span>
            </div>`;
          })
          .join('')}
      </div>
    `;
    leftCol.appendChild(tlPanel);
  }

  bodyEl.appendChild(leftCol);

  // ── Right column: Performance Score, Multiplier System, Advisories ──
  const rightCol = document.createElement('div');
  rightCol.style.cssText = 'width:380px; flex-shrink:0; display:flex; flex-direction:column; gap:var(--sp-3);';

  // 1. Performance Score Card
  const scorePanel = document.createElement('div');
  scorePanel.className = 'ls-panel';
  scorePanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Performance Score</span>
      <span style="font-family:var(--font-mono); font-size:1.75rem; font-weight:700; color:var(--accent)">
        ${payout.score.total}<span style="font-size:0.875rem; color:var(--text-muted)"> / 100</span>
      </span>
    </div>
    <div class="ls-panel-body">
      ${(
        [
          ['Landing Accuracy', payout.score.landing],
          ['Science Yield', payout.score.science],
          ['Efficiency', payout.score.efficiency],
          ['Engineering Decisions', payout.score.decisions],
          ['Team Bonus', payout.score.teamBonus],
        ] as [string, number][]
      )
        .map(
          ([label, val]) => `
        <div class="ls-meter" style="margin-bottom:var(--sp-3)">
          <div class="ls-meter-row">
            <span class="ls-meter-label" style="font-size:0.8125rem">${label}</span>
            <span class="ls-meter-value" style="font-size:0.9375rem">${val}<span style="color:var(--text-muted)">/ 100</span></span>
          </div>
          <div class="ls-meter-track" style="height:6px;">
            <div class="ls-meter-fill ${val >= 80 ? 'ok' : val >= 50 ? 'warn' : 'bad'}" style="width:${val}%"></div>
          </div>
        </div>`
        )
        .join('')}
    </div>
  `;
  rightCol.appendChild(scorePanel);

  // 2. Multiplier & Streak System Card (Requested Fix!)
  const streaks = state.save.streaks;
  const streakTracks: { id: string; label: string; count: number; desc: string }[] = [
    { id: 'cleanAscent', label: 'Clean Ascent', count: streaks.cleanAscent, desc: 'Ascent fuel burn < 25%' },
    { id: 'softTouch', label: 'Soft Touch', count: streaks.softTouch, desc: 'Touchdown speed < 50% limit' },
    { id: 'pinpoint', label: 'Pinpoint Landing', count: streaks.pinpoint, desc: 'Landed in Bullseye Ring 4 or 5' },
    { id: 'smoothHands', label: 'Smooth Hands', count: streaks.smoothHands, desc: 'Minimal manual attitude corrections' },
    { id: 'frugal', label: 'Frugal Engineering', count: streaks.frugal, desc: 'Build cost < 70% budget cap' },
  ];

  const multPanel = document.createElement('div');
  multPanel.className = 'ls-panel';
  multPanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Multiplier System & Streaks</span>
      <span class="ls-chip ls-chip-green" style="font-weight:700; font-size:0.875rem">
        ×${payout.streakMultiplier.toFixed(2)} MULTIPLIER
      </span>
    </div>
    <div class="ls-panel-body">
      <div style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:var(--sp-3); line-height:1.4;">
        Streaks grant <strong style="color:var(--ok)">+0.05× gross contract reward</strong> for each consecutive achievement (up to <strong style="color:var(--text)">2.00×</strong>). Failing a mission resets active streaks unless covered by a safety net.
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        ${streakTracks
          .map(
            (trk) => `
          <div style="background:var(--bg-inset); padding:6px 10px; border:1px solid ${trk.count > 0 ? 'var(--ok)' : 'var(--border)'}; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:600; font-size:0.8125rem; color:${trk.count > 0 ? 'var(--text)' : 'var(--text-muted)'};">
                ${trk.label}
              </div>
              <div style="font-size:0.6875rem; color:var(--text-muted);">${trk.desc}</div>
            </div>
            <span class="ls-chip ${trk.count > 0 ? 'ls-chip-green' : 'ls-chip-dim'}" style="font-weight:700; font-size:0.75rem;">
              ${trk.count > 0 ? `${trk.count}x STREAK` : '0x'}
            </span>
          </div>
        `
          )
          .join('')}
      </div>

      <div style="margin-top:var(--sp-3); padding-top:var(--sp-2); border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:0.8125rem;">
        <span style="color:var(--text-muted)">Safety Nets Available:</span>
        <span style="font-family:var(--font-mono); font-weight:700; color:${state.save.safetyNets > 0 ? 'var(--ok)' : 'var(--text-muted)'}">
          ${state.save.safetyNets} active
        </span>
      </div>
    </div>
  `;
  rightCol.appendChild(multPanel);

  // 3. Flight Analysis Causes
  const causesPanel = document.createElement('div');
  causesPanel.className = 'ls-panel';
  causesPanel.innerHTML = `
    <div class="ls-panel-header"><span class="ls-panel-title">Flight Analysis & Root Causes</span></div>
    <div class="ls-panel-body">
      ${report.causes
        .map(
          (c) => `
        <div class="ls-advisory ${c.severity === 'critical' ? 'error' : c.severity === 'warning' ? '' : c.severity === 'good' ? 'ok' : 'info'}" style="font-size:0.875rem; margin-bottom:var(--sp-2)">
          <div class="ls-advisory-title">${c.severity.toUpperCase()}</div>
          ${c.text}
        </div>`
        )
        .join('')}
    </div>
  `;
  rightCol.appendChild(causesPanel);

  // 4. Recommendations & NASA Historical Analogue
  if (report.suggestions.length) {
    const sugPanel = document.createElement('div');
    sugPanel.className = 'ls-panel';
    sugPanel.innerHTML = `
      <div class="ls-panel-header"><span class="ls-panel-title">NASA Engineering Recommendations</span></div>
      <div class="ls-panel-body">
        ${report.suggestions
          .map(
            (s) => `<div class="ls-advisory info" style="margin-bottom:6px"><div class="ls-advisory-title">Engineering Action</div>${s}</div>`
          )
          .join('')}
        ${
          report.similarRealMission
            ? `
          <div style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); border-top:1px solid var(--ls-border); padding-top:var(--ls-sp-2); margin-top:var(--ls-sp-2); line-height:1.4;">
            Historical NASA Mission Analogue:<br><em style="color:var(--ls-text)">${report.similarRealMission}</em>
          </div>`
            : ''
        }
      </div>
    `;
    rightCol.appendChild(sugPanel);
  }

  bodyEl.appendChild(rightCol);
}
