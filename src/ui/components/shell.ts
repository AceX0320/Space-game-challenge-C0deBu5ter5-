/**
 * Shared App Shell — header + footer wrapping every screen.
 * Implements the Figma spec from antigravity-ui-restyle-prompt.md.
 * No emoji — SVG line icons only (1.5px stroke).
 */
import type { GamePhase, Difficulty } from '@/types';
import type { GameState } from '@/state/store';
import { getStore } from '@/state/store';
import { transitionTo } from '@/state/flow';
import { writeSave } from '@/economy/save-load';
import { STARTING_FUNDS_M } from '@/config/constants';

/** Ordered steps shown in the step-nav bar */
const STEPS: { phase: GamePhase; label: string; num: string }[] = [
  { phase: 'contracts',  label: 'Mission Select', num: '00' },
  { phase: 'hangar',     label: 'Hangar',          num: '01' },
  { phase: 'preflight',  label: 'Pre-flight',      num: '02' },
  { phase: 'flight',     label: 'Flight',           num: '03' },
  { phase: 'scavenge',   label: 'Scavenge',         num: '04' },
  { phase: 'results',    label: 'Results',          num: '05' },
];

const PHASE_ORDER: GamePhase[] = [
  'home', 'contracts', 'hangar', 'preflight', 'flight', 'scavenge', 'results', 'research', 'team'
];

function phaseIndex(p: GamePhase): number {
  return PHASE_ORDER.indexOf(p);
}

function formatFunds(m: number): string {
  return `$${m.toFixed(1)}M`;
}

// SVG icons — 1.5px stroke, 16×16 viewBox
const SVG_CHECK = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <polyline points="2,8 6,13 14,4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVG_SOUND_ON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <polygon points="2,5 6,5 10,2 10,14 6,11 2,11" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
  <path d="M12 5.5 C13.5 6.5 13.5 9.5 12 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const SVG_PAUSE = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="4" y="3" width="3" height="10" rx="0.5" stroke="currentColor" stroke-width="1.5"/>
  <rect x="9" y="3" width="3" height="10" rx="0.5" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

const SVG_SETTINGS = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/>
  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

let lastRenderedFundsM: number | null = null;

export interface ShellOptions {
  /** Left footer buttons */
  leftActions?: HTMLElement[];
  /** Right footer CTA */
  rightCta?: HTMLElement;
  /** Craft name + status for centre pill */
  craftName?: string;
  craftStatus?: 'nominal' | 'warning' | 'error';
}

/**
 * Renders the shell (header + footer) around a screen root element.
 * Returns the main content area where the screen should render.
 */
export function renderShell(
  appRoot: HTMLElement,
  state: GameState,
  opts: ShellOptions = {}
): HTMLElement {
  appRoot.innerHTML = '';
  appRoot.className = 'ls-screen';

  /* ── Header ────────────────────────────────────────────────────────── */
  const header = document.createElement('header');
  header.className = 'ls-header';

  // Wordmark
  const wordmark = document.createElement('div');
  wordmark.className = 'ls-wordmark';
  wordmark.innerHTML = `LAUNCHSMITH<span class="ls-version">v0.9.4</span>`;
  header.appendChild(wordmark);

  // Step nav — bordered group with separators
  const tabs = document.createElement('nav');
  tabs.className = 'ls-step-tabs';
  tabs.setAttribute('aria-label', 'Mission steps');

  const curIdx = phaseIndex(state.phase);
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]!;
    const stepIdx = phaseIndex(step.phase);
    const isDone = stepIdx < curIdx;
    const isActive = step.phase === state.phase;
    const isClickable = isDone && !isActive;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = [
      'ls-step-tab',
      isDone ? 'is-done' : '',
      isActive ? 'is-active' : '',
      isClickable ? 'is-clickable' : '',
    ].filter(Boolean).join(' ');
    tab.setAttribute('aria-disabled', isActive || (!isDone && !isActive) ? 'true' : 'false');
    tab.setAttribute('aria-current', isActive ? 'step' : 'false');
    tab.title = step.label;

    tab.innerHTML = `
      <span class="ls-step-num">${step.num}</span>
      ${isDone ? `<span class="ls-step-check">${SVG_CHECK}</span>` : ''}
      ${step.label}
    `;

    if (isClickable) {
      tab.addEventListener('click', () => transitionTo(step.phase));
    }

    tabs.appendChild(tab);
  }
  header.appendChild(tabs);

  // Difficulty segmented control (locked only during active flight / scavenge simulation)
  const isMidMission = ['flight', 'scavenge'].includes(state.phase);
  const diffs: Array<{ key: Difficulty; label: string }> = [
    { key: 'easy', label: 'Easy' },
    { key: 'normal', label: 'Normal' },
    { key: 'hard', label: 'Hard' },
    { key: 'sandbox', label: 'Sandbox' },
  ];
  const seg = document.createElement('div');
  seg.className = 'ls-seg-ctrl';
  for (const d of diffs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ls-seg-btn${state.save.difficulty === d.key ? ' is-active' : ''}`;
    btn.textContent = d.label;
    btn.disabled = isMidMission;
    btn.title = isMidMission ? 'Cannot change difficulty mid-flight' : `Switch mode to ${d.label}`;
    if (!isMidMission) {
      btn.addEventListener('click', () => {
        const store = getStore();
        const cur = store.getState();
        if (cur.save.difficulty === d.key) return;
        const updatedSave = {
          ...cur.save,
          difficulty: d.key,
          fundsM: STARTING_FUNDS_M[d.key] ?? 60,
        };
        writeSave(updatedSave);
        store.update({ save: updatedSave });
      });
    }
    seg.appendChild(btn);
  }
  header.appendChild(seg);

  // Funds chip with count / change transition
  const funds = document.createElement('div');
  funds.className = 'ls-funds';
  funds.style.cssText = 'padding: 4px 12px; gap: 8px; border: 1px solid var(--border);';
  
  const fundsLabel = document.createElement('span');
  fundsLabel.className = 'ls-funds-label';
  fundsLabel.textContent = 'Funds';
  funds.appendChild(fundsLabel);

  const amountEl = document.createElement('span');
  amountEl.className = 'ls-funds-amount';
  amountEl.textContent = formatFunds(state.save.fundsM);
  funds.appendChild(amountEl);

  if (lastRenderedFundsM !== null && lastRenderedFundsM !== state.save.fundsM) {
    const isReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (!isReduced) {
      amountEl.style.color = state.save.fundsM > lastRenderedFundsM ? 'var(--ok)' : 'var(--danger)';
      amountEl.style.transform = 'scale(1.15)';
      setTimeout(() => {
        amountEl.style.transform = 'scale(1)';
        amountEl.style.color = 'var(--ok)';
      }, 300);
    }
  }
  lastRenderedFundsM = state.save.fundsM;

  header.appendChild(funds);

  // 3× icon buttons — SVG, no emoji
  const iconDefs: [string, string][] = [
    [SVG_SOUND_ON, 'Sound'],
    [SVG_PAUSE, 'Pause'],
    [SVG_SETTINGS, 'Settings'],
  ];
  for (const [svg, title] of iconDefs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ls-icon-btn';
    btn.innerHTML = svg;
    btn.title = title;
    header.appendChild(btn);
  }

  // Avatar circle
  const avatar = document.createElement('div');
  avatar.className = 'ls-avatar';
  avatar.textContent = 'AG';
  avatar.title = 'Agency Commander';
  header.appendChild(avatar);

  appRoot.appendChild(header);

  /* ── Content area ──────────────────────────────────────────────────── */
  const body = document.createElement('div');
  body.className = 'ls-body';
  appRoot.appendChild(body);

  /* ── Footer ────────────────────────────────────────────────────────── */
  const footer = document.createElement('footer');
  footer.className = 'ls-footer';

  const left = document.createElement('div');
  left.className = 'ls-footer-left';
  for (const el of opts.leftActions ?? []) left.appendChild(el);
  footer.appendChild(left);

  const center = document.createElement('div');
  center.className = 'ls-footer-center';
  if (opts.craftName) {
    const dotClass = opts.craftStatus === 'warning' ? 'warn' : opts.craftStatus === 'error' ? 'error' : '';
    const name = opts.craftName.replace(/</g, '&lt;');
    center.innerHTML = `
      <div class="ls-craft-pill">
        <span class="ls-pill-dot ${dotClass}"></span>
        <span>${name}</span>
      </div>`;
  }
  footer.appendChild(center);

  const right = document.createElement('div');
  right.className = 'ls-footer-right';
  if (opts.rightCta) right.appendChild(opts.rightCta);
  footer.appendChild(right);

  appRoot.appendChild(footer);

  return body;
}

/** Create a primary CTA button */
export function mkPrimary(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ls-btn ls-btn-primary';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

/** Create a secondary button */
export function mkSecondary(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ls-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
