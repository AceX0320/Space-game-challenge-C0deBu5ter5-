export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  id?: string;
  tutorialId?: string;
  className?: string;
}

export function createButton(label: string, opts: ButtonOptions = {}): HTMLButtonElement {
  const btn = document.createElement('button');
  const variant = opts.variant ?? 'secondary';

  if (variant === 'primary') {
    btn.className = 'ls-btn ls-btn-primary';
  } else if (variant === 'ghost') {
    btn.className = 'ls-btn ls-btn-ghost';
  } else {
    btn.className = 'ls-btn';
    if (variant === 'danger') {
      btn.style.borderColor = 'var(--ls-red)';
      btn.style.color = 'var(--ls-red)';
    }
  }

  if (opts.className) {
    btn.className += ` ${opts.className}`;
  }

  btn.textContent = label;
  if (opts.id) btn.id = opts.id;
  if (opts.disabled) btn.disabled = true;
  if (opts.tutorialId) btn.setAttribute('data-tutorial', opts.tutorialId);

  if (opts.onClick) {
    btn.addEventListener('click', opts.onClick);
  }

  return btn;
}
