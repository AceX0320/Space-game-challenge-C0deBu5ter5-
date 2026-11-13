import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import type { TeamRole } from '@/types';
import { addDesignFlag, setTeamRole } from '@/state/actions';
import { renderShell, mkPrimary, mkSecondary } from '@/ui/components/shell';
import { getStore } from '@/state/store';

export function renderTeam(root: HTMLElement, state: GameState): void {
  // Respect feature flag: hide team when teamMode is false
  if (!state.flags.teamMode) {
    transitionTo('home');
    return;
  }

  const ctaBtn = mkPrimary('Proceed to Assembly →', () => transitionTo('hangar'));
  const backHomeBtn = mkSecondary('← Home', () => transitionTo('home'));

  const bodyEl = renderShell(root, state, {
    leftActions: [backHomeBtn],
    rightCta: ctaBtn,
    craftName: state.design.name,
    craftStatus: 'nominal',
  });
  bodyEl.style.display = 'flex';
  bodyEl.style.flexDirection = 'column';
  bodyEl.style.padding = 'var(--ls-sp-4)';
  bodyEl.style.gap = 'var(--ls-sp-4)';
  bodyEl.style.overflowY = 'auto';

  const roles: { role: TeamRole; title: string; caresAbout: string; icon: string }[] = [
    {
      role: 'director',
      title: 'Mission Director',
      caresAbout: 'Strategic budget cap, scientific goals, and Go/No-Go launch authority',
      icon: '🎖️',
    },
    {
      role: 'engineer',
      title: 'Spacecraft Engineer',
      caresAbout: 'Structural mass, delta-V, thrust-to-weight, and landing gear stability',
      icon: '🛠️',
    },
    {
      role: 'science',
      title: 'Science Lead',
      caresAbout: 'Instrument payload suite, sampling capabilities, and data volume',
      icon: '🔬',
    },
    {
      role: 'operations',
      title: 'Operations Lead',
      caresAbout: 'Power balance in shadow, downlink throughput, and part wear/reliability',
      icon: '📡',
    },
  ];

  // Roles Grid
  const rolesGrid = document.createElement('div');
  rolesGrid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:var(--ls-sp-3);';

  for (const r of roles) {
    const isCurrent = state.team.currentRole === r.role;
    const card = document.createElement('div');
    card.className = 'ls-panel';
    card.style.cssText = `border-color: ${isCurrent ? 'var(--ls-orange)' : 'var(--ls-border)'}; background: ${isCurrent ? 'rgba(255,90,31,0.05)' : 'var(--ls-panel)'};`;

    card.innerHTML = `
      <div class="ls-panel-header">
        <span class="ls-panel-title">${r.icon} ${r.title}</span>
        ${isCurrent ? '<span class="ls-chip ls-chip-orange">ACTIVE</span>' : ''}
      </div>
      <div class="ls-panel-body" style="display:flex; flex-direction:column; justify-content:space-between; min-height:120px;">
        <p style="font-size:var(--ls-size-xs); color:var(--ls-text-dim); line-height:1.5; margin-bottom:var(--ls-sp-3);">
          ${r.caresAbout}
        </p>
        <button class="ls-btn ${isCurrent ? 'ls-btn-primary' : ''}" data-role="${r.role}" style="width:100%; justify-content:center;">
          ${isCurrent ? 'Current Role Active' : 'Switch to this Role'}
        </button>
      </div>
    `;
    rolesGrid.appendChild(card);
  }
  bodyEl.appendChild(rolesGrid);

  // Flags Panel
  const flagsPanel = document.createElement('div');
  flagsPanel.className = 'ls-panel';
  flagsPanel.innerHTML = `
    <div class="ls-panel-header">
      <span class="ls-panel-title">Engineering & Scientific Concern Flags</span>
      <span class="ls-micro">${state.team.flags.length} active flags</span>
    </div>
    <div class="ls-panel-body">
      <div style="margin-bottom:var(--ls-sp-3); max-height:220px; overflow-y:auto;">
        ${
          state.team.flags.length > 0
            ? state.team.flags
                .map(
                  (f) => `
                  <div class="ls-advisory ${f.resolved ? 'ok' : f.acceptedAsRisk ? '' : 'error'}" style="margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                      <span class="ls-advisory-title">[${f.role.toUpperCase()}]</span>
                      <span class="ls-micro" style="color:var(--ls-text)">${f.resolved ? '✓ Resolved' : f.acceptedAsRisk ? '⚠️ Risk Accepted' : '🚩 Open Concern'}</span>
                    </div>
                    <div style="font-size:var(--ls-size-xs)">${f.text}</div>
                  </div>
                `
                )
                .join('')
            : '<div style="color:var(--ls-text-dim); font-size:var(--ls-size-xs)">No active concern flags raised. Team alignment is 100%.</div>'
        }
      </div>
      <div style="display:flex; gap:var(--ls-sp-2)">
        <input type="text" id="flag-input" placeholder="Raise engineering concern (e.g. low TWR margin, power deficit)..."
          style="flex:1; background:var(--ls-surface); border:1px solid var(--ls-border); color:var(--ls-text); padding:6px 10px; border-radius:var(--ls-radius-sm); font-size:var(--ls-size-xs); font-family:var(--ls-font-mono);" />
        <button class="ls-btn ls-btn-primary" id="btn-raise-flag">Raise Concern</button>
      </div>
    </div>
  `;
  bodyEl.appendChild(flagsPanel);

  rolesGrid.querySelectorAll('button[data-role]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const role = (e.currentTarget as HTMLElement).getAttribute('data-role') as TeamRole;
      if (role) {
        setTeamRole(role);
        renderTeam(root, getStore().getState());
      }
    });
  });

  flagsPanel.querySelector('#btn-raise-flag')?.addEventListener('click', () => {
    const input = flagsPanel.querySelector('#flag-input') as HTMLInputElement;
    if (input && input.value.trim()) {
      addDesignFlag(input.value.trim());
      input.value = '';
      renderTeam(root, getStore().getState());
    }
  });
}
