/**
 * Screen 01: Hangar → hangar phase
 * Figma frame 21:704. Three-column: component nav | blueprint canvas | tuning + telemetry.
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
import type { PartCategory, PartInstance } from '@/types';

const CATEGORIES: { key: string; label: string; cats: PartCategory[] }[] = [
  { key: 'all',       label: 'All',       cats: [] },
  { key: 'engine',    label: 'Engines',   cats: ['engine'] },
  { key: 'tank',      label: 'Tanks',     cats: ['tank'] },
  { key: 'struct',    label: 'Structure', cats: ['hull','leg','heatshield','parachute'] },
  { key: 'power',     label: 'Power',     cats: ['power'] },
  { key: 'comms',     label: 'Comms/Science', cats: ['comms','instrument','computer','rcs'] },
];

const NAV_ITEMS = [
  'Structure & Chassis',
  'Propulsion Matrix',
  'Guidance & RCS',
  'Payload & Cargo',
  'Staging Sequence',
];

function hashDesign(design: import('@/types').ShipDesign): string {
  const str = JSON.stringify(design.parts.map(p => `${p.partId}:${JSON.stringify(p.paramValues)}`));
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).substring(0, 6).toUpperCase();
}

function escapeSvg(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character);
}

function renderCraftPreview(
  design: import('@/types').ShipDesign,
  catalog: ReturnType<typeof getParts>
): string {
  const parts = design.parts
    .map((instance) => ({ instance, definition: catalog.find((part) => part.id === instance.partId) }))
    .filter((entry): entry is { instance: PartInstance; definition: (typeof catalog)[number] } => Boolean(entry.definition));
  const countFor = (category: PartCategory): number =>
    parts
      .filter(({ definition }) => definition.category === category)
      .reduce((sum, { instance }) => sum + (instance.paramValues['count'] ?? 1), 0);
  const tankVolume = parts
    .filter(({ definition }) => definition.category === 'tank')
    .reduce((sum, { instance }) => sum + (instance.paramValues['volume'] ?? 1), 0);
  const tankHeight = Math.max(14, Math.min(72, 22 * tankVolume));
  const engineCount = Math.max(0, Math.min(5, Math.round(countFor('engine'))));
  const legCount = Math.max(0, Math.min(6, Math.round(countFor('leg'))));
  const previewHeight = Math.max(240, 52 + parts.length * 17);
  const rows = parts.map(({ instance, definition }, index) => {
    const label = escapeSvg(definition.name.length > 19 ? `${definition.name.slice(0, 17)}…` : definition.name);
    const tunedValues = Object.entries(instance.paramValues)
      .filter(([, value]) => value !== 1)
      .map(([key, value]) => `${key.toUpperCase()} ${value}`)
      .join(' · ');
    const category = escapeSvg(
      `${definition.category.toUpperCase()}${tunedValues ? ` · ${tunedValues}` : ''}`
    );
    return `<g data-preview-part="true" data-part-id="${escapeSvg(definition.id)}" data-instance-id="${escapeSvg(instance.instanceId)}">
      <rect x="190" y="${36 + index * 17}" width="122" height="15" rx="2" fill="#0b1729" stroke="#1e3a5f"/>
      <circle cx="198" cy="${43 + index * 17}" r="2.5" fill="#38bdf8"/>
      <text x="205" y="${42 + index * 17}" fill="#d9e7ff" font-size="7" font-family="monospace">${label}</text>
      <text x="205" y="${49 + index * 17}" fill="#7185a3" font-size="5" font-family="monospace">${category}</text>
    </g>`;
  }).join('');

  const engines = Array.from({ length: engineCount }, (_, index) => {
    const x = 100 + (index - (engineCount - 1) / 2) * 10;
    return `<path d="M${x - 4} 139 L${x - 3} 151 H${x + 3} L${x + 4} 139 Z" fill="#4a607a" stroke="#9bb0c9" stroke-width="1"/>
      <path d="M${x - 3} 151 l-2 14 h10 l-2-14 z" fill="#ff7b32" stroke="#ffb26b" stroke-width="1"/>`;
  }).join('');
  const legs = Array.from({ length: Math.ceil(legCount / 2) }, (_, index) => {
    const offset = 30 + index * 7;
    return `<path d="M86 132 L${86 - offset} 158 M114 132 L${114 + offset} 158" stroke="#8fa7c5" stroke-width="2"/>
      <path d="M${86 - offset - 4} 158 h8 M${114 + offset - 4} 158 h8" stroke="#8fa7c5" stroke-width="2"/>`;
  }).join('');
  const powerPanels = countFor('power') > 0
    ? '<path d="M82 98 H52 V116 H82 M118 98 H148 V116 H118" fill="#123966" stroke="#4aa5ff" stroke-width="1.5"/><path d="M57 98 V116 M67 98 V116 M143 98 V116 M133 98 V116" stroke="#4aa5ff" stroke-width="0.6"/>'
    : '';
  const antenna = countFor('comms') > 0
    ? '<path d="M100 48 V27 M95 31 Q100 23 105 31" fill="none" stroke="#61d6a5" stroke-width="1.5"/>'
    : '';
  const instruments = countFor('instrument') > 0
    ? '<circle cx="100" cy="105" r="5" fill="#0b1729" stroke="#61d6a5" stroke-width="1.5"/><circle cx="100" cy="105" r="1.5" fill="#61d6a5"/>'
    : '';
  const hull = countFor('hull') > 0
    ? '<path d="M87 101 Q87 94 100 92 Q113 94 113 101 V121 H87 Z" fill="#152b45" stroke="#62aaff" stroke-width="1.5"/>'
    : '<path d="M90 100 H110 V121 H90 Z" fill="#111d30" stroke="#7285a0" stroke-width="1.5" stroke-dasharray="3 2"/>';
  const tanks = tankHeight > 14
    ? `<g data-preview-tank="true" data-tank-volume="${tankVolume.toFixed(2)}"><rect x="88" y="${90 - tankHeight}" width="24" height="${tankHeight}" rx="7" fill="#24354c" stroke="#93a9c5" stroke-width="1.5"/><path d="M90 ${96 - tankHeight} H110 M90 ${103 - tankHeight} H110" stroke="#637b99" stroke-width="1"/></g>`
    : '';

  return `<svg data-craft-preview="true" width="100%" height="${previewHeight}" viewBox="0 0 320 ${previewHeight}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeSvg(design.name)} spacecraft blueprint">
    <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(58,142,246,0.15)" stroke-width="0.5"/></pattern></defs>
    <rect width="320" height="240" fill="url(#grid)"/>
    ${antenna}
    ${tanks}
    ${hull}
    ${instruments}
    ${powerPanels}
    ${legs}
    ${engines}
    <path d="M100 166 V184" stroke="#49617d" stroke-dasharray="2 3"/>
    <text x="100" y="194" fill="#8ca3c1" font-size="7" font-family="monospace" text-anchor="middle">${escapeSvg(design.name.toUpperCase())}</text>
    <text x="190" y="26" fill="#6c8cb5" font-size="7" font-family="monospace">LIVE HARDWARE PREVIEW</text>
    ${rows || '<text x="190" y="48" fill="#7185a3" font-size="7" font-family="monospace">No parts installed</text>'}
  </svg>`;
}

function statColor(val: number, ok: number, warn: number): string {
  if (val >= ok) return 'var(--ls-green)';
  if (val >= warn) return 'var(--ls-amber)';
  return 'var(--ls-red)';
}

export function renderHangar(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const contract = contracts.find(c => c.id === state.activeContractId) ?? contracts[0]!;
  const bodies = getBodies();
  const body = bodies.find(b => b.id === contract.bodyId) ?? bodies[0]!;
  const catalog = getParts();

  let design = { ...state.design, parts: [...state.design.parts] };
  let stats = computeShipStats(design, catalog, body);
  let activeFilter = 'all';
  let selectedPartInstanceId: string | null = null;

  // Footer buttons
  const ctaBtn = mkPrimary('Continue to Pre-flight →', () => transitionTo('preflight'));
  const presetBtn = mkSecondary('Starter Moon Preset', () => {
    design = { ...mockDesign, parts: [...mockDesign.parts] };
    getStore().update({ design });
    renderHangar(root, getStore().getState());
  });
  const saveBtn = mkSecondary('Save Design', () => {
    getStore().update({ design });
    // Show brief confirmation
    saveBtn.textContent = '✓ Saved';
    setTimeout(() => { saveBtn.textContent = 'Save Design'; }, 1200);
  });
  const resetBtn = mkSecondary('Reset Assembly', () => {
    design = { ...state.design, parts: [] };
    getStore().update({ design });
    renderHangar(root, getStore().getState());
  });

  const bodyEl = renderShell(root, state, {
    leftActions: [presetBtn, saveBtn, resetBtn],
    rightCta: ctaBtn,
    craftName: `${design.name} · #${hashDesign(design)}`,
    craftStatus: stats.valid ? 'nominal' : (stats.violations.length ? 'error' : 'warning'),
  });
  bodyEl.style.display = 'flex';

  /* ── LEFT: Component hierarchy nav ──────────────────── */
  const leftCol = document.createElement('div');
  leftCol.className = 'ls-col-left';
  leftCol.style.padding = '0';

  leftCol.innerHTML = `
    <div style="padding:var(--ls-sp-2) var(--ls-sp-3); border-bottom:1px solid var(--ls-border);">
      <div class="ls-micro">Component Hierarchy</div>
    </div>
    ${NAV_ITEMS.map((item, i) => `
      <div style="
        padding:10px var(--ls-sp-3);
        border-left:2px solid ${i === 0 ? 'var(--ls-orange)' : 'transparent'};
        color:${i === 0 ? 'var(--ls-text)' : 'var(--ls-text-dim)'};
        font-size:var(--ls-size-xs);
        border-bottom:1px solid var(--ls-border);
        font-family:var(--ls-font-mono);
        letter-spacing:0.06em;
        text-transform:uppercase;
        ${i === 4 ? 'opacity:0.4;cursor:not-allowed;' : 'cursor:pointer;'}
      " title="${i === 4 ? 'Staging Sequence — coming soon' : ''}">
        ${item}
      </div>`).join('')}
  `;

  // Parts library search + filter
  const partsLibHeader = document.createElement('div');
  partsLibHeader.style.cssText = 'padding:var(--ls-sp-2) var(--ls-sp-3); border-top:1px solid var(--ls-border); flex:1; display:flex; flex-direction:column;';
  partsLibHeader.innerHTML = `
    <div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Parts Library</div>
    <input id="hangar-search" type="text" placeholder="Search parts…"
      style="width:100%; background:var(--ls-surface); border:1px solid var(--ls-border); color:var(--ls-text); font-size:var(--ls-size-xs); padding:5px 8px; border-radius:var(--ls-radius-sm); font-family:var(--ls-font-mono); margin-bottom:var(--ls-sp-2);" />
    <div id="cat-filter" style="display:flex; flex-wrap:wrap; gap:3px; margin-bottom:var(--ls-sp-2);">
      ${CATEGORIES.map(c => `
        <button class="ls-chip ${activeFilter === c.key ? 'ls-chip-orange' : 'ls-chip-dim'}" data-cat="${c.key}" style="cursor:pointer; font-size:0.6rem; padding:2px 6px; border:1px solid">${c.label}</button>
      `).join('')}
    </div>
  `;
  leftCol.appendChild(partsLibHeader);

  const partsListEl = document.createElement('div');
  partsListEl.id = 'parts-list';
  partsListEl.setAttribute('data-tutorial', 'parts-menu');
  partsListEl.style.cssText = 'flex:1; overflow-y:auto; padding:0 var(--ls-sp-2) var(--ls-sp-2);';
  leftCol.appendChild(partsListEl);

  bodyEl.appendChild(leftCol);

  /* ── CENTRE: Blueprint + installed rack ──────────────── */
  const mainCol = document.createElement('div');
  mainCol.className = 'ls-col-main';
  mainCol.style.borderRight = '1px solid var(--ls-border)';

  // Contract strip
  mainCol.innerHTML = `
    <div style="border-bottom:1px solid var(--ls-border); padding:var(--ls-sp-2) var(--ls-sp-3); display:flex; align-items:center; gap:var(--ls-sp-3); flex-shrink:0; overflow:hidden;">
      <span class="ls-micro">Contract:</span>
      <span style="font-size:var(--ls-size-xs); color:var(--ls-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1">${contract.title}</span>
      <span class="ls-micro">Cap:</span>
      <span style="font-family:var(--ls-font-mono); font-size:var(--ls-size-xs); color:var(--ls-green)">${formatM(contract.budgetCapM)}</span>
      <span class="ls-micro">Used:</span>
      <span style="font-family:var(--ls-font-mono); font-size:var(--ls-size-xs); color:${stats.costM > contract.budgetCapM ? 'var(--ls-red)' : 'var(--ls-text)'}">${formatM(stats.costM)}</span>
      <div style="display:flex; gap:4px; flex-wrap:wrap; flex-shrink:0">
        ${contract.requiredInstruments.map(i => `<span class="ls-chip ls-chip-blue">${i}</span>`).join('')}
      </div>
    </div>
  `;

  // View switcher 2D / ISO / WIRE
  const viewSwitcher = document.createElement('div');
  viewSwitcher.style.cssText = 'display:flex; padding:var(--ls-sp-2) var(--ls-sp-3); gap:var(--ls-sp-2); border-bottom:1px solid var(--ls-border); flex-shrink:0;';
  viewSwitcher.innerHTML = `
    <div class="ls-seg-ctrl">
      <button class="ls-seg-btn is-active">2D</button>
      <button class="ls-seg-btn" disabled title="ISO view — coming soon">ISO</button>
      <button class="ls-seg-btn" disabled title="Wireframe — coming soon">WIRE</button>
    </div>
  `;
  mainCol.appendChild(viewSwitcher);

  // Blueprint ship drawing
  const blueprint = document.createElement('div');
  blueprint.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; overflow-y:auto; background:rgba(0,8,20,0.6); border-bottom:1px solid var(--ls-border); min-height:200px; max-height:420px; position:relative;';
  blueprint.innerHTML = renderCraftPreview(design, catalog);
  mainCol.appendChild(blueprint);

  // Installed hardware rack
  const rack = document.createElement('div');
  rack.style.padding = 'var(--ls-sp-3)';
  rack.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Installed Hardware</div>`;

  const overallIntegrity = design.parts.length
    ? design.parts.reduce((s, p) => s + (p.condition / p.maxCondition), 0) / design.parts.length
    : 1;

  const integrityBar = document.createElement('div');
  integrityBar.className = 'ls-meter';
  integrityBar.innerHTML = `
    <div class="ls-meter-row">
      <span class="ls-meter-label">Overall Integrity</span>
      <span class="ls-meter-value" style="color:${statColor(overallIntegrity, 0.8, 0.5)}">${(overallIntegrity * 100).toFixed(0)}%</span>
    </div>
    <div class="ls-meter-track"><div class="ls-meter-fill ${overallIntegrity > 0.8 ? 'ok' : overallIntegrity > 0.5 ? 'warn' : 'bad'}" style="width:${(overallIntegrity * 100).toFixed(0)}%"></div></div>
  `;
  rack.appendChild(integrityBar);

  if (design.parts.length === 0) {
    rack.innerHTML += `<div style="color:var(--ls-text-micro); font-size:var(--ls-size-xs); text-align:center; padding:var(--ls-sp-3);">No parts installed — add from the library</div>`;
  } else {
    for (const inst of design.parts) {
      const def = catalog.find(d => d.id === inst.partId);
      if (!def) continue;
      const pct = (inst.condition / inst.maxCondition) * 100;
      const prow = document.createElement('div');
      prow.style.cssText = `display:flex; align-items:center; gap:var(--ls-sp-2); padding:3px 0; border-bottom:1px solid var(--ls-border); cursor:pointer;`;
      prow.dataset['instId'] = inst.instanceId;
      prow.innerHTML = `
        <span style="font-size:var(--ls-size-xs); flex:1; color:var(--ls-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${def.name}">${def.name}</span>
        <div style="width:60px; height:3px; background:var(--ls-surface); border-radius:2px; overflow:hidden; flex-shrink:0">
          <div style="width:${pct.toFixed(0)}%; height:100%; background:${pct>80?'var(--ls-green)':pct>50?'var(--ls-amber)':'var(--ls-red)'}"></div>
        </div>
        <span style="font-size:0.6rem; font-family:var(--ls-font-mono); color:var(--ls-text-micro); flex-shrink:0">${pct.toFixed(0)}%</span>
        <button style="font-size:0.6rem; padding:2px 5px; border:1px solid var(--ls-red); color:var(--ls-red); background:transparent; cursor:pointer; border-radius:2px;" data-remove="${inst.instanceId}">✕</button>
      `;
      rack.appendChild(prow);
    }
  }
  mainCol.appendChild(rack);

  bodyEl.appendChild(mainCol);

  /* ── RIGHT: Tuning + telemetry + advisories ──────────── */
  const rightCol = document.createElement('div');
  rightCol.className = 'ls-col-right';
  rightCol.style.padding = '0';

  function updateRight() {
    stats = computeShipStats(design, catalog, body);
    rightCol.innerHTML = '';

    // Part tuning (selected part params)
    const selInst = selectedPartInstanceId
      ? design.parts.find(p => p.instanceId === selectedPartInstanceId)
      : null;
    const selDef = selInst ? catalog.find(d => d.id === selInst.partId) : null;

    const tuningDiv = document.createElement('div');
    tuningDiv.style.padding = 'var(--ls-sp-3)';
    tuningDiv.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Part Tuning Matrix</div>`;

    if (selDef && selInst) {
      tuningDiv.innerHTML += `<div style="font-size:var(--ls-size-xs); color:var(--ls-text); font-weight:600; margin-bottom:var(--ls-sp-2)">${selDef.name}</div>`;
      for (const param of selDef.params) {
        const curVal = selInst.paramValues[param.key] ?? param.default;
        const pct = ((curVal - param.min) / (param.max - param.min)) * 100;
        const nomPct = ((param.default - param.min) / (param.max - param.min)) * 100;
        const sliderEl = document.createElement('div');
        sliderEl.style.marginBottom = 'var(--ls-sp-2)';
        sliderEl.innerHTML = `
          <div style="display:flex; justify-content:space-between; font-size:var(--ls-size-xs); margin-bottom:3px;">
            <span style="color:var(--ls-text-dim)" title="${param.explain}">${param.label}</span>
            <span style="font-family:var(--ls-font-mono); color:var(--ls-text)">${curVal.toFixed(2)} ${param.unit}</span>
          </div>
          <div style="position:relative; height:6px; background:var(--ls-surface); border-radius:3px; margin-bottom:2px;">
            <div style="position:absolute; left:0; top:0; height:100%; width:${pct.toFixed(0)}%; background:var(--ls-orange); border-radius:3px;"></div>
            <div style="position:absolute; left:${nomPct.toFixed(0)}%; top:-3px; width:1px; height:12px; background:var(--ls-green);" title="Nominal: ${param.default}"></div>
          </div>
          <input type="range" data-param="${param.key}" data-inst="${selInst.instanceId}"
            min="${param.min}" max="${param.max}" step="${param.step}" value="${curVal}"
            style="width:100%; accent-color:var(--ls-orange); height:3px;" data-tutorial="throttle-slider"/>
          <div style="display:flex; justify-content:space-between; font-family:var(--ls-font-mono); font-size:0.6rem; color:var(--ls-text-micro);">
            <span>${param.min}</span><span style="color:var(--ls-green)">NOM ${param.default}</span><span>${param.max}</span>
          </div>
        `;
        tuningDiv.appendChild(sliderEl);
      }
    } else {
      tuningDiv.innerHTML += `<div style="color:var(--ls-text-micro); font-size:var(--ls-size-xs)">Select an installed part to tune its parameters.</div>`;
    }
    rightCol.appendChild(tuningDiv);

    // Live flight telemetry
    const telemDiv = document.createElement('div');
    telemDiv.style.cssText = 'border-top:1px solid var(--ls-border); padding:var(--ls-sp-3);';
    telemDiv.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Live Flight Telemetry</div>`;

    const rows: [string, string, string][] = [
      ['Reliability',  `${(stats.reliability * 100).toFixed(0)}%`, statColor(stats.reliability, 0.9, 0.7)],
      ['Total Mass',   `${(stats.totalMassKg / 1000).toFixed(2)} t`, 'var(--ls-text)'],
      ['Dry / Fuel',   `${(stats.dryMassKg/1000).toFixed(1)} / ${(stats.fuelMassKg/1000).toFixed(1)} t`, 'var(--ls-text-dim)'],
      ['Delta-V',      `${stats.deltaVms.toFixed(0)} m/s`, statColor(stats.deltaVms, 2000, 500)],
      ['TWR',          `${stats.twr.toFixed(2)}×`, statColor(stats.twr, 1.3, 1.0)],
      ['Power Net',    `${(stats.powerGenW - stats.powerDrawW).toFixed(0)} W`, statColor(stats.powerGenW - stats.powerDrawW, 50, 0)],
      ['Downlink',     `${stats.downlinkKbps.toFixed(0)} kbps`, statColor(stats.downlinkKbps - stats.dataGenKbps, 0, -50)],
      ['Cost',         formatM(stats.costM), stats.costM <= contract.budgetCapM ? 'var(--ls-green)' : 'var(--ls-red)'],
    ];

    for (const [label, value, color] of rows) {
      telemDiv.innerHTML += `
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid var(--ls-border); font-size:var(--ls-size-xs);">
          <span style="color:var(--ls-text-micro); font-family:var(--ls-font-mono); text-transform:uppercase; letter-spacing:0.06em">${label}</span>
          <span style="font-family:var(--ls-font-mono); color:${color}">${value}</span>
        </div>`;
    }

    // Budget allocation bar
    const budgetPct = Math.min(100, (stats.costM / contract.budgetCapM) * 100);
    telemDiv.innerHTML += `
      <div class="ls-meter" style="margin-top:var(--ls-sp-2)">
        <div class="ls-meter-row">
          <span class="ls-meter-label">Budget Allocation</span>
          <span class="ls-meter-value">${budgetPct.toFixed(0)}%</span>
        </div>
        <div class="ls-meter-track">
          <div class="ls-meter-fill ${budgetPct < 80 ? 'ok' : budgetPct < 100 ? 'warn' : 'bad'}" style="width:${Math.min(100, budgetPct).toFixed(0)}%"></div>
        </div>
      </div>`;
    rightCol.appendChild(telemDiv);

    // Diagnostics
    const diagDiv = document.createElement('div');
    diagDiv.style.cssText = 'border-top:1px solid var(--ls-border); padding:var(--ls-sp-3);';
    diagDiv.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Diagnostics & Advisories</div>`;

    for (const v of stats.violations) {
      diagDiv.innerHTML += `<div class="ls-advisory error"><div class="ls-advisory-title">Violation</div>${v}</div>`;
    }
    for (const w of stats.warnings) {
      diagDiv.innerHTML += `<div class="ls-advisory"><div class="ls-advisory-title">Warning</div>${w}</div>`;
    }

    const hints = getActiveHints({ stats, body, contract, design, catalog }, state.save.difficulty);
    for (const h of hints) {
      diagDiv.innerHTML += `<div class="ls-advisory info"><div class="ls-advisory-title">Hint</div>${h}</div>`;
    }

    if (!stats.violations.length && !stats.warnings.length) {
      diagDiv.innerHTML += `<div class="ls-advisory ok"><div class="ls-advisory-title">All Systems Nominal</div>No violations detected.</div>`;
    }
    rightCol.appendChild(diagDiv);
  }

  updateRight();
  bodyEl.appendChild(rightCol);

  /* ── Parts library rendering ─────────────────────────── */
  function renderParts(search = '') {
    partsListEl.innerHTML = '';
    const filter = CATEGORIES.find(c => c.key === activeFilter);
    const filtered = catalog.filter(p => {
      const matchCat = !filter?.cats.length || filter.cats.includes(p.category);
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    for (const part of filtered) {
      const lockReason = getLockReason(part, body);
      const card = document.createElement('div');
      card.style.cssText = `
        border:1px solid var(--ls-border);
        border-radius:var(--ls-radius-sm);
        padding:var(--ls-sp-2) var(--ls-sp-3);
        margin-bottom:4px;
        opacity:${lockReason ? '0.45' : '1'};
        background:var(--ls-panel);
      `;
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:var(--ls-sp-2); margin-bottom:4px;">
          <span style="font-size:var(--ls-size-xs); flex:1; color:var(--ls-text); font-weight:500">${part.name}</span>
          <span style="font-family:var(--ls-font-mono); font-size:0.6rem; color:var(--ls-text-micro)">${(part.baseMassKg/1000).toFixed(2)}t</span>
          <span style="font-family:var(--ls-font-mono); font-size:0.6rem; color:var(--ls-green)">${formatM(part.baseCostM)}</span>
        </div>
        ${lockReason ? `<div style="font-size:0.6rem; color:var(--ls-amber); margin-bottom:4px; line-height:1.3">${lockReason}</div>` : ''}
        <div style="display:flex; gap:var(--ls-sp-2); align-items:center;">
          <span class="ls-chip ls-chip-dim" style="font-size:0.6rem; padding:1px 5px">${part.category}</span>
          ${!lockReason ? `<button class="ls-btn" style="font-size:0.6rem; padding:2px 8px; margin-left:auto;" data-add="${part.id}">+ ADD</button>` : ''}
        </div>
      `;
      partsListEl.appendChild(card);
    }
  }

  renderParts();

  /* ── Event delegation ─────────────────────────────────── */
  // Category filter clicks
  leftCol.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest('[data-cat]') as HTMLElement | null;
    if (btn) {
      activeFilter = btn.dataset['cat'] ?? 'all';
      leftCol.querySelectorAll('[data-cat]').forEach(b => {
        b.className = `ls-chip ${(b as HTMLElement).dataset['cat'] === activeFilter ? 'ls-chip-orange' : 'ls-chip-dim'}`;
        (b as HTMLElement).style.cssText = 'cursor:pointer; font-size:0.6rem; padding:2px 6px; border:1px solid';
      });
      renderParts((leftCol.querySelector('#hangar-search') as HTMLInputElement)?.value ?? '');
    }
  });

  // Search
  leftCol.addEventListener('input', e => {
    const inp = e.target as HTMLInputElement;
    if (inp.id === 'hangar-search') renderParts(inp.value);
  });

  // Add part
  partsListEl.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest('[data-add]') as HTMLElement | null;
    if (btn) {
      const partId = btn.dataset['add']!;
      const def = catalog.find(d => d.id === partId);
      if (!def) return;
      const inst: PartInstance = {
        instanceId: `${partId}-${Date.now()}`,
        partId,
        paramValues: Object.fromEntries(def.params.map(p => [p.key, p.default])),
        condition: 100,
        maxCondition: 100,
      };
      design.parts = [...design.parts, inst];
      getStore().update({ design });
      updateRight();
      // Re-render rack
      renderHangar(root, getStore().getState());
    }
  });

  // Remove part
  mainCol.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest('[data-remove]') as HTMLElement | null;
    if (btn) {
      const id = btn.dataset['remove']!;
      design.parts = design.parts.filter(p => p.instanceId !== id);
      getStore().update({ design });
      renderHangar(root, getStore().getState());
    }

    // Select part for tuning
    const prow = (e.target as HTMLElement).closest('[data-inst-id]') as HTMLElement | null;
    if (prow) {
      selectedPartInstanceId = prow.dataset['instId'] ?? null;
      updateRight();
    }
  });

  // Param sliders
  rightCol.addEventListener('input', e => {
    const slider = e.target as HTMLInputElement;
    if (slider.type !== 'range') return;
    const instId = slider.dataset['inst'];
    const paramKey = slider.dataset['param'];
    if (!instId || !paramKey) return;
    const inst = design.parts.find(p => p.instanceId === instId);
    if (!inst) return;
    inst.paramValues = { ...inst.paramValues, [paramKey]: Number(slider.value) };
    getStore().update({ design });
    blueprint.innerHTML = renderCraftPreview(design, catalog);
    updateRight();
  });
}
