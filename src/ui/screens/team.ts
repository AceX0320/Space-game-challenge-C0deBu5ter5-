import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { createPanel } from '@/ui/components/panel';
import type { TeamRole } from '@/types';
import { addDesignFlag, setTeamRole } from '@/state/actions';

export function renderTeam(root: HTMLElement, state: GameState): void {
  root.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'screen-container';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <div>
      <h1>Flight Readiness Team Review (Hot-Seat Mode)</h1>
      <p style="color:var(--text-dim)">Collaborative mission review for up to 4 players</p>
    </div>
    <div>
      <button class="primary" id="btn-back-home">← Return Home</button>
    </div>
  `;
  container.appendChild(header);

  const roles: { role: TeamRole; title: string; caresAbout: string }[] = [
    {
      role: 'director',
      title: 'Mission Director',
      caresAbout: 'Strategic budget cap, scientific goals, and Go/No-Go authority',
    },
    {
      role: 'engineer',
      title: 'Spacecraft Engineer',
      caresAbout: 'Structural mass, delta-V, thrust-to-weight, and landing gear stability',
    },
    {
      role: 'science',
      title: 'Science Lead',
      caresAbout: 'Instrument payload suite, sampling capabilities, and data volume',
    },
    {
      role: 'operations',
      title: 'Operations Lead',
      caresAbout: 'Power balance in shadow, downlink throughput, and part wear/reliability',
    },
  ];

  const rolesGrid = document.createElement('div');
  rolesGrid.className = 'grid-2';

  for (const r of roles) {
    const isCurrent = state.team.currentRole === r.role;
    const card = createPanel(
      `${r.title} ${isCurrent ? '⭐ (Active Player)' : ''}`,
      `
      <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:1rem">${r.caresAbout}</p>
      <div>
        <button class="${isCurrent ? 'accent' : ''}" data-role="${r.role}">
          ${isCurrent ? 'Current Role Active' : 'Switch to this Role'}
        </button>
      </div>
      `
    );
    rolesGrid.appendChild(card);
  }
  container.appendChild(rolesGrid);

  // Flags Panel
  const flagsPanel = createPanel(
    'Engineering & Scientific Concern Flags',
    `
    <div style="margin-bottom:1rem">
      ${
        state.team.flags.length > 0
          ? state.team.flags
              .map(
                (f) => `
                <div style="background:#1e293b; border-left:3px solid var(--warning); padding:0.5rem 0.75rem; margin-bottom:0.4rem; border-radius:0 4px 4px 0">
                  <div style="display:flex; justify-content:space-between">
                    <strong>[${f.role.toUpperCase()}]</strong>
                    <span>${f.resolved ? '✓ Resolved' : f.acceptedAsRisk ? '⚠️ Risk Accepted' : '🚩 Open Concern'}</span>
                  </div>
                  <div style="font-size:0.85rem">${f.text}</div>
                </div>
              `
              )
              .join('')
          : '<p style="color:var(--text-dim)">No active concern flags raised. Team alignment is 100%.</p>'
      }
    </div>
    <div style="display:flex; gap:0.5rem">
      <input type="text" id="flag-input" placeholder="Raise engineering concern (e.g. low TWR margin)..." style="flex:1; background:#0f172a; border:1px solid var(--border); color:white; padding:0.4rem 0.8rem; border-radius:4px" />
      <button class="primary" id="btn-raise-flag">Raise Concern Flag</button>
    </div>
    `
  );
  container.appendChild(flagsPanel);

  root.appendChild(container);

  root.querySelector('#btn-back-home')?.addEventListener('click', () => {
    transitionTo('home');
  });

  root.querySelectorAll('button[data-role]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const role = (e.currentTarget as HTMLElement).getAttribute('data-role') as TeamRole;
      if (role) {
        setTeamRole(role);
      }
    });
  });

  root.querySelector('#btn-raise-flag')?.addEventListener('click', () => {
    const input = root.querySelector('#flag-input') as HTMLInputElement;
    if (input && input.value.trim()) {
      addDesignFlag(input.value.trim());
      input.value = '';
    }
  });
}
