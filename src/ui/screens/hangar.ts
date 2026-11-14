/**
 * Screen 01: Hangar → Spacecraft Assembly Phase
 * Round 3 Architecture:
 * - Left: Parts Library (search + categories + slot-limited draggable component cards)
 * - Center: Hero 2D Blueprint Schematic (auto-fit, zoom/pan, datum line, CoM, leader callouts, slot highlights, ghost preview)
 *          + Single-Row Installed Hardware Rail (max-height 72px) with Expand Overlay Drawer
 * - Right: High-Visibility Budget Panel + Part Tuning Matrix + Live Telemetry + Advisories (smooth wheel scrolling)
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
  getAvailableSlotsForPart,
} from '@/ui/assembly/mount-points';
import { renderPartSvg, renderPartGhost, renderPartThumbnail } from '@/ui/assembly/part-renderers';

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
  let hoveredPartDef: PartDef | null = null;
  let draggedPartDef: PartDef | null = null;
  let showGuide = true;

  // Zoom & Pan state
  let currentZoom = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let isDrawerOpen = false;

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
  // COLUMN 1: LEFT — Parts Library (search, filters, slot-limited cards)
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
  partsListEl.style.cssText = 'flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: var(--sp-2) var(--sp-3);';
  leftCol.appendChild(partsListEl);

  bodyEl.appendChild(leftCol);

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN 2: CENTER — Hero 2D Blueprint Schematic & Single-Row Hardware Rail
  // ─────────────────────────────────────────────────────────────────────────
  const mainCol = document.createElement('div');
  mainCol.className = 'ls-col-main';
  mainCol.style.cssText = 'padding: 0; display: flex; flex-direction: column; overflow: hidden; position: relative;';

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
      <button class="ls-seg-btn" disabled title="Isometric 3D axonometric view — coming soon">ISO</button>
      <button class="ls-seg-btn" disabled title="Structural wireframe & X-ray view — coming soon">WIRE</button>
    </div>
    <div style="display:flex; align-items:center; gap:var(--sp-2);">
      <span class="ls-micro" style="color:var(--text-muted);">DATUM: SURFACE INTERFACE</span>
      <span class="ls-chip ls-chip-dim" style="font-size:11px;">SCALE 1:40</span>
    </div>
  `;
  mainCol.appendChild(bpBar);

  // 3. Hero Blueprint Graphic Container (Fills all remaining height)
  const blueprintContainer = document.createElement('div');
  blueprintContainer.style.cssText = `
    flex: 1;
    min-height: 0;
    position: relative;
    background: #090e14;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    cursor: default;
  `;
  mainCol.appendChild(blueprintContainer);

  // Overlay Drawer for full hardware list (does not push canvas)
  const hardwareDrawer = document.createElement('div');
  hardwareDrawer.className = 'hardware-drawer-overlay';
  hardwareDrawer.style.display = 'none';
  mainCol.appendChild(hardwareDrawer);

  // 4. Compact Single-Row Installed Hardware Rail (Max height 72px)
  const hardwareStrip = document.createElement('div');
  hardwareStrip.className = 'installed-hardware-strip';
  hardwareStrip.style.cssText = 'height: 52px; max-height: 72px; flex-shrink: 0; display: flex; align-items: center; overflow-x: auto; overflow-y: hidden;';
  mainCol.appendChild(hardwareStrip);

  bodyEl.appendChild(mainCol);

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN 3: RIGHT — Budget Panel + Part Tuning + Telemetry + Advisories
  // ─────────────────────────────────────────────────────────────────────────
  const rightCol = document.createElement('div');
  rightCol.className = 'ls-col-right';
  rightCol.style.cssText = 'padding: 0; overflow-y: auto; height: 100%; min-height: 0; overscroll-behavior: contain; padding-bottom: 90px;';
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
        toggleHardwareDrawer(true);
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
  // HERO BLUEPRINT SCHEMATIC DRAWING (Auto-fit, zoom/pan, datum line, CoM, 12px leaders)
  // ─────────────────────────────────────────────────────────────────────────
  function renderBlueprint(): void {
    const layout = resolveAssemblyLayout(design.parts, catalog, 200, 200);
    const { placements, unmounted, availableSlots } = layout;

    // Active component for hover/drag highlighting
    const activeHighlight = hoveredPartDef ?? draggedPartDef;
    const compatibleSlots = activeHighlight
      ? availableSlots.filter((slot) => slot.allowedCategories.includes(activeHighlight.category))
      : [];
    const bestTargetSlot = compatibleSlots[0] ?? null;

    // Dimensions calculation & Auto-Fit Bounding Box
    let minY = 130;
    let maxY = 250;
    let minX = 140;
    let maxX = 260;

    if (placements.length > 0) {
      minY = Math.min(...placements.map((p) => p.canvasY - 45));
      maxY = Math.max(...placements.map((p) => p.canvasY + 50));
      minX = Math.min(...placements.map((p) => p.canvasX - 55));
      maxX = Math.max(...placements.map((p) => p.canvasX + 55));
    }

    const legPlacement = placements.find((p) => p.category === 'leg');
    const groundDatumY = legPlacement ? legPlacement.canvasY + 38 : maxY + 15;
    const craftHeightM = Math.max(1.8, (groundDatumY - minY) / 30);
    const craftSpanM = Math.max(1.4, (maxX - minX) / 30);
    const comY = placements.length > 0 ? (minY + maxY) / 2 : groundDatumY - 80;
    const comZM = ((groundDatumY - comY) / 30).toFixed(2);

    // Auto-fit calculation: ship fills at least 60% (target 65%) of canvas height
    const shipHeight = groundDatumY - minY;
    const targetVbHeight = Math.max(340, shipHeight / 0.65);
    const targetVbWidth = Math.max(400, (maxX - minX + 220));
    const centerX = (minX + maxX) / 2;

    const baseVbX = centerX - targetVbWidth / 2;
    const baseVbY = minY - (targetVbHeight - shipHeight) * 0.35;

    // Apply zoom and pan offsets
    const effVbW = targetVbWidth / currentZoom;
    const effVbH = targetVbHeight / currentZoom;
    const effVbX = baseVbX + (targetVbWidth - effVbW) / 2 + panX;
    const effVbY = baseVbY + (targetVbHeight - effVbH) / 2 + panY;

    let partsSvg = '';
    let leaderLinesSvg = '';

    // Collision-avoidance tracking for 12px mono leader callouts
    const usedYLeft: number[] = [];
    const usedYRight: number[] = [];
    const MIN_LABEL_GAP = 26; // Guarantee no label overlaps

    // Render placed parts & leader lines
    for (let i = 0; i < placements.length; i++) {
      const placement = placements[i]!;
      const inst = design.parts.find((p) => p.instanceId === placement.instanceId);
      const def = catalog.find((d) => d.id === placement.partId);
      if (!inst || !def) continue;

      const isSel = placement.instanceId === selectedPartInstanceId;
      const isTank = def.category === 'tank';
      const tankAttrs = isTank
        ? `data-preview-tank data-tank-volume="${Number(inst.paramValues['volume'] ?? 1).toFixed(2)}"`
        : '';

      partsSvg += `
        <g class="blueprint-part-group ${isSel ? 'is-selected' : ''}"
           transform="translate(${placement.canvasX}, ${placement.canvasY})"
           data-instance-id="${placement.instanceId}" data-preview-part ${tankAttrs} tabindex="0" role="button"
           aria-label="${def.name}">
          ${renderPartSvg(inst, def, isSel)}
        </g>
      `;

      // Leader callout line matching Figma frame 21:704 with collision avoidance
      const preferRight = placement.canvasX >= centerX;
      const leaderSide = preferRight ? 1 : -1;
      const usedList = leaderSide > 0 ? usedYRight : usedYLeft;

      let targetY = placement.canvasY;
      while (usedList.some((y) => Math.abs(y - targetY) < MIN_LABEL_GAP)) {
        targetY += 16;
      }
      usedList.push(targetY);

      const lx1 = placement.canvasX + leaderSide * 36;
      const ly1 = placement.canvasY;
      const lx2 = leaderSide > 0 ? Math.max(maxX + 20, lx1 + 25) : Math.min(minX - 20, lx1 - 25);
      const lx3 = leaderSide > 0 ? lx2 + 45 : lx2 - 45;

      leaderLinesSvg += `
        <g class="leader-callout" opacity="0.85" pointer-events="none">
          <polyline points="${lx1},${ly1} ${lx2},${targetY} ${lx3},${targetY}"
                    fill="none" stroke="var(--border)" stroke-width="1.2" />
          <circle cx="${lx1}" cy="${ly1}" r="2.5" fill="var(--accent)" />
          <text x="${leaderSide > 0 ? lx2 + 4 : lx3 + 4}" y="${targetY - 4}"
                fill="var(--text)" font-family="var(--font-mono)" font-size="12" font-weight="600" letter-spacing="0.5px">
            ${def.name.toUpperCase()}
          </text>
        </g>
      `;
    }

    // Snap nodes & highlights rendering
    let snapNodesSvg = '';
    for (const slot of availableSlots) {
      const isCompat = activeHighlight ? slot.allowedCategories.includes(activeHighlight.category) : false;
      const isBest = isCompat && bestTargetSlot?.parentInstanceId === slot.parentInstanceId && bestTargetSlot?.mountPointId === slot.mountPointId;

      if (activeHighlight) {
        if (isCompat) {
          snapNodesSvg += `
            <g class="blueprint-snap-node ${isBest ? 'is-best-slot' : ''}" data-slot-key="${slot.parentInstanceId}:${slot.mountPointId}"
               transform="translate(${slot.canvasX}, ${slot.canvasY})" style="cursor: pointer;">
              <circle cx="0" cy="0" r="16" fill="${isBest ? 'rgba(255,90,31,0.22)' : 'rgba(0,180,240,0.12)'}"
                      stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3 3"
                      class="snap-node-pulse" />
              <text cx="0" cy="4" text-anchor="middle" font-size="12" font-weight="700"
                    fill="var(--accent)" font-family="var(--font-mono)">+</text>
              <text x="0" y="-22" text-anchor="middle" font-size="12" font-weight="700"
                    fill="var(--accent)" font-family="var(--font-mono)" letter-spacing="0.5px">
                ${slot.name.toUpperCase()}
              </text>
            </g>
          `;
        } else {
          // Dimmed incompatible slot
          snapNodesSvg += `
            <g opacity="0.25" transform="translate(${slot.canvasX}, ${slot.canvasY})" pointer-events="none">
              <circle cx="0" cy="0" r="8" fill="var(--bg-inset)" stroke="var(--border)" stroke-width="1" />
            </g>
          `;
        }
      }
    }

    // Ghost preview in best target slot
    let ghostPreviewSvg = '';
    if (activeHighlight && bestTargetSlot) {
      ghostPreviewSvg = `
        <g class="ghost-slot-preview" transform="translate(${bestTargetSlot.canvasX}, ${bestTargetSlot.canvasY})" pointer-events="none">
          ${renderPartGhost(activeHighlight)}
          <text x="0" y="42" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="12" font-weight="700">
            [ATTACH HERE]
          </text>
        </g>
      `;
    }

    // Empty assembly dashed guide silhouette with labeled zones
    let guideSilhouetteSvg = '';
    if (showGuide && placements.length === 0) {
      const isEng = activeHighlight?.category === 'engine';
      const isLeg = activeHighlight?.category === 'leg';
      const isTank = activeHighlight?.category === 'tank';
      const isComms = activeHighlight?.category === 'comms';
      const isPower = activeHighlight?.category === 'power';

      guideSilhouetteSvg = `
        <g id="empty-assembly-guide" transform="translate(200, 180)" opacity="0.75">
          <!-- Apex Comms Zone -->
          <path d="M -18 -80 A 20 12 0 0 1 18 -80" fill="none" stroke="${isComms ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}" stroke-dasharray="3 3" stroke-width="1.5" />
          <text x="0" y="-90" text-anchor="middle" fill="${isComms ? 'var(--accent)' : 'var(--text-muted)'}" font-family="var(--font-mono)" font-size="12">
            Payload / Comms [TOP]
          </text>

          <!-- Core Bus / Tank Zone -->
          <rect x="-35" y="-55" width="70" height="90" rx="6" fill="${isTank ? 'rgba(255,90,31,0.06)' : 'none'}"
                stroke="${isTank ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}" stroke-dasharray="4 4" stroke-width="1.5" />
          <text x="0" y="-10" text-anchor="middle" fill="${isTank ? 'var(--accent)' : 'var(--text-muted)'}" font-family="var(--font-mono)" font-size="12" font-weight="600">
            Bus & Tank Core [STACK]
          </text>

          <!-- Power Wings (Upper sides) -->
          <rect x="-85" y="-45" width="40" height="24" fill="none" stroke="${isPower ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}" stroke-dasharray="3 3" />
          <rect x="45" y="-45" width="40" height="24" fill="none" stroke="${isPower ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}" stroke-dasharray="3 3" />
          <text x="-65" y="-50" text-anchor="middle" fill="${isPower ? 'var(--accent)' : 'var(--text-muted)'}" font-family="var(--font-mono)" font-size="10">Power [UPPER]</text>

          <!-- Engine Base (Bottom) -->
          <path d="M -16 35 L -24 75 L 24 75 L 16 35 Z" fill="none" stroke="${isEng ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}" stroke-dasharray="3 3" stroke-width="1.5" />
          <text x="0" y="88" text-anchor="middle" fill="${isEng ? 'var(--accent)' : 'var(--text-muted)'}" font-family="var(--font-mono)" font-size="12">
            Engine Mount [BASE]
          </text>

          <!-- Legs Outriggers (Lower sides) -->
          <line x1="-35" y1="20" x2="-68" y2="75" stroke="${isLeg ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}" stroke-dasharray="3 3" stroke-width="2" />
          <line x1="35" y1="20" x2="68" y2="75" stroke="${isLeg ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}" stroke-dasharray="3 3" stroke-width="2" />
          <text x="-70" y="90" fill="${isLeg ? 'var(--accent)' : 'var(--text-muted)'}" font-family="var(--font-mono)" font-size="10">Legs [LOWER]</text>

          <!-- Center Prompt -->
          <text x="0" y="15" text-anchor="middle" fill="var(--accent)" font-family="var(--font-mono)" font-size="12" font-weight="700">
            [ + ] SELECT OR DRAG A COMMAND MODULE OR TANK
          </text>
        </g>
      `;
    }

    blueprintContainer.innerHTML = `
      <!-- Blueprint Toolbar (Fit, +, −, Zoom readout, Show Guide) -->
      <div class="blueprint-toolbar">
        <button id="btn-zoom-fit" title="Reset view and auto-fit spacecraft">FIT</button>
        <button id="btn-zoom-in" title="Zoom in">+</button>
        <button id="btn-zoom-out" title="Zoom out">−</button>
        <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); min-width:38px; text-align:center;">
          ${Math.round(currentZoom * 100)}%
        </span>
        <button id="btn-toggle-guide" class="${showGuide ? 'is-active' : ''}" title="Toggle assembly layout guide outline">
          GUIDE
        </button>
      </div>

      <!-- Corner Unmounted Warning Badge (if any) -->
      ${
        unmounted.length > 0
          ? `
        <div class="corner-unmounted-badge">
          <span class="ls-chip ls-chip-orange" style="font-size:11px; cursor:help;"
                title="Unmounted components (${unmounted.length}): No compatible mounting slot available on current spacecraft structure.">
            ⚠ ${unmounted.length} UNMOUNTED
          </span>
        </div>
      `
          : ''
      }

      <!-- Main SVG Blueprint Schematic -->
      <svg id="blueprint-svg" data-craft-preview
           viewBox="${effVbX} ${effVbY} ${effVbW} ${effVbH}"
           width="100%" height="100%"
           xmlns="http://www.w3.org/2000/svg" style="display: block; width: 100%; height: 100%;">
        <defs>
          <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0, 180, 240, 0.08)" stroke-width="0.75" />
          </pattern>
        </defs>

        <!-- Blueprint background grid -->
        <rect x="${effVbX}" y="${effVbY}" width="${effVbW}" height="${effVbH}" fill="url(#bp-grid)" />

        <!-- Ground Datum Line at bottom -->
        <g id="ground-datum">
          <line x1="${effVbX}" y1="${groundDatumY}" x2="${effVbX + effVbW}" y2="${groundDatumY}"
                stroke="var(--accent)" stroke-width="1.5" opacity="0.8" />
          <!-- Datum hatch marks -->
          ${[-100, -50, 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]
            .map((x) => `<line x1="${x}" y1="${groundDatumY}" x2="${x - 10}" y2="${groundDatumY + 8}" stroke="var(--accent)" stroke-width="1" opacity="0.4" />`)
            .join('')}
          <text x="${Math.max(effVbX + 20, 24)}" y="${groundDatumY + 18}" fill="var(--accent)" font-family="var(--font-mono)"
                font-size="9" font-weight="700" letter-spacing="1px">
            Z +0.000 m  SURFACE INTERFACE / DATUM
          </text>
        </g>

        <!-- Height & Span Dimension Lines -->
        ${
          placements.length > 0
            ? `
          <!-- Height dimension line (left) -->
          <g id="height-dim" opacity="0.75">
            <line x1="${minX - 25}" y1="${minY}" x2="${minX - 25}" y2="${groundDatumY}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
            <line x1="${minX - 32}" y1="${minY}" x2="${minX - 18}" y2="${minY}" stroke="var(--border)" stroke-width="1" />
            <line x1="${minX - 32}" y1="${groundDatumY}" x2="${minX - 18}" y2="${groundDatumY}" stroke="var(--border)" stroke-width="1" />
            <text x="${minX - 34}" y="${(minY + groundDatumY) / 2}" fill="var(--text-muted)" font-family="var(--font-mono)"
                  font-size="12" font-weight="600" text-anchor="end">↕ ${craftHeightM.toFixed(1)} m</text>
          </g>

          <!-- Span dimension line (top) -->
          <g id="span-dim" opacity="0.75">
            <line x1="${minX}" y1="${minY - 14}" x2="${maxX}" y2="${minY - 14}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
            <line x1="${minX}" y1="${minY - 20}" x2="${minX}" y2="${minY - 8}" stroke="var(--border)" stroke-width="1" />
            <line x1="${maxX}" y1="${minY - 20}" x2="${maxX}" y2="${minY - 8}" stroke="var(--border)" stroke-width="1" />
            <text x="${centerX}" y="${minY - 22}" fill="var(--text-muted)" font-family="var(--font-mono)"
                  font-size="12" font-weight="600" text-anchor="middle">↔ ${craftSpanM.toFixed(1)} m</text>
          </g>
        `
            : ''
        }

        <!-- Center-of-Mass (CoM) Marker (Yellow & Dark Disk with Crosshair) -->
        ${
          placements.length > 0
            ? `
          <g id="com-indicator" transform="translate(${centerX}, ${comY})" opacity="0.9">
            <circle cx="0" cy="0" r="8" fill="#1c1b1c" stroke="#ffba3b" stroke-width="1.2" />
            <path d="M 0 0 L 0 -8 A 8 8 0 0 1 8 0 Z" fill="#ffba3b" />
            <path d="M 0 0 L 0 8 A 8 8 0 0 1 -8 0 Z" fill="#ffba3b" />
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#ffba3b" stroke-width="0.8" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#ffba3b" stroke-width="0.8" />
            <text x="14" y="4" fill="#ffba3b" font-family="var(--font-mono)" font-size="10" font-weight="700">
              CoM: Z +${comZM} m
            </text>
          </g>
        `
            : ''
        }

        <!-- Empty Assembly Silhouette Guide -->
        ${guideSilhouetteSvg}

        <!-- Placed Spacecraft Parts -->
        ${partsSvg}

        <!-- Leader Line Callouts (12px Mono with Collision Avoidance) -->
        ${leaderLinesSvg}

        <!-- Snap Node Targets -->
        ${snapNodesSvg}

        <!-- Ghost Preview of Hovered / Dragged Part -->
        ${ghostPreviewSvg}
      </svg>
    `;

    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE-ROW INSTALLED HARDWARE RAIL (Max-height 72px)
    // ─────────────────────────────────────────────────────────────────────────
    hardwareStrip.innerHTML = '';

    const overallIntegrity = design.parts.length
      ? design.parts.reduce((s, p) => s + p.condition / p.maxCondition, 0) / design.parts.length
      : 1;

    // Header segment: INSTALLED (N) + Integrity pill + Drawer button
    const railHeader = document.createElement('div');
    railHeader.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0; padding-right: 8px; border-right: 1px solid var(--border);';
    railHeader.innerHTML = `
      <span class="ls-micro">Installed Hardware (${design.parts.length})</span>
      <span class="ls-chip ${overallIntegrity > 0.8 ? 'ls-chip-green' : overallIntegrity > 0.5 ? 'ls-chip-amber' : 'ls-chip-orange'}" style="font-size: 11px;">
        ${(overallIntegrity * 100).toFixed(0)}%
      </span>
      <button class="ls-btn ls-btn-ghost" id="btn-toggle-drawer" style="padding: 2px 6px; font-size: 11px;" title="Open expanded hardware drawer">
        ⤢ DRAWER
      </button>
    `;
    hardwareStrip.appendChild(railHeader);

    // Scrollable track of horizontal chips
    const chipsTrack = document.createElement('div');
    chipsTrack.style.cssText = 'display: flex; align-items: center; gap: 6px; flex: 1; overflow-x: auto; overflow-y: hidden;';

    if (design.parts.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.style.cssText = 'color: var(--text-muted); font-size: var(--text-min); font-family: var(--font-mono); padding-left: 8px;';
      emptyNote.textContent = 'No parts installed — select components from the library to assemble';
      chipsTrack.appendChild(emptyNote);
    } else {
      for (const inst of design.parts) {
        const def = catalog.find((d) => d.id === inst.partId);
        if (!def) continue;

        const isSel = inst.instanceId === selectedPartInstanceId;
        const pct = (inst.condition / inst.maxCondition) * 100;

        const chip = document.createElement('div');
        chip.className = `hardware-chip ${isSel ? 'is-selected' : ''}`;
        chip.dataset['instId'] = inst.instanceId;
        chip.title = `${def.name} · ${(def.baseMassKg / 1000).toFixed(2)}t · ${formatM(def.baseCostM)}`;

        chip.innerHTML = `
          <span>${def.name}</span>
          <div style="width: 28px; height: 3px; background: var(--bg-inset); border: 1px solid var(--border); overflow: hidden;">
            <div style="width: ${pct.toFixed(0)}%; height: 100%; background: ${
          pct > 80 ? 'var(--ok)' : pct > 50 ? 'var(--warn)' : 'var(--danger)'
        };"></div>
          </div>
          <span style="font-size: 11px; opacity: 0.8;">${pct.toFixed(0)}%</span>
          <button class="hw-remove-btn" data-remove="${inst.instanceId}" aria-label="Remove ${def.name}" title="Remove part">✕</button>
        `;

        chip.addEventListener('mouseenter', () => {
          const bpEl = blueprintContainer.querySelector(`[data-instance-id="${inst.instanceId}"]`);
          bpEl?.classList.add('is-selected');
        });
        chip.addEventListener('mouseleave', () => {
          if (inst.instanceId !== selectedPartInstanceId) {
            const bpEl = blueprintContainer.querySelector(`[data-instance-id="${inst.instanceId}"]`);
            bpEl?.classList.remove('is-selected');
          }
        });

        chipsTrack.appendChild(chip);
      }
    }
    hardwareStrip.appendChild(chipsTrack);

    // Mouse-wheel horizontal scroll on hardware strip
    hardwareStrip.addEventListener(
      'wheel',
      (e) => {
        if (e.deltaY !== 0) {
          hardwareStrip.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OVERLAY DRAWER FOR EXPANDED HARDWARE LIST (Does not push canvas)
  // ─────────────────────────────────────────────────────────────────────────
  function toggleHardwareDrawer(open?: boolean): void {
    isDrawerOpen = typeof open === 'boolean' ? open : !isDrawerOpen;
    hardwareDrawer.style.display = isDrawerOpen ? 'flex' : 'none';

    if (isDrawerOpen) {
      hardwareDrawer.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card);">
          <span class="ls-panel-title">Installed Hardware (${design.parts.length})</span>
          <button class="ls-btn ls-btn-ghost" id="btn-close-drawer" style="padding: 2px 6px; font-size: 12px;">✕</button>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          ${design.parts
            .map((inst) => {
              const def = catalog.find((d) => d.id === inst.partId);
              if (!def) return '';
              const pct = (inst.condition / inst.maxCondition) * 100;
              return `
              <div style="padding: 8px 10px; background: var(--bg-panel); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 600; font-size: 13px; color: var(--text);">${def.name}</span>
                  <button class="ls-btn ls-btn-ghost" data-remove="${inst.instanceId}" style="padding: 2px 6px; color: var(--danger); font-size: 12px;">Remove ✕</button>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">
                  <span>${def.category.toUpperCase()}</span>
                  <span>${(def.baseMassKg / 1000).toFixed(2)}t · ${formatM(def.baseCostM)}</span>
                </div>
                <div style="width: 100%; height: 4px; background: var(--bg-inset); border: 1px solid var(--border); overflow: hidden;">
                  <div style="width: ${pct.toFixed(0)}%; height: 100%; background: ${pct > 80 ? 'var(--ok)' : pct > 50 ? 'var(--warn)' : 'var(--danger)'};"></div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;

      hardwareDrawer.querySelector('#btn-close-drawer')?.addEventListener('click', () => {
        toggleHardwareDrawer(false);
      });
    }
  }

  // Close drawer on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen) {
      toggleHardwareDrawer(false);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PARTS LIBRARY RENDERING (Slot capacity enforcement & hover highlight)
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
      // Check available mounting slots on the spacecraft for this part
      const availableSlots = getAvailableSlotsForPart(part, design.parts, catalog);
      const isMaxSlots = !lockReason && availableSlots.length === 0;

      const card = document.createElement('div');
      card.className = `part-lib-card ${lockReason ? 'is-locked' : ''} ${isMaxSlots ? 'is-max-slots' : ''}`;
      card.tabIndex = lockReason || isMaxSlots ? -1 : 0;
      card.draggable = !lockReason && !isMaxSlots;
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
            lockReason
              ? `<div style="font-size: 11px; color: var(--warn); line-height: 1.2;">🔒 ${lockReason}</div>`
              : isMaxSlots
              ? `<span class="ls-chip ls-chip-dim" style="font-size: 10px; color: var(--warn); border-color: var(--border);" title="All compatible mounting slots are occupied on the craft. Remove an existing component to attach more.">NO SLOTS FREE</span>`
              : `
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="ls-micro" style="font-size: 10px; opacity: 0.6;" title="Drag onto blueprint canvas">⠿ DRAG</span>
              <button class="ls-btn ls-btn-primary" style="padding: 2px 8px; font-size: 11px;" data-add="${part.id}" aria-label="Add ${part.name}">
                + ADD
              </button>
            </div>
          `
          }
        </div>
      `;

      // Hover / focus ghost preview & slot highlight
      const onCardEnter = () => {
        if (!lockReason && !isMaxSlots) {
          hoveredPartDef = part;
          renderBlueprint();
          if (budgetPanelInstance) {
            budgetPanelInstance.setPreviewCost(part.baseCostM);
          }
        }
      };

      const onCardLeave = () => {
        if (!draggedPartDef) {
          hoveredPartDef = null;
          renderBlueprint();
          if (budgetPanelInstance) {
            budgetPanelInstance.setPreviewCost(null);
          }
        }
      };

      card.addEventListener('mouseenter', onCardEnter);
      card.addEventListener('mouseleave', onCardLeave);
      card.addEventListener('focusin', onCardEnter);
      card.addEventListener('focusout', onCardLeave);

      // Keyboard Enter to auto-mount
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !lockReason && !isMaxSlots) {
          handleAddPart(part.id);
        }
      });

      // HTML5 Drag handlers
      card.addEventListener('dragstart', (e) => {
        if (lockReason || isMaxSlots) return;
        draggedPartDef = part;
        e.dataTransfer?.setData('text/plain', part.id);
        renderBlueprint();
        if (budgetPanelInstance) {
          budgetPanelInstance.setPreviewCost(part.baseCostM);
        }
      });

      card.addEventListener('dragend', () => {
        draggedPartDef = null;
        hoveredPartDef = null;
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

    // Check capacity limit
    const freeSlots = getAvailableSlotsForPart(def, design.parts, catalog);
    if (freeSlots.length === 0) return; // Prevent adding beyond limit

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

  // Blueprint Toolbar Clicks (Fit, +, −, Guide)
  blueprintContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === 'btn-zoom-fit') {
      currentZoom = 1.0;
      panX = 0;
      panY = 0;
      renderBlueprint();
      return;
    }
    if (target.id === 'btn-zoom-in') {
      currentZoom = Math.min(3.0, currentZoom * 1.25);
      renderBlueprint();
      return;
    }
    if (target.id === 'btn-zoom-out') {
      currentZoom = Math.max(0.4, currentZoom / 1.25);
      renderBlueprint();
      return;
    }
    if (target.id === 'btn-toggle-guide') {
      showGuide = !showGuide;
      renderBlueprint();
      return;
    }
  });

  // Mouse wheel zoom on blueprint container
  blueprintContainer.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        currentZoom = Math.min(3.0, currentZoom * 1.15);
      } else {
        currentZoom = Math.max(0.4, currentZoom / 1.15);
      }
      renderBlueprint();
    },
    { passive: false }
  );

  // Drag-to-pan on blueprint background
  blueprintContainer.addEventListener('pointerdown', (e) => {
    // Only pan if clicking on svg background (not a part or button)
    const onPartOrButton = (e.target as HTMLElement).closest('.blueprint-part-group, button, .blueprint-toolbar, [data-slot-key]');
    if (!onPartOrButton) {
      isPanning = true;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      blueprintContainer.style.cursor = 'grabbing';
      blueprintContainer.setPointerCapture?.(e.pointerId);
    }
  });

  blueprintContainer.addEventListener('pointermove', (e) => {
    if (isPanning) {
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
      renderBlueprint();
    }
  });

  const stopPan = () => {
    if (isPanning) {
      isPanning = false;
      blueprintContainer.style.cursor = 'default';
    }
  };
  blueprintContainer.addEventListener('pointerup', stopPan);
  blueprintContainer.addEventListener('pointercancel', stopPan);

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
    // Toggle drawer button
    if ((e.target as HTMLElement).closest('#btn-toggle-drawer')) {
      toggleHardwareDrawer();
      return;
    }

    // 1. Remove button
    const removeBtn = (e.target as HTMLElement).closest('[data-remove]') as HTMLElement | null;
    if (removeBtn) {
      const id = removeBtn.dataset['remove'];
      if (id) handleRemovePart(id);
      return;
    }

    // 2. Select part from blueprint or hardware strip
    const bpPart = (e.target as HTMLElement).closest('[data-inst-id], [data-instance-id]') as HTMLElement | null;
    if (bpPart) {
      const id = bpPart.dataset['instId'] ?? bpPart.dataset['instanceId'];
      if (id) {
        selectedPartInstanceId = id;
        renderBlueprint();
        renderRightColumn();
      }
      return;
    }

    // 3. Click snap node
    const snapNode = (e.target as HTMLElement).closest('[data-slot-key]') as HTMLElement | null;
    if (snapNode && (draggedPartDef || hoveredPartDef)) {
      const targetDef = draggedPartDef ?? hoveredPartDef;
      if (targetDef) {
        const slotKey = snapNode.dataset['slotKey'];
        handleAddPart(targetDef.id, slotKey);
      }
    }
  });

  // Keyboard Delete / Backspace to remove selected part
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPartInstanceId) {
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
    renderBlueprint();
    renderRightColumn();
  });

  // Auto-resize observer on blueprint container
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      // Re-fit view smoothly
      renderBlueprint();
    });
    ro.observe(blueprintContainer);
  }

  // Initial renders
  renderParts();
  renderBlueprint();
  renderRightColumn();
}
