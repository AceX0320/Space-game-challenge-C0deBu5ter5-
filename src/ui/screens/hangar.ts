/**
 * Screen 01: Hangar → Spacecraft Assembly Phase
 * Figma frame 21:704.
 * Three-column layout:
 * - Left: Parts Library (search + categories + draggable component cards)
 * - Center: Interactive 2D Blueprint Schematic (grid, datum ground line, CoM, dimensions, snap points)
 *          + Compact Horizontal Installed Hardware Strip
 * - Right: High-Visibility Budget Panel + Part Tuning Matrix + Live Telemetry + Advisories
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts, getParts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { computeShipStats } from '@/builder/compute-ship-stats';
import { formatM } from '@/core/units';
import { getLockReason, getActiveHints } from '@/data/tutorial';
import { getStore } from '@/state/store';
import { mockDesign } from '@/mocks/mock-design';
import type { PartCategory, PartDef, PartInstance } from '@/types';
import { createBudgetPanel } from '@/ui/components/budget-panel';
import {
  resolveAssemblyLayout,
  loadMountMap,
  saveMountMap,
} from '@/ui/assembly/mount-points';
import { renderPartSvg, renderPartThumbnail } from '@/ui/assembly/part-renderers';

const CATEGORIES: { key: string; label: string; cats: PartCategory[] }[] = [
  { key: 'all',    label: 'All',           cats: [] },
  { key: 'engine', label: 'Engines',       cats: ['engine'] },
  { key: 'tank',   label: 'Tanks',         cats: ['tank'] },
  { key: 'struct', label: 'Structure',     cats: ['hull', 'leg', 'heatshield', 'parachute'] },
  { key: 'power',  label: 'Power',         cats: ['power'] },
  { key: 'comms',  label: 'Comms/Science', cats: ['comms', 'instrument', 'computer', 'rcs'] },
];

function hashDesign(design: import('@/types').ShipDesign): string {
  const str = JSON.stringify(design.parts.map((p) => `${p.partId}:${JSON.stringify(p.paramValues)}`));
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).substring(0, 6).toUpperCase();
}

function statColor(val: number, ok: number, warn: number): string {
  if (val >= ok) return 'var(--ok)';
  if (val >= warn) return 'var(--warn)';
  return 'var(--danger)';
}

export function renderHangar(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find((c) => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find((b) => b.id === contract.bodyId) ?? bodies[0]!;
  const catalog = getParts();

  let design = { ...state.design, parts: [...state.design.parts] };
  let stats = computeShipStats(design, catalog, body);
  let activeFilter = 'all';
  let selectedPartInstanceId: string | null = design.parts[0]?.instanceId ?? null;
  let draggedPartDef: PartDef | null = null;

  const isOverBudget = state.save.difficulty !== 'sandbox' && stats.costM > contract.budgetCapM;

  // ── Footer action buttons ──────────────────────────────────────────────────
  const ctaBtn = mkPrimary(
    isOverBudget ? 'Continue (Over Budget) ⚠' : 'Continue to Pre-flight →',
    () => transitionTo('preflight')
  );
  if (isOverBudget) {
    ctaBtn.style.background = 'var(--danger)';
    ctaBtn.style.borderColor = 'var(--danger)';
    ctaBtn.title = 'Warning: Over contract budget! Launching over budget forfeits completion bonus.';
  }

  const presetBtn = mkSecondary('Starter Moon Preset', () => {
    design = { ...mockDesign, parts: [...mockDesign.parts] };
    getStore().update({ design });
    renderHangar(root, getStore().getState());
  });

  const saveBtn = mkSecondary('Save Design', () => {
    getStore().update({ design });
    saveBtn.textContent = '✓ Saved';
    setTimeout(() => {
      saveBtn.textContent = 'Save Design';
    }, 1200);
  });

  const resetBtn = mkSecondary('Reset Assembly', () => {
    design = { ...state.design, parts: [] };
    const emptyMap: Record<string, string> = {};
    saveMountMap(emptyMap);
    getStore().update({ design });
    renderHangar(root, getStore().getState());
  });

  const bodyEl = renderShell(root, state, {
    leftActions: [presetBtn, saveBtn, resetBtn],
    rightCta: ctaBtn,
    craftName: `${design.name} · #${hashDesign(design)}`,
    craftStatus: stats.valid ? 'nominal' : stats.violations.length ? 'error' : 'warning',
  });
  bodyEl.style.display = 'flex';

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN 1: LEFT — Parts Library (search, filters, draggable cards)
  // ─────────────────────────────────────────────────────────────────────────
  const leftCol = document.createElement('div');
  leftCol.className = 'ls-col-left';

  // Header + search + filter pills
  const libHeader = document.createElement('div');
  libHeader.style.cssText = 'padding: var(--sp-3); border-bottom: 1px solid var(--border); flex-shrink: 0;';
  libHeader.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2);">
      <span class="ls-panel-title">Component Hierarchy & Library</span>
      <span class="ls-micro" style="color:var(--text-muted);">${catalog.length} Available</span>
    </div>
    <input id="hangar-search" type="text" placeholder="Search catalog…"
      aria-label="Search parts catalog"
      style="width: 100%; background: var(--bg-card); border: 1px solid var(--border); color: var(--text);
             font-size: var(--text-min, 0.75rem); padding: 7px 10px; font-family: var(--font-mono);
             margin-bottom: var(--sp-2);" />
    <div id="cat-filter" style="display: flex; flex-wrap: wrap; gap: 4px;" role="tablist">
      ${CATEGORIES.map(
        (c) => `
        <button class="ls-chip ${activeFilter === c.key ? 'ls-chip-orange' : 'ls-chip-dim'}"
                data-cat="${c.key}" role="tab" aria-selected="${activeFilter === c.key}"
                style="cursor: pointer; padding: 4px 8px; border-radius: 0;">
          ${c.label}
        </button>
      `
      ).join('')}
    </div>
  `;
  leftCol.appendChild(libHeader);

  // Scrollable parts list
  const partsListEl = document.createElement('div');
  partsListEl.id = 'parts-list';
  partsListEl.setAttribute('data-tutorial', 'parts-menu');
  partsListEl.style.cssText = 'flex: 1; overflow-y: auto; padding: var(--sp-2) var(--sp-3);';
  leftCol.appendChild(partsListEl);

  bodyEl.appendChild(leftCol);

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN 2: CENTER — Interactive Blueprint Schematic & Installed Hardware Strip
  // ─────────────────────────────────────────────────────────────────────────
  const mainCol = document.createElement('div');
  mainCol.className = 'ls-col-main';
  mainCol.style.cssText = 'padding: 0; display: flex; flex-direction: column; overflow: hidden;';

  // 1. Contract strip
  const contractStrip = document.createElement('div');
  contractStrip.style.cssText = `
    border-bottom: 1px solid var(--border);
    padding: var(--sp-2) var(--sp-4);
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-shrink: 0;
    background: var(--bg-card);
  `;
  contractStrip.innerHTML = `
    <span class="ls-micro">Contract:</span>
    <span style="font-size: var(--text-body); font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
      ${contract.title}
    </span>
    <span class="ls-micro">Target:</span>
    <span class="ls-chip ls-chip-dim">${body.name}</span>
    <span class="ls-micro">Cap:</span>
    <span style="font-family: var(--font-mono); font-size: var(--text-ui); font-weight: 700; color: var(--ok);">
      ${formatM(contract.budgetCapM)}
    </span>
    <span class="ls-micro">Used:</span>
    <span style="font-family: var(--font-mono); font-size: var(--text-ui); font-weight: 700; color: ${isOverBudget ? 'var(--danger)' : 'var(--text)'};">
      ${formatM(stats.costM)}
    </span>
    <div style="display: flex; gap: 4px; flex-shrink: 0;">
      ${contract.requiredInstruments.map((i) => `<span class="ls-chip ls-chip-orange">${i}</span>`).join('')}
    </div>
  `;
  mainCol.appendChild(contractStrip);

  // 2. Blueprint Canvas Bar (View switcher & blueprint title)
  const bpBar = document.createElement('div');
  bpBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 6px var(--sp-4); border-bottom: 1px solid var(--border); background: var(--bg-inset); flex-shrink: 0;';
  bpBar.innerHTML = `
    <div class="ls-seg-ctrl">
      <button class="ls-seg-btn is-active" aria-label="2D Blueprint Schematic View">2D BLUEPRINT</button>
      <button class="ls-seg-btn" disabled title="Isometric schematic — coming soon">ISO</button>
      <button class="ls-seg-btn" disabled title="Wireframe matrix — coming soon">WIRE</button>
    </div>
    <div style="display:flex; align-items:center; gap:var(--sp-2);">
      <span class="ls-micro" style="color:var(--text-muted);">DATUM: SURFACE INTERFACE</span>
      <span class="ls-chip ls-chip-dim" style="font-size:11px;">SCALE 1:40</span>
    </div>
  `;
  mainCol.appendChild(bpBar);

  // 3. Blueprint Graphic Container
  const blueprintContainer = document.createElement('div');
  blueprintContainer.style.cssText = `
    flex: 1;
    position: relative;
    background: #090e14;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  `;
  mainCol.appendChild(blueprintContainer);

  // 4. Horizontal Installed Hardware Strip (below canvas)
  const hardwareStrip = document.createElement('div');
  hardwareStrip.className = 'installed-hardware-strip';
  mainCol.appendChild(hardwareStrip);

  bodyEl.appendChild(mainCol);

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN 3: RIGHT — Budget Panel + Part Tuning + Telemetry + Advisories
  // ─────────────────────────────────────────────────────────────────────────
  const rightCol = document.createElement('div');
  rightCol.className = 'ls-col-right';
  rightCol.style.padding = '0';
  bodyEl.appendChild(rightCol);

  // Budget panel handle for ghost preview
  let budgetPanelInstance: { element: HTMLElement; setPreviewCost: (partCostM: number | null) => void } | null = null;

  function renderRightColumn(): void {
    stats = computeShipStats(design, catalog, body);
    rightCol.innerHTML = '';

    // 1. High-Visibility Budget Panel
    budgetPanelInstance = createBudgetPanel({
      costM: stats.costM,
      budgetCapM: contract.budgetCapM,
      fundsM: state.save.fundsM,
      difficulty: state.save.difficulty,
      installedParts: design.parts,
      catalog,
      onRemovePart: (instanceId: string) => {
        handleRemovePart(instanceId);
      },
      onReviewParts: () => {
        hardwareStrip.scrollIntoView({ behavior: 'smooth' });
      },
    });
    rightCol.appendChild(budgetPanelInstance.element);

    // 2. Part Tuning Matrix
    const selInst = selectedPartInstanceId
      ? design.parts.find((p) => p.instanceId === selectedPartInstanceId)
      : design.parts[0] ?? null;
    const selDef = selInst ? catalog.find((d) => d.id === selInst.partId) : null;

    const tuningPanel = document.createElement('div');
    tuningPanel.className = 'ls-panel';
    tuningPanel.style.cssText = 'border-bottom: 1px solid var(--border);';
    tuningPanel.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Component Tuning Matrix</span>
        ${selDef ? `<span class="ls-chip ls-chip-orange">${selDef.category}</span>` : ''}
      </div>
    `;

    const tuningBody = document.createElement('div');
    tuningBody.className = 'ls-panel-body';

    if (selDef && selInst) {
      tuningBody.innerHTML = `
        <div style="font-size: var(--text-ui); color: var(--text); font-weight: 600; margin-bottom: var(--sp-2);">
          ${selDef.name}
        </div>
      `;

      for (const param of selDef.params) {
        const curVal = selInst.paramValues[param.key] ?? param.default;
        const pct = ((curVal - param.min) / (param.max - param.min)) * 100;
        const nomPct = ((param.default - param.min) / (param.max - param.min)) * 100;

        const sliderGroup = document.createElement('div');
        sliderGroup.style.marginBottom = 'var(--sp-3)';
        sliderGroup.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: var(--text-min); margin-bottom: 4px;">
            <span style="color: var(--text-muted);" title="${param.explain}">${param.label}</span>
            <span style="font-family: var(--font-mono); color: var(--text); font-weight: 700;">
              ${curVal.toFixed(2)} ${param.unit}
            </span>
          </div>
          <div style="position: relative; height: 6px; background: var(--bg-inset); border: 1px solid var(--border); margin-bottom: 6px;">
            <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${pct.toFixed(0)}%; background: var(--accent);"></div>
            <div style="position: absolute; left: ${nomPct.toFixed(0)}%; top: -3px; width: 2px; height: 12px; background: var(--ok);" title="Nominal Default: ${param.default}"></div>
          </div>
          <input type="range" data-param="${param.key}" data-inst="${selInst.instanceId}"
            min="${param.min}" max="${param.max}" step="${param.step}" value="${curVal}"
            aria-label="${param.label} slider"
            style="width: 100%; accent-color: var(--accent); cursor: pointer; margin-bottom: 4px;" data-tutorial="throttle-slider"/>
          <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
            <span>${param.min}</span>
            <span style="color: var(--ok);">NOM ${param.default}</span>
            <span>${param.max}</span>
          </div>
        `;
        tuningBody.appendChild(sliderGroup);
      }
    } else {
      tuningBody.innerHTML = `
        <div style="color: var(--text-muted); font-size: var(--text-body); text-align: center; padding: var(--sp-4) 0;">
          Select an installed part from the blueprint or hardware rack to tune parameters.
        </div>
      `;
    }
    tuningPanel.appendChild(tuningBody);
    rightCol.appendChild(tuningPanel);

    // 3. Live Flight Telemetry (2-column key/value grid, min 28px row height)
    const telemPanel = document.createElement('div');
    telemPanel.className = 'ls-panel';
    telemPanel.style.cssText = 'border-bottom: 1px solid var(--border);';
    telemPanel.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Live Flight Telemetry</span>
        <span class="ls-micro">${body.name} Orbit Model</span>
      </div>
    `;

    const telemBody = document.createElement('div');
    telemBody.className = 'ls-panel-body';
    telemBody.style.cssText = 'padding: var(--sp-2) var(--sp-3);';

    const telemRows: [string, string, string][] = [
      ['Reliability',  `${(stats.reliability * 100).toFixed(0)}%`, statColor(stats.reliability, 0.9, 0.7)],
      ['Total Mass',   `${(stats.totalMassKg / 1000).toFixed(2)} t`, 'var(--text)'],
      ['Dry / Fuel',   `${(stats.dryMassKg / 1000).toFixed(1)} / ${(stats.fuelMassKg / 1000).toFixed(1)} t`, 'var(--text-muted)'],
      ['Delta-V',      `${stats.deltaVms.toFixed(0)} m/s`, statColor(stats.deltaVms, 2000, 500)],
      ['TWR',          `${stats.twr.toFixed(2)}×`, statColor(stats.twr, 1.3, 1.0)],
      ['Power Net',    `${(stats.powerGenW - stats.powerDrawW).toFixed(0)} W`, statColor(stats.powerGenW - stats.powerDrawW, 50, 0)],
      ['Downlink',     `${stats.downlinkKbps.toFixed(0)} kbps`, statColor(stats.downlinkKbps - stats.dataGenKbps, 0, -50)],
      ['Hardware Cost', formatM(stats.costM), stats.costM <= contract.budgetCapM ? 'var(--ok)' : 'var(--danger)'],
    ];

    for (const [label, value, color] of telemRows) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 28px;
        padding: 4px 0;
        border-bottom: 1px solid var(--border);
        font-size: var(--text-min);
      `;
      row.innerHTML = `
        <span class="ls-micro" style="color: var(--text-muted);">${label}</span>
        <span style="font-family: var(--font-mono); font-weight: 700; color: ${color};">${value}</span>
      `;
      telemBody.appendChild(row);
    }
    telemPanel.appendChild(telemBody);
    rightCol.appendChild(telemPanel);

    // 4. Diagnostics & Advisories
    const diagPanel = document.createElement('div');
    diagPanel.className = 'ls-panel';
    diagPanel.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Diagnostics & Advisories</span>
      </div>
    `;

    const diagBody = document.createElement('div');
    diagBody.className = 'ls-panel-body';

    for (const v of stats.violations) {
      diagBody.innerHTML += `<div class="ls-advisory error"><div class="ls-advisory-title">Violation</div>${v}</div>`;
    }
    for (const w of stats.warnings) {
      diagBody.innerHTML += `<div class="ls-advisory"><div class="ls-advisory-title">Warning</div>${w}</div>`;
    }

    const hints = getActiveHints({ stats, body, contract, design, catalog }, state.save.difficulty);
    for (const h of hints) {
      diagBody.innerHTML += `<div class="ls-advisory info"><div class="ls-advisory-title">Hint</div>${h}</div>`;
    }

    if (!stats.violations.length && !stats.warnings.length) {
      diagBody.innerHTML += `
        <div class="ls-advisory ok">
          <div class="ls-advisory-title">All Systems Nominal</div>
          Spacecraft structure and systems verified for flight trajectory.
        </div>
      `;
    }

    diagPanel.appendChild(diagBody);
    rightCol.appendChild(diagPanel);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BLUEPRINT SCHEMATIC DRAWING (Canvas with snap nodes, leader lines, dimensions)
  // ─────────────────────────────────────────────────────────────────────────
  function renderBlueprint(): void {
    const layout = resolveAssemblyLayout(design.parts, catalog, 200, 220);
    const { placements, unmounted, availableSlots } = layout;

    // Dimensions calculation
    const groundDatumY = 410;
    let minY = groundDatumY - 60;
    let maxY = groundDatumY - 20;
    let minX = 160;
    let maxX = 240;

    if (placements.length > 0) {
      minY = Math.min(...placements.map((p) => p.canvasY - 35));
      maxY = Math.max(...placements.map((p) => p.canvasY + 35));
      minX = Math.min(...placements.map((p) => p.canvasX - 45));
      maxX = Math.max(...placements.map((p) => p.canvasX + 45));
    }

    const craftHeightM = Math.max(1.8, (groundDatumY - minY) / 30);
    const craftSpanM = Math.max(1.4, (maxX - minX) / 30);
    const comY = placements.length > 0 ? (minY + maxY) / 2 : groundDatumY - 80;
    const comZM = ((groundDatumY - comY) / 30).toFixed(2);

    let partsSvg = '';
    let leaderLinesSvg = '';

    // Render placed parts & leader lines
    for (const placement of placements) {
      const inst = design.parts.find((p) => p.instanceId === placement.instanceId);
      const def = catalog.find((d) => d.id === placement.partId);
      if (!inst || !def) continue;

      const isSel = placement.instanceId === selectedPartInstanceId;
      partsSvg += `
        <g class="blueprint-part-group ${isSel ? 'is-selected' : ''}"
           transform="translate(${placement.canvasX}, ${placement.canvasY})"
           data-inst-id="${placement.instanceId}" tabindex="0" role="button"
           aria-label="${def.name}">
          ${renderPartSvg(inst, def, isSel)}
        </g>
      `;

      // Leader callout line matching Figma frame 21:704
      const leaderSide = placement.canvasX >= 200 ? 1 : -1;
      const lx1 = placement.canvasX + leaderSide * 35;
      const ly1 = placement.canvasY;
      const lx2 = leaderSide > 0 ? Math.max(maxX + 15, lx1 + 25) : Math.min(minX - 15, lx1 - 25);
      const ly2 = ly1 - 10;
      const lx3 = leaderSide > 0 ? lx2 + 45 : lx2 - 45;

      leaderLinesSvg += `
        <g class="leader-callout" opacity="0.75" pointer-events="none">
          <polyline points="${lx1},${ly1} ${lx2},${ly2} ${lx3},${ly2}"
                    fill="none" stroke="var(--border)" stroke-width="1" />
          <circle cx="${lx1}" cy="${ly1}" r="2" fill="var(--accent)" />
          <text x="${leaderSide > 0 ? lx2 + 4 : lx3 + 4}" y="${ly2 - 3}"
                fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8" font-weight="600" letter-spacing="0.5px">
            ${def.name.toUpperCase()}
          </text>
        </g>
      `;
    }

    // Snap nodes rendering
    let snapNodesSvg = '';
    for (const slot of availableSlots) {
      const isCompatible = !draggedPartDef || slot.allowedCategories.includes(draggedPartDef.category);
      if (isCompatible) {
        snapNodesSvg += `
          <g class="blueprint-snap-node" data-slot-key="${slot.parentInstanceId}:${slot.mountPointId}"
             transform="translate(${slot.canvasX}, ${slot.canvasY})" style="cursor: pointer;">
            <circle cx="0" cy="0" r="14" fill="rgba(0, 180, 240, 0.12)"
                    stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"
                    class="snap-node-pulse" />
            <text cx="0" cy="3" text-anchor="middle" font-size="10" font-weight="700"
                  fill="var(--accent)" font-family="var(--font-mono)">+</text>
          </g>
        `;
      }
    }

    blueprintContainer.innerHTML = `
      <svg id="blueprint-svg" viewBox="0 0 400 480" width="100%" height="100%"
           xmlns="http://www.w3.org/2000/svg" style="max-height: 100%; display: block;">
        <defs>
          <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0, 180, 240, 0.08)" stroke-width="0.75" />
          </pattern>
        </defs>

        <!-- Blueprint background grid -->
        <rect width="100%" height="100%" fill="url(#bp-grid)" />

        <!-- Ground Datum Line at bottom -->
        <g id="ground-datum">
          <line x1="20" y1="${groundDatumY}" x2="380" y2="${groundDatumY}"
                stroke="var(--accent)" stroke-width="1.5" opacity="0.8" />
          <!-- Datum hatch marks -->
          ${[40, 80, 120, 160, 200, 240, 280, 320, 360]
            .map((x) => `<line x1="${x}" y1="${groundDatumY}" x2="${x - 10}" y2="${groundDatumY + 8}" stroke="var(--accent)" stroke-width="1" opacity="0.4" />`)
            .join('')}
          <text x="24" y="${groundDatumY + 18}" fill="var(--accent)" font-family="var(--font-mono)"
                font-size="8" font-weight="700" letter-spacing="1px">
            Z +0.000 m  SURFACE INTERFACE / DATUM
          </text>
        </g>

        <!-- Height & Span Dimension Lines -->
        ${
          placements.length > 0
            ? `
          <!-- Height dimension line (left) -->
          <g id="height-dim" opacity="0.6">
            <line x1="36" y1="${minY}" x2="36" y2="${groundDatumY}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
            <line x1="30" y1="${minY}" x2="42" y2="${minY}" stroke="var(--border)" stroke-width="1" />
            <line x1="30" y1="${groundDatumY}" x2="42" y2="${groundDatumY}" stroke="var(--border)" stroke-width="1" />
            <text x="32" y="${(minY + groundDatumY) / 2}" fill="var(--text-muted)" font-family="var(--font-mono)"
                  font-size="8" text-anchor="end">↕ ${craftHeightM.toFixed(1)} m</text>
          </g>

          <!-- Span dimension line (top) -->
          <g id="span-dim" opacity="0.6">
            <line x1="${minX}" y1="${minY - 14}" x2="${maxX}" y2="${minY - 14}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
            <line x1="${minX}" y1="${minY - 20}" x2="${minX}" y2="${minY - 8}" stroke="var(--border)" stroke-width="1" />
            <line x1="${maxX}" y1="${minY - 20}" x2="${maxX}" y2="${minY - 8}" stroke="var(--border)" stroke-width="1" />
            <text x="${(minX + maxX) / 2}" y="${minY - 22}" fill="var(--text-muted)" font-family="var(--font-mono)"
                  font-size="8" text-anchor="middle">↔ ${craftSpanM.toFixed(1)} m</text>
          </g>
        `
            : ''
        }

        <!-- Center-of-Mass (CoM) Marker -->
        ${
          placements.length > 0
            ? `
          <g id="com-indicator" transform="translate(200, ${comY})" opacity="0.85">
            <!-- Quartered circle (Yellow & Dark) -->
            <circle cx="0" cy="0" r="7" fill="#1c1b1c" stroke="#ffba3b" stroke-width="1.2" />
            <path d="M 0 0 L 0 -7 A 7 7 0 0 1 7 0 Z" fill="#ffba3b" />
            <path d="M 0 0 L 0 7 A 7 7 0 0 1 -7 0 Z" fill="#ffba3b" />
            <!-- Text readout -->
            <text x="12" y="3" fill="#ffba3b" font-family="var(--font-mono)" font-size="8" font-weight="700">
              CoM: Z +${comZM} m
            </text>
          </g>
        `
            : ''
        }

        <!-- Placed Parts -->
        ${partsSvg}

        <!-- Leader Line Callouts -->
        ${leaderLinesSvg}

        <!-- Snap Node Targets -->
        ${snapNodesSvg}

        <!-- Empty State Prompt -->
        ${
          placements.length === 0
            ? `
          <g transform="translate(200, 220)" text-anchor="middle">
            <rect x="-60" y="-80" width="120" height="150" fill="none" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 4" />
            <text x="0" y="0" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="10" font-weight="600">
              [ + ] DRAG COMPONENTS HERE
            </text>
            <text x="0" y="18" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="8" opacity="0.7">
              OR CLICK "+ ADD" FROM LIBRARY
            </text>
          </g>
        `
            : ''
        }
      </svg>
    `;

    // ─────────────────────────────────────────────────────────────────────────
    // HARDWARE STRIP (Horizontal row below canvas)
    // ─────────────────────────────────────────────────────────────────────────
    hardwareStrip.innerHTML = '';

    // Overall integrity meter
    const overallIntegrity = design.parts.length
      ? design.parts.reduce((s, p) => s + p.condition / p.maxCondition, 0) / design.parts.length
      : 1;

    const integrityWidget = document.createElement('div');
    integrityWidget.style.cssText = 'display: flex; flex-direction: column; gap: 2px; min-width: 140px; margin-right: var(--sp-2);';
    integrityWidget.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: var(--font-mono);">
        <span class="ls-micro">Installed Hardware</span>
        <span style="font-weight: 700; color: ${statColor(overallIntegrity, 0.8, 0.5)};">
          ${(overallIntegrity * 100).toFixed(0)}%
        </span>
      </div>
      <div style="width: 100%; height: 5px; background: var(--bg-card); border: 1px solid var(--border); overflow: hidden;">
        <div style="width: ${(overallIntegrity * 100).toFixed(0)}%; height: 100%; background: ${
      overallIntegrity > 0.8 ? 'var(--ok)' : overallIntegrity > 0.5 ? 'var(--warn)' : 'var(--danger)'
    };"></div>
      </div>
    `;
    hardwareStrip.appendChild(integrityWidget);

    if (design.parts.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.style.cssText = 'color: var(--text-muted); font-size: var(--text-min); font-family: var(--font-mono);';
      emptyNote.textContent = 'No parts installed — select components from the library to begin assembly';
      hardwareStrip.appendChild(emptyNote);
    } else {
      for (const inst of design.parts) {
        const def = catalog.find((d) => d.id === inst.partId);
        if (!def) continue;

        const isSel = inst.instanceId === selectedPartInstanceId;
        const pct = (inst.condition / inst.maxCondition) * 100;

        const chip = document.createElement('div');
        chip.className = `hardware-chip ${isSel ? 'is-selected' : ''}`;
        chip.dataset['instId'] = inst.instanceId;
        chip.innerHTML = `
          <span>${def.name}</span>
          <div style="width: 32px; height: 3px; background: var(--bg-inset); border: 1px solid var(--border); overflow: hidden;">
            <div style="width: ${pct.toFixed(0)}%; height: 100%; background: ${
          pct > 80 ? 'var(--ok)' : pct > 50 ? 'var(--warn)' : 'var(--danger)'
        };"></div>
          </div>
          <button class="hw-remove-btn" data-remove="${inst.instanceId}" aria-label="Remove ${def.name}" title="Remove part">✕</button>
        `;
        hardwareStrip.appendChild(chip);
      }
    }

    // Unmounted banner (if any)
    if (unmounted.length > 0) {
      const unmountedWarn = document.createElement('div');
      unmountedWarn.className = 'ls-chip ls-chip-orange';
      unmountedWarn.style.cssText = 'font-size: 0.75rem; white-space: nowrap;';
      unmountedWarn.textContent = `Unmounted (${unmounted.length}): No mount slot available`;
      hardwareStrip.appendChild(unmountedWarn);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARTS LIBRARY RENDERING (Search, filters, cards with drag & Enter support)
  // ─────────────────────────────────────────────────────────────────────────
  function renderParts(search = ''): void {
    partsListEl.innerHTML = '';
    const filter = CATEGORIES.find((c) => c.key === activeFilter);
    const filtered = catalog.filter((p) => {
      const matchCat = !filter?.cats.length || filter.cats.includes(p.category);
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    for (const part of filtered) {
      const lockReason = getLockReason(part, body);
      const card = document.createElement('div');
      card.className = `part-lib-card ${lockReason ? 'is-locked' : ''}`;
      card.tabIndex = lockReason ? -1 : 0;
      card.draggable = !lockReason;
      card.dataset['partId'] = part.id;
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `${part.name}, ${formatM(part.baseCostM)}`);

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--sp-2); margin-bottom: 4px;">
          <div style="flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            ${renderPartThumbnail(part)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: var(--text-body); font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${part.name}
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-size: var(--text-min); color: var(--ok); font-weight: 700;">
            ${formatM(part.baseCostM)}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--text-min);">
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="ls-chip ls-chip-dim" style="font-size: 10px; padding: 1px 5px;">${part.category}</span>
            <span style="font-family: var(--font-mono); color: var(--text-muted);">
              ${(part.baseMassKg / 1000).toFixed(2)} t
            </span>
          </div>
          ${
            !lockReason
              ? `
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="ls-micro" style="font-size: 10px; opacity: 0.6;" title="Drag onto blueprint canvas">⠿ DRAG</span>
              <button class="ls-btn ls-btn-primary" style="padding: 2px 8px; font-size: 11px;" data-add="${part.id}" aria-label="Add ${part.name}">
                + ADD
              </button>
            </div>
          `
              : `<div style="font-size: 11px; color: var(--warn); line-height: 1.2;">🔒 ${lockReason}</div>`
          }
        </div>
      `;

      // Hover ghost preview of cost
      card.addEventListener('mouseenter', () => {
        if (!lockReason && budgetPanelInstance) {
          budgetPanelInstance.setPreviewCost(part.baseCostM);
        }
      });
      card.addEventListener('mouseleave', () => {
        if (!draggedPartDef && budgetPanelInstance) {
          budgetPanelInstance.setPreviewCost(null);
        }
      });

      // Keyboard Enter to auto-mount
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !lockReason) {
          handleAddPart(part.id);
        }
      });

      // HTML5 Drag handlers
      card.addEventListener('dragstart', (e) => {
        if (lockReason) return;
        draggedPartDef = part;
        e.dataTransfer?.setData('text/plain', part.id);
        renderBlueprint(); // Re-render to highlight active snap nodes
        if (budgetPanelInstance) {
          budgetPanelInstance.setPreviewCost(part.baseCostM);
        }
      });

      card.addEventListener('dragend', () => {
        draggedPartDef = null;
        renderBlueprint();
        if (budgetPanelInstance) {
          budgetPanelInstance.setPreviewCost(null);
        }
      });

      partsListEl.appendChild(card);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART ASSEMBLY ACTIONS (Add, Mount, Remove)
  // ─────────────────────────────────────────────────────────────────────────
  function handleAddPart(partId: string, slotKey?: string): void {
    const def = catalog.find((d) => d.id === partId);
    if (!def) return;

    const newInst: PartInstance = {
      instanceId: `${partId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      partId,
      paramValues: Object.fromEntries(def.params.map((p) => [p.key, p.default])),
      condition: 100,
      maxCondition: 100,
    };

    if (slotKey) {
      const mountMap = loadMountMap();
      mountMap[newInst.instanceId] = slotKey;
      saveMountMap(mountMap);
    }

    design.parts = [...design.parts, newInst];
    selectedPartInstanceId = newInst.instanceId;
    getStore().update({ design });

    // Refresh all panels
    renderHangar(root, getStore().getState());
  }

  function handleRemovePart(instanceId: string): void {
    design.parts = design.parts.filter((p) => p.instanceId !== instanceId);
    const mountMap = loadMountMap();
    delete mountMap[instanceId];
    saveMountMap(mountMap);

    if (selectedPartInstanceId === instanceId) {
      selectedPartInstanceId = design.parts[0]?.instanceId ?? null;
    }

    getStore().update({ design });
    renderHangar(root, getStore().getState());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT WIRING & INTERACTION
  // ─────────────────────────────────────────────────────────────────────────
  // Category filter clicks
  leftCol.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-cat]') as HTMLElement | null;
    if (btn) {
      activeFilter = btn.dataset['cat'] ?? 'all';
      leftCol.querySelectorAll('[data-cat]').forEach((b) => {
        const isSel = (b as HTMLElement).dataset['cat'] === activeFilter;
        b.className = `ls-chip ${isSel ? 'ls-chip-orange' : 'ls-chip-dim'}`;
        (b as HTMLElement).setAttribute('aria-selected', isSel ? 'true' : 'false');
      });
      renderParts((leftCol.querySelector('#hangar-search') as HTMLInputElement)?.value ?? '');
    }
  });

  // Search input
  leftCol.addEventListener('input', (e) => {
    const inp = e.target as HTMLInputElement;
    if (inp.id === 'hangar-search') {
      renderParts(inp.value);
    }
  });

  // Add button click in parts list
  partsListEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-add]') as HTMLElement | null;
    if (btn) {
      const partId = btn.dataset['add'];
      if (partId) handleAddPart(partId);
    }
  });

  // Drag over blueprint container
  blueprintContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  // Drop on blueprint
  blueprintContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const partId = e.dataTransfer?.getData('text/plain') ?? draggedPartDef?.id;
    if (!partId) return;

    // Check if dropped near a snap node
    const target = (e.target as HTMLElement).closest('[data-slot-key]') as HTMLElement | null;
    const slotKey = target?.dataset['slotKey'];
    handleAddPart(partId, slotKey);
  });

  // Selection & Removal in Blueprint & Hardware Strip
  mainCol.addEventListener('click', (e) => {
    // 1. Remove button
    const removeBtn = (e.target as HTMLElement).closest('[data-remove]') as HTMLElement | null;
    if (removeBtn) {
      const id = removeBtn.dataset['remove'];
      if (id) handleRemovePart(id);
      return;
    }

    // 2. Select part from blueprint
    const bpPart = (e.target as HTMLElement).closest('[data-inst-id]') as HTMLElement | null;
    if (bpPart) {
      const id = bpPart.dataset['instId'];
      if (id) {
        selectedPartInstanceId = id;
        renderBlueprint();
        renderRightColumn();
      }
      return;
    }

    // 3. Click snap node
    const snapNode = (e.target as HTMLElement).closest('[data-slot-key]') as HTMLElement | null;
    if (snapNode && draggedPartDef) {
      const slotKey = snapNode.dataset['slotKey'];
      handleAddPart(draggedPartDef.id, slotKey);
    }
  });

  // Keyboard Delete / Backspace to remove selected part
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPartInstanceId) {
      // Ensure focus is not inside an input
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        handleRemovePart(selectedPartInstanceId);
      }
    }
  });

  // Tuning sliders in right column
  rightCol.addEventListener('input', (e) => {
    const slider = e.target as HTMLInputElement;
    if (slider.type !== 'range') return;
    const instId = slider.dataset['inst'];
    const paramKey = slider.dataset['param'];
    if (!instId || !paramKey) return;

    const inst = design.parts.find((p) => p.instanceId === instId);
    if (!inst) return;

    inst.paramValues = { ...inst.paramValues, [paramKey]: Number(slider.value) };
    getStore().update({ design });
    renderRightColumn();
  });

  // Initial renders
  renderParts();
  renderBlueprint();
  renderRightColumn();
}
