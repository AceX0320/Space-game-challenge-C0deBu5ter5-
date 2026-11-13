/**
 * Render a labelled progress/meter bar.
 */
export function createMeter(
  label: string,
  current: number,
  max: number,
  unit = '',
  color = 'var(--primary)'
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'meter-container';

  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;

  container.innerHTML = `
    <div class="meter-header">
      <span class="meter-label">${label}</span>
      <span class="meter-val">${current.toFixed(1)} / ${max.toFixed(1)} ${unit} (${pct.toFixed(0)}%)</span>
    </div>
    <div class="meter-bar">
      <div class="meter-fill" style="width: ${pct}%; background-color: ${color}"></div>
    </div>
  `;

  return container;
}

