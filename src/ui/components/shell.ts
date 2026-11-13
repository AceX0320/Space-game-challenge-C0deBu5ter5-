/**
 * Shared App Shell — header + footer wrapping every screen.
 * Implements the Figma Scavenge frame (25:4268) canonical shell spec.
 */
import type { GamePhase } from '@/types';
import type { GameState } from '@/state/store';
import { transitionTo } from '@/state/flow';

/** Ordered steps shown in the step-tab bar */
const STEPS: { phase: GamePhase; label: string; num: string }[] = [
  { phase: 'contracts',  label: 'Mission Select', num: '00' },
  { phase: 'hangar',     label: 'Hangar',          num: '01' },
  { phase: 'preflight',  label: 'Pre-flight',      num: '02' },
  { phase: 'flight',     label: 'Flight',           num: '03' },
  { phase: 'scavenge',   label: 'Scavenge',         num: '04' },
  { phase: 'results',    label: 'Results',          num: '05' },
];

/** Phases that have been reached (allowing tab clicks) */
const PHASE_ORDER: GamePhase[] = [
  'home', 'contracts', 'hangar', 'preflight', 'flight', 'scavenge', 'results', 'research', 'team'
];

function phaseIndex(p: GamePhase): number {
  return PHASE_ORDER.indexOf(p);
}

function formatFunds(m: number): string {
  return `$${m.toFixed(1)}M`;
}

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

  // Step tabs
  const tabs = document.createElement('nav');
  tabs.className = 'ls-step-tabs';

  const curIdx = phaseIndex(state.phase);
  for (const step of STEPS) {
    const stepIdx = phaseIndex(step.phase);
    const isDone = stepIdx < curIdx;
    const isActive = step.phase === state.phase;
    const isClickable = isDone && step.phase !== state.phase;

    const tab = document.createElement('button');
    tab.className = [
      'ls-step-tab',
      isDone ? 'is-done' : '',
      isActive ? 'is-active' : '',
      isClickable ? 'is-clickable' : '',
    ].filter(Boolean).join(' ');
    tab.innerHTML = `<span class="ls-step-num">${step.num}</span>${step.label}`;
    tab.title = step.label;

    if (isClickable) {
      tab.addEventListener('click', () => transitionTo(step.phase));
    }
    tabs.appendChild(tab);
  }
  header.appendChild(tabs);

  // Difficulty segmented control (locked once mission starts)
  const isMidMission = ['hangar', 'preflight', 'flight', 'scavenge'].includes(state.phase);
  const diffs: Array<{ key: string; label: string }> = [
    { key: 'easy', label: 'Easy' },
    { key: 'normal', label: 'Normal' },
    { key: 'hard', label: 'Hard' },
    { key: 'sandbox', label: 'Sandbox' },
  ];
  const seg = document.createElement('div');
  seg.className = 'ls-seg-ctrl';
  for (const d of diffs) {
    const btn = document.createElement('button');
    btn.className = `ls-seg-btn${state.save.difficulty === d.key ? ' is-active' : ''}`;
    btn.textContent = d.label;
    btn.disabled = isMidMission;
    btn.title = isMidMission ? 'Cannot change difficulty mid-mission' : '';
    seg.appendChild(btn);
  }
  header.appendChild(seg);

  // Funds
  const funds = document.createElement('div');
  funds.className = 'ls-funds';
  funds.textContent = formatFunds(state.save.fundsM);
  header.appendChild(funds);

  // Icon buttons
  for (const [icon, title] of [['🔇', 'Sound'], ['⏸', 'Pause'], ['⚙', 'Settings']]) {
    const btn = document.createElement('button');
    btn.className = 'ls-icon-btn';
    btn.textContent = icon;
    btn.title = title;
    header.appendChild(btn);
  }

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
    center.innerHTML = `
      <div class="ls-craft-pill">
        <span class="ls-pill-dot ${dotClass}"></span>
        <span>${opts.craftName}</span>
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
  btn.className = 'ls-btn ls-btn-primary';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

/** Create a secondary button */
export function mkSecondary(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'ls-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
