/**
 * Screen 00: Mission Select → contracts phase
 * Figma frame 21:1337. Three-column layout: nav | body list + orbital map | body specs + contract card.
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { formatM } from '@/core/units';
import { setActiveContract } from '@/state/actions';

function atmosphereLabel(body: import('@/types').Body): string {
  if (!body.atmosphere) return 'None — vacuum';
  const d = body.atmosphere.surfaceDensityKgM3;
  if (d < 0.1)  return `Thin (${d} kg/m³)`;
  if (d < 10)   return `Moderate (${d} kg/m³)`;
  return `Dense (${d} kg/m³)`;
}

function solarLabel(flux: number): string {
  if (flux < 0.05) return `${flux}× — RTG recommended`;
  if (flux < 0.3)  return `${flux}× — Low solar`;
  return `${flux}× Earth`;
}

function constraintNotices(body: import('@/types').Body): string[] {
  const notices: string[] = [];
  if (!body.atmosphere) notices.push('Parachutes unusable — no atmosphere');
  if (body.solarFlux < 0.05) notices.push('Solar flux critically low — RTG or large arrays required');
  else if (body.solarFlux < 0.3) notices.push('Low solar flux — increase panel area');
  if (body.atmosphere && body.atmosphere.surfaceDensityKgM3 > 10)
    notices.push('Dense atmosphere — thermal protection required during entry');
  if (body.note) notices.push(body.note);
  return notices;
}

export function renderContracts(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const bodies = getBodies();

  // Pick active body from active contract
  const activeContract = contracts.find(c => c.id === state.activeContractId) ?? contracts[0]!;
  const activeBody = bodies.find(b => b.id === activeContract.bodyId) ?? bodies[0]!;

  // State for selected body/contract
  let selectedBodyId = activeBody.id;
  let selectedContractId = activeContract.id;

  function getBody() { return bodies.find(b => b.id === selectedBodyId) ?? bodies[0]!; }
  function getContract() { return contracts.find(c => c.id === selectedContractId) ?? activeContract; }

  // CTA handler
  const cta = mkPrimary('Accept Contract & Open Hangar', () => {
    setActiveContract(selectedContractId);
    transitionTo('hangar');
  });

  const back = mkSecondary('← Home', () => transitionTo('home'));

  const bodyEl = renderShell(root, state, {
    leftActions: [back],
    rightCta: cta,
    craftName: state.design.name,
  });

  /* ── Three-column layout ─────────────────────────────────── */
  bodyEl.style.display = 'flex';
  bodyEl.style.height = '100%';

  // LEFT: Telemetry docks mini-nav
  const leftCol = document.createElement('div');
  leftCol.className = 'ls-col-left';
  leftCol.style.padding = 'var(--ls-sp-3)';

  leftCol.innerHTML = `
    <div class="ls-micro" style="margin-bottom:var(--ls-sp-3)">Navigation</div>
    ${[
      { label: 'Mission Select', active: true },
      { label: 'Vessel Assembly', active: false },
      { label: 'Research Lab', active: false },
      { label: 'Agency HQ', active: false },
    ].map(item => `
      <div style="
        padding: 8px var(--ls-sp-3);
        border-left: 2px solid ${item.active ? 'var(--ls-orange)' : 'transparent'};
        color: ${item.active ? 'var(--ls-text)' : 'var(--ls-text-dim)'};
        font-size: var(--ls-size-sm);
        margin-bottom: 2px;
        cursor: ${item.active ? 'default' : 'pointer'};
      ">
        ${item.label}
      </div>`).join('')}
  `;

  bodyEl.appendChild(leftCol);

  // CENTRE: Body list + orbital map
  const mainCol = document.createElement('div');
  mainCol.className = 'ls-col-main';
  bodyEl.appendChild(mainCol);

  // RIGHT: Body specs + contract card
  const rightCol = document.createElement('div');
  rightCol.className = 'ls-col-right';
  rightCol.style.padding = 'var(--ls-sp-3)';
  bodyEl.appendChild(rightCol);

  function renderMain() {
    mainCol.innerHTML = '';
    rightCol.innerHTML = '';

    // ── Body list ──
    const listHeader = document.createElement('div');
    listHeader.style.cssText = `display:flex; align-items:center; justify-content:space-between; padding:var(--ls-sp-3) 0; border-bottom:1px solid var(--ls-border); margin-bottom:var(--ls-sp-3);`;
    listHeader.innerHTML = `<span class="ls-micro">Target Destinations</span>`;
    mainCol.appendChild(listHeader);

    for (const body of bodies) {
      const contract = contracts.find(c => c.bodyId === body.id);
      if (!contract) continue;

      const isUnlocked = state.save.unlockedContractIds.includes(contract.id);
      const isSelected = body.id === selectedBodyId;
      const completed = state.save.completedContracts[contract.id];

      const card = document.createElement('div');
      card.style.cssText = `
        border: 1px solid ${isSelected ? 'var(--ls-orange)' : 'var(--ls-border)'};
        background: ${isSelected ? 'rgba(255,90,31,0.06)' : 'var(--ls-panel)'};
        border-radius: var(--ls-radius-md);
        padding: var(--ls-sp-3);
        margin-bottom: var(--ls-sp-2);
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        display: flex;
        align-items: flex-start;
        gap: var(--ls-sp-3);
        opacity: ${isUnlocked ? '1' : '0.55'};
      `;
      card.dataset['bodyId'] = body.id;

      const tier = bodies.indexOf(body) + 1;
      card.innerHTML = `
        <div style="flex-shrink:0; width:36px; height:36px; border:1px solid var(--ls-border); border-radius:var(--ls-radius-sm); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
          ${['🌙','🔴','🟤','☁️','🪨'][bodies.indexOf(body)] ?? '⬛'}
        </div>
        <div style="flex:1; min-width:0">
          <div style="display:flex; align-items:center; gap:var(--ls-sp-2); margin-bottom:4px;">
            <span style="font-weight:600; font-size:var(--ls-size-base); color:var(--ls-text)">${body.name}</span>
            <span class="ls-chip ${isUnlocked ? 'ls-chip-green' : 'ls-chip-dim'}">${isUnlocked ? 'RDY' : 'LOCKED'}</span>
            <span class="ls-micro">Tier ${tier}</span>
          </div>
          <div style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
            ${contract.objective}
          </div>
          <div style="display:flex; gap:var(--ls-sp-3); font-size:var(--ls-size-xs); font-family:var(--ls-font-mono);">
            <span style="color:var(--ls-text-micro)">g: <span style="color:var(--ls-text)">${body.gravityMs2} m/s²</span></span>
            <span style="color:var(--ls-text-micro)">Δv: <span style="color:var(--ls-text)">— </span><span style="color:var(--ls-text-micro)" title="TODO(owner-4): required Δv not in Contract">TODO</span></span>
            ${!isUnlocked ? `<span style="color:var(--ls-amber)">Requires ${formatM(contract.fundingGateM)}</span>` : ''}
            ${completed ? `<span style="color:var(--ls-green)">✓ Best: ${formatM(completed.bestNetM)}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (!isUnlocked) return;
        selectedBodyId = body.id;
        selectedContractId = contract.id;
        renderMain();
      });

      mainCol.appendChild(card);
    }

    // ── Orbital map schematic ──
    const mapPanel = document.createElement('div');
    mapPanel.className = 'ls-panel';
    mapPanel.style.marginTop = 'var(--ls-sp-3)';
    mapPanel.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Orbital Transfer Projection</span>
        <div style="display:flex; gap:1px;">
          ${['ALL','INNER','GAS GIANTS'].map(f => `<button class="ls-seg-btn ${f === 'ALL' ? 'is-active' : ''}" disabled style="font-size:0.6rem; padding:3px 7px;">${f}</button>`).join('')}
        </div>
      </div>
      <div class="ls-panel-body" style="display:flex; justify-content:center; align-items:center; height:120px;">
        <!-- Schematic SVG orbital map -->
        <svg width="300" height="100" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Sun -->
          <circle cx="20" cy="50" r="6" fill="#FFD700" opacity="0.8"/>
          <!-- Orbits (ellipses) -->
          <ellipse cx="20" cy="50" rx="40" ry="12" stroke="var(--ls-border)" stroke-width="1" fill="none"/>
          <ellipse cx="20" cy="50" rx="80" ry="22" stroke="var(--ls-border)" stroke-width="1" fill="none"/>
          <ellipse cx="20" cy="50" rx="130" ry="35" stroke="var(--ls-border)" stroke-width="1" fill="none"/>
          <ellipse cx="20" cy="50" rx="200" ry="50" stroke="var(--ls-border-mid)" stroke-width="1" fill="none" stroke-dasharray="4 3"/>
          <!-- Earth -->
          <circle cx="60" cy="50" r="4" fill="#3A8EF6"/>
          <!-- Target body marker -->
          <circle cx="${80 + bodies.indexOf(getBody()) * 50}" cy="50" r="5" fill="var(--ls-orange)" opacity="0.9"/>
          <!-- Transfer arc -->
          <path d="M60 50 Q${100 + bodies.indexOf(getBody()) * 25} 15 ${80 + bodies.indexOf(getBody()) * 50} 50" stroke="var(--ls-orange)" stroke-width="1" fill="none" stroke-dasharray="3 2"/>
          <text x="22" y="90" fill="var(--ls-text-micro)" font-size="8" font-family="monospace">EARTH</text>
          <text x="${73 + bodies.indexOf(getBody()) * 50}" y="90" fill="var(--ls-orange)" font-size="8" font-family="monospace">${getBody().name.toUpperCase().substring(0, 6)}</text>
        </svg>
        <div style="font-size:var(--ls-size-xs); color:var(--ls-text-micro); margin-left:var(--ls-sp-3)">
          <div>Distance: <span style="color:var(--ls-text)">— AU</span> <span class="ls-micro" title="TODO(owner-4): distance not in Body">—</span></div>
          <div>Transit: <span style="color:var(--ls-text)">—</span></div>
          <div>Δv-to-orbit: <span style="color:var(--ls-text)">—</span> <span class="ls-micro" title="TODO(owner-4)">TODO</span></div>
        </div>
      </div>
    `;
    mainCol.appendChild(mapPanel);

    /* ── RIGHT COLUMN ── */

    // Body specs
    const body = getBody();
    const contract = getContract();

    const specsSection = document.createElement('div');
    specsSection.innerHTML = `
      <div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Body Specifications</div>
      <div class="ls-panel" style="margin-bottom:var(--ls-sp-3)">
        <div class="ls-panel-header"><span class="ls-panel-title">${body.name}</span></div>
        <div class="ls-panel-body">
          ${[
            ['Surface Gravity', `${body.gravityMs2} m/s²`],
            ['Atmosphere', atmosphereLabel(body)],
            ['Solar Flux', solarLabel(body.solarFlux)],
            ['Mission Lifetime', `${(body.baseLifetimeS / 3600).toFixed(0)} h`],
            ['Escape Velocity', '— m/s', 'TODO(owner-4)'],
            ['Temp Range', '—', 'TODO(owner-4)'],
            ['Rotation Period', '—', 'TODO(owner-4)'],
            ['Transit Window', '—', 'TODO(owner-4)'],
            ['Landing Elevation', '—', 'TODO(owner-4)'],
          ].map(([label, value, todo]) => `
            <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid var(--ls-border); font-size:var(--ls-size-xs);">
              <span style="color:var(--ls-text-micro); font-family:var(--ls-font-mono); text-transform:uppercase; letter-spacing:0.06em">${label}</span>
              <span style="color:${todo ? 'var(--ls-text-micro)' : 'var(--ls-text)'}; font-family:var(--ls-font-mono);" title="${todo ?? ''}">${value}</span>
            </div>`).join('')}
        </div>
      </div>
    `;

    // Operational constraints
    const notices = constraintNotices(body);
    if (notices.length) {
      const noticeDiv = document.createElement('div');
      noticeDiv.style.marginBottom = 'var(--ls-sp-3)';
      noticeDiv.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--ls-sp-2)">Operational Constraints</div>`;
      for (const n of notices) {
        const a = document.createElement('div');
        a.className = 'ls-advisory';
        a.innerHTML = `<div class="ls-advisory-title">Notice</div>${n}`;
        noticeDiv.appendChild(a);
      }
      specsSection.appendChild(noticeDiv);
    }

    // Recommended baseline gap note
    const baselineDiv = document.createElement('div');
    baselineDiv.className = 'ls-advisory info';
    baselineDiv.innerHTML = `<div class="ls-advisory-title">Recommended Craft Baseline</div>Max Wet Mass: — kg · Min TWR: — · Min Δv Margin: — m/s <span style="color:var(--ls-text-micro)" title="TODO(owner-4): recommended baseline not in Contract">TODO(owner-4)</span>`;
    specsSection.appendChild(baselineDiv);

    rightCol.appendChild(specsSection);

    // Contract card
    const cardEl = document.createElement('div');
    cardEl.className = 'ls-panel';
    cardEl.style.marginBottom = 'var(--ls-sp-3)';
    cardEl.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Contract</span>
        <span class="ls-chip ls-chip-orange" data-tutorial="contract-brief">SELECTED</span>
      </div>
      <div class="ls-panel-body">
        <div style="font-weight:600; font-size:var(--ls-size-base); color:var(--ls-text); margin-bottom:var(--ls-sp-2)">${contract.title}</div>
        <div style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); margin-bottom:var(--ls-sp-3)">${contract.objective}</div>
        ${[
          ['Budget Cap', formatM(contract.budgetCapM)],
          ['Reward', formatM(contract.rewardM)],
          ['Funding Gate', formatM(contract.fundingGateM)],
          ['Accuracy', '— ±m', 'TODO(owner-4)'],
        ].map(([k, v, todo]) => `
          <div style="display:flex; justify-content:space-between; font-size:var(--ls-size-xs); padding:3px 0; border-bottom:1px solid var(--ls-border);">
            <span style="color:var(--ls-text-micro); font-family:var(--ls-font-mono); text-transform:uppercase; letter-spacing:0.06em">${k}</span>
            <span style="color:${todo ? 'var(--ls-text-micro)' : 'var(--ls-green)'}; font-family:var(--ls-font-mono);" title="${todo ?? ''}">${v}</span>
          </div>`).join('')}
        <div style="margin-top:var(--ls-sp-2)">
          <div class="ls-micro" style="margin-bottom:4px">Required Instruments</div>
          <div style="display:flex; gap:4px; flex-wrap:wrap">
            ${contract.requiredInstruments.map(i => `<span class="ls-chip ls-chip-blue">${i}</span>`).join('')}
          </div>
        </div>
        ${contract.bonusObjectives?.length ? `
          <div style="margin-top:var(--ls-sp-2)">
            <div class="ls-micro" style="margin-bottom:4px">Bonus Objectives</div>
            ${contract.bonusObjectives.map(b => `
              <div style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); padding:2px 0">
                +${formatM(b.extraRewardM)}: ${b.text}
              </div>`).join('')}
          </div>` : ''}
      </div>
    `;
    rightCol.appendChild(cardEl);
  }

  renderMain();
}
