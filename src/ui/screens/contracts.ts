/**
 * Screen 00: Mission Select → contracts phase
 * Figma frame 21:1337. Three-column layout: nav | destinations list + orbital map | body specs + contract card.
 */
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { getBodies, getContracts } from '@/data/index';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { formatM } from '@/core/units';
import { setActiveContract } from '@/state/actions';

interface MetaBody {
  distanceFromEarthKm?: number;
  distanceAu?: number;
  transitTimeDays?: number;
  transitDays?: number;
  deltaVToOrbitMs?: number;
  escapeVelocityMs?: number;
  surfaceTempMinC?: number;
  surfaceTempMaxC?: number;
  tempRangeC?: string;
  rotationPeriodHours?: number;
  rotationPeriodH?: number;
}

interface MetaContract {
  requiredDeltaVms?: number;
  requiredDeltaVMs?: number;
  targetAccuracyM?: number;
  recommendedBaseline?: {
    maxWetMassKg?: number;
    minTwr?: number;
    minDvMarginMs?: number;
    minDeltaVMarginMs?: number;
  };
}

/** Max sane funding gate — anything above this shows as "Locked" */
const SANE_FUNDING_GATE_M = 9_999;

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

/** SVG planet icon (line, 1.5px stroke) */
function planetSvg(color: string): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="1.5"/>
    <ellipse cx="12" cy="12" rx="14" ry="4" stroke="${color}" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
  </svg>`;
}

const PLANET_COLORS = ['#61dda0', '#ffba3b', '#ff5a1f', '#ab897f', '#e5e2e3'];

export function renderContracts(root: HTMLElement, state: GameState): void {
  const contracts = getContracts();
  const bodies = getBodies();

  const activeContract = contracts.find(c => c.id === state.activeContractId) ?? contracts[0]!;
  const activeBody = bodies.find(b => b.id === activeContract.bodyId) ?? bodies[0]!;

  let selectedBodyId = activeBody.id;
  let selectedContractId = activeContract.id;

  function getBody() { return bodies.find(b => b.id === selectedBodyId) ?? bodies[0]!; }
  function getContract() { return contracts.find(c => c.id === selectedContractId) ?? activeContract; }

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

  bodyEl.style.display = 'flex';
  bodyEl.style.height = '100%';

  // LEFT: section nav
  const leftCol = document.createElement('div');
  leftCol.className = 'ls-col-left';
  leftCol.style.padding = 'var(--sp-3)';
  leftCol.innerHTML = `
    <div class="ls-micro" style="margin-bottom:var(--sp-3)">Navigation</div>
    ${[
      { label: 'Mission Select', active: true },
      { label: 'Vessel Assembly', active: false },
      { label: 'Research Lab', active: false },
      { label: 'Agency HQ', active: false },
    ].map(item => `
      <div style="
        padding:8px var(--sp-3);
        border-left:2px solid ${item.active ? 'var(--accent)' : 'transparent'};
        color:${item.active ? 'var(--text)' : 'var(--text-muted)'};
        font-size:0.8125rem;
        margin-bottom:2px;
        cursor:${item.active ? 'default' : 'pointer'};
      ">${item.label}</div>`).join('')}
  `;
  bodyEl.appendChild(leftCol);

  // CENTRE: destinations list + orbital map
  const mainCol = document.createElement('div');
  mainCol.className = 'ls-col-main';
  bodyEl.appendChild(mainCol);

  // RIGHT: body specs + contract card
  const rightCol = document.createElement('div');
  rightCol.className = 'ls-col-right';
  rightCol.style.padding = 'var(--sp-3)';
  bodyEl.appendChild(rightCol);

  function renderMain() {
    mainCol.innerHTML = '';
    rightCol.innerHTML = '';

    // ── Destinations list header
    const listHeader = document.createElement('div');
    listHeader.style.cssText = `display:flex; align-items:center; justify-content:space-between; padding:var(--sp-3) 0; border-bottom:1px solid var(--border); margin-bottom:var(--sp-3);`;
    listHeader.innerHTML = `<span class="ls-micro">Target Destinations</span>`;
    mainCol.appendChild(listHeader);

    // Compact list rows (not large cards)
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]!;
      const contract = contracts.find(c => c.bodyId === body.id);
      if (!contract) continue;

      const isUnlocked = state.save.unlockedContractIds.includes(contract.id);
      const isSelected = body.id === selectedBodyId;
      const completed = state.save.completedContracts[contract.id];
      const tier = i + 1;
      const color = PLANET_COLORS[i % PLANET_COLORS.length]!;

      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;
        align-items:center;
        gap:var(--sp-3);
        padding:8px var(--sp-3);
        border:1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'};
        border-left:3px solid ${isSelected ? 'var(--accent)' : 'transparent'};
        background:${isSelected ? 'rgba(255,90,31,0.05)' : 'var(--bg-panel)'};
        margin-bottom:2px;
        cursor:${isUnlocked ? 'pointer' : 'default'};
        opacity:${isUnlocked ? '1' : '0.5'};
        transition:border-color 0.1s, background 0.1s;
      `;
      row.dataset['bodyId'] = body.id;

      // funding gate display — sanitise absurd values
      const gateStr = contract.fundingGateM > SANE_FUNDING_GATE_M
        ? 'Locked'
        : formatM(contract.fundingGateM);

      const mContract = contract as unknown as MetaContract;
      const reqDv = mContract.requiredDeltaVMs ?? mContract.requiredDeltaVms;
      row.innerHTML = `
        <div style="flex-shrink:0; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
          ${planetSvg(color)}
        </div>
        <div style="flex:1; min-width:0">
          <div style="display:flex; align-items:center; gap:var(--sp-2); margin-bottom:2px;">
            <span style="font-weight:600; font-size:0.8125rem; color:var(--text)">${body.name}</span>
            <span class="ls-chip ${isUnlocked ? 'ls-chip-green' : 'ls-chip-dim'}">${isUnlocked ? 'RDY' : 'LOCKED'}</span>
            <span class="ls-micro">Tier ${tier}</span>
          </div>
          <div style="font-size:0.6875rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
            ${contract.objective}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0; font-family:var(--font-mono); font-size:0.6875rem;">
          ${!isUnlocked ? `<span style="color:var(--warn)">${gateStr}</span>` : ''}
          ${completed ? `<span style="color:var(--ok)">Best: ${formatM(completed.bestNetM)}</span>` : ''}
          <div style="display:flex; gap:6px; color:var(--text-muted)">
            <span>g: ${body.gravityMs2} m/s²</span>
            <span>Δv: ${reqDv ? `${reqDv} m/s` : '—'}</span>
          </div>
        </div>
      `;

      row.addEventListener('click', () => {
        if (!isUnlocked) return;
        selectedBodyId = body.id;
        selectedContractId = contract.id;
        renderMain();
      });

      mainCol.appendChild(row);
    }

    // ── Orbital map schematic
    const mapPanel = document.createElement('div');
    mapPanel.className = 'ls-panel';
    mapPanel.style.marginTop = 'var(--sp-3)';
    const selBody = getBody();
    const selBodyIdx = bodies.indexOf(selBody);
    const mSelBody = selBody as unknown as MetaBody;
    mapPanel.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Orbital Transfer Projection</span>
        <div style="display:flex; gap:1px;">
          ${['ALL','INNER','GAS GIANTS'].map(f => `<button class="ls-seg-btn ${f === 'ALL' ? 'is-active' : ''}" disabled style="font-size:0.5625rem; padding:2px 6px;">${f}</button>`).join('')}
        </div>
      </div>
      <div class="ls-panel-body" style="display:flex; justify-content:center; align-items:center; height:120px; gap:var(--sp-4);">
        <svg width="280" height="90" viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Sun -->
          <circle cx="20" cy="45" r="6" fill="#ffba3b" opacity="0.9"/>
          <!-- Orbits -->
          <ellipse cx="20" cy="45" rx="38" ry="11" stroke="var(--border)" stroke-width="1" fill="none"/>
          <ellipse cx="20" cy="45" rx="75" ry="20" stroke="var(--border)" stroke-width="1" fill="none"/>
          <ellipse cx="20" cy="45" rx="120" ry="32" stroke="var(--border)" stroke-width="1" fill="none"/>
          <ellipse cx="20" cy="45" rx="185" ry="44" stroke="var(--border)" stroke-width="1" fill="none" stroke-dasharray="3 3"/>
          <!-- Earth -->
          <circle cx="58" cy="45" r="4" fill="#61dda0"/>
          <text x="52" y="62" fill="var(--text-muted)" font-size="7" font-family="monospace">EARTH</text>
          <!-- Target body -->
          <circle cx="${75 + selBodyIdx * 48}" cy="45" r="5" fill="var(--accent)" opacity="0.9"/>
          <text x="${68 + selBodyIdx * 48}" y="62" fill="var(--accent)" font-size="7" font-family="monospace">${selBody.name.toUpperCase().substring(0, 6)}</text>
          <!-- Transfer arc -->
          <path d="M58 45 Q${90 + selBodyIdx * 24} 15 ${75 + selBodyIdx * 48} 45" stroke="var(--accent)" stroke-width="1" fill="none" stroke-dasharray="3 2"/>
        </svg>
        <div style="font-family:var(--font-mono); font-size:0.6875rem; color:var(--text-muted); display:flex; flex-direction:column; gap:4px;">
          <div>Distance <span style="color:var(--text); margin-left:4px;">${mSelBody.distanceAu !== undefined ? `${mSelBody.distanceAu} AU` : mSelBody.distanceFromEarthKm !== undefined ? `${mSelBody.distanceFromEarthKm} km` : '—'}</span></div>
          <div>Transit  <span style="color:var(--text); margin-left:4px;">${mSelBody.transitDays !== undefined ? `${mSelBody.transitDays} d` : mSelBody.transitTimeDays !== undefined ? `${mSelBody.transitTimeDays} d` : '—'}</span></div>
          <div>Δv-orbit <span style="color:var(--text); margin-left:4px;">${mSelBody.deltaVToOrbitMs !== undefined ? `${mSelBody.deltaVToOrbitMs} m/s` : '—'}</span></div>
        </div>
      </div>
    `;
    mainCol.appendChild(mapPanel);

    /* ── RIGHT COLUMN */

    const body = getBody();
    const contract = getContract();
    const mBody = body as unknown as MetaBody;
    const mContract = contract as unknown as MetaContract;

    // Body specs
    const specsSection = document.createElement('div');
    const escVel = mBody.escapeVelocityMs ? `${mBody.escapeVelocityMs} m/s` : '—';
    const tempRange = mBody.tempRangeC ?? (mBody.surfaceTempMinC !== undefined && mBody.surfaceTempMaxC !== undefined ? `${mBody.surfaceTempMinC}°C to ${mBody.surfaceTempMaxC}°C` : '—');
    const rotPeriod = mBody.rotationPeriodH ? `${mBody.rotationPeriodH} h` : mBody.rotationPeriodHours ? `${mBody.rotationPeriodHours} h` : '—';

    specsSection.innerHTML = `
      <div class="ls-micro" style="margin-bottom:var(--sp-2)">Body Specifications</div>
      <div class="ls-panel" style="margin-bottom:var(--sp-3)">
        <div class="ls-panel-header"><span class="ls-panel-title">${body.name}</span></div>
        <div class="ls-panel-body">
          ${[
            ['Surface Gravity', `${body.gravityMs2} m/s²`],
            ['Atmosphere', atmosphereLabel(body)],
            ['Solar Flux', solarLabel(body.solarFlux)],
            ['Mission Lifetime', `${(body.baseLifetimeS / 3600).toFixed(0)} h`],
            ['Escape Velocity', escVel],
            ['Temp Range', tempRange],
            ['Rotation Period', rotPeriod],
          ].map(([label, value]) => `
            <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid var(--border); font-size:0.6875rem;">
              <span style="color:var(--text-muted); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.06em">${label}</span>
              <span style="color:var(--text); font-family:var(--font-mono);">${value}</span>
            </div>`).join('')}
        </div>
      </div>
    `;

    // Operational constraints
    const notices = constraintNotices(body);
    if (notices.length) {
      const noticeDiv = document.createElement('div');
      noticeDiv.style.marginBottom = 'var(--sp-3)';
      noticeDiv.innerHTML = `<div class="ls-micro" style="margin-bottom:var(--sp-2)">Operational Constraints</div>`;
      for (const n of notices) {
        const a = document.createElement('div');
        a.className = 'ls-advisory';
        a.innerHTML = `<div class="ls-advisory-title">Notice</div>${n}`;
        noticeDiv.appendChild(a);
      }
      specsSection.appendChild(noticeDiv);
    }

    if (mContract.recommendedBaseline) {
      const baselineDiv = document.createElement('div');
      baselineDiv.className = 'ls-advisory info';
      baselineDiv.style.marginBottom = 'var(--sp-3)';
      const rb = mContract.recommendedBaseline;
      const margin = rb.minDeltaVMarginMs ?? rb.minDvMarginMs ?? 0;
      baselineDiv.innerHTML = `
        <div class="ls-advisory-title">Recommended Craft Baseline</div>
        Max Mass: ${(rb.maxWetMassKg ? (rb.maxWetMassKg / 1000).toFixed(1) : '—')} t · Min TWR: ${rb.minTwr ?? '—'}× · Min Δv Margin: ${margin} m/s
      `;
      specsSection.appendChild(baselineDiv);
    }

    rightCol.appendChild(specsSection);

    // Contract card
    const cardEl = document.createElement('div');
    cardEl.className = 'ls-panel';
    cardEl.style.marginBottom = 'var(--sp-3)';

    // sanitise funding gate display
    const gateDisplay = contract.fundingGateM > SANE_FUNDING_GATE_M
      ? 'Locked'
      : formatM(contract.fundingGateM);

    const cAccuracy = mContract.targetAccuracyM ? `±${mContract.targetAccuracyM} m` : '—';
    const cReqDv = (mContract.requiredDeltaVMs ?? mContract.requiredDeltaVms) ? `${(mContract.requiredDeltaVMs ?? mContract.requiredDeltaVms)} m/s` : '—';

    cardEl.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">Contract</span>
        <span class="ls-chip ls-chip-orange" data-tutorial="contract-brief">SELECTED</span>
      </div>
      <div class="ls-panel-body">
        <div style="font-weight:600; font-size:0.8125rem; color:var(--text); margin-bottom:var(--sp-2)">${contract.title}</div>
        <div style="font-size:0.6875rem; color:var(--text-muted); margin-bottom:var(--sp-3)">${contract.objective}</div>
        ${[
          ['Budget Cap', formatM(contract.budgetCapM)],
          ['Reward', formatM(contract.rewardM)],
          ['Funding Gate', gateDisplay],
          ['Accuracy Target', cAccuracy],
          ['Required Δv', cReqDv],
        ].map(([k, v]) => `
          <div style="display:flex; justify-content:space-between; font-size:0.6875rem; padding:3px 0; border-bottom:1px solid var(--border);">
            <span style="color:var(--text-muted); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.06em">${k}</span>
            <span style="color:var(--ok); font-family:var(--font-mono);">${v}</span>
          </div>`).join('')}
        <div style="margin-top:var(--sp-2)">
          <div class="ls-micro" style="margin-bottom:4px">Required Instruments</div>
          <div style="display:flex; gap:4px; flex-wrap:wrap">
            ${contract.requiredInstruments.map(i => `<span class="ls-chip ls-chip-green">${i}</span>`).join('')}
          </div>
        </div>
        ${contract.bonusObjectives?.length ? `
          <div style="margin-top:var(--sp-2)">
            <div class="ls-micro" style="margin-bottom:4px">Bonus Objectives</div>
            ${contract.bonusObjectives.map(b => `
              <div style="font-size:0.6875rem; color:var(--text-muted); padding:2px 0">
                +${formatM(b.extraRewardM)}: ${b.text}
              </div>`).join('')}
          </div>` : ''}
      </div>
    `;
    rightCol.appendChild(cardEl);
  }

  renderMain();
}
