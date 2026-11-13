export interface SegmentOption {
  key: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

export function createSegmentedControl(
  options: SegmentOption[],
  activeKey: string,
  onChange?: (key: string) => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ls-seg-ctrl';

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.className = `ls-seg-btn${opt.key === activeKey ? ' is-active' : ''}`;
    btn.textContent = opt.label;
    if (opt.disabled) btn.disabled = true;
    if (opt.title) btn.title = opt.title;

    btn.addEventListener('click', () => {
      if (opt.disabled || opt.key === activeKey) return;
      container.querySelectorAll('.ls-seg-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      onChange?.(opt.key);
    });

    container.appendChild(btn);
  }

  return container;
}
