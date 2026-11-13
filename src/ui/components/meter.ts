/**
 * Render a single or two-tone progress/meter bar matching Launchsmith design tokens.
 */
export function createMeter(
  label: string,
  current: number,
  max: number,
  unit = '',
  status: 'ok' | 'warn' | 'bad' | 'info' | 'orange' | string = 'ok'
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ls-meter';

  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;

  let colorClass = 'ok';
  let inlineColor = '';
  if (['ok', 'warn', 'bad', 'info', 'orange'].includes(status)) {
    colorClass = status;
  } else if (status.startsWith('#') || status.startsWith('rgb') || status.startsWith('var')) {
    inlineColor = `background-color: ${status};`;
  }

  container.innerHTML = `
    <div class="ls-meter-row">
      <span class="ls-meter-label">${label}</span>
      <span class="ls-meter-value">${current.toFixed(1)} / ${max.toFixed(1)} ${unit} (${pct.toFixed(0)}%)</span>
    </div>
    <div class="ls-meter-track">
      <div class="ls-meter-fill ${colorClass}" style="width: ${pct}%; ${inlineColor}"></div>
    </div>
  `;

  return container;
}

export function createTwoToneMeter(
  label: string,
  valA: number,
  valB: number,
  total: number,
  unit = '',
  labels: { a: string; b: string } = { a: 'A', b: 'B' }
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ls-meter';

  const pctA = total > 0 ? Math.min(100, Math.max(0, (valA / total) * 100)) : 0;
  const pctB = total > 0 ? Math.min(100 - pctA, Math.max(0, (valB / total) * 100)) : 0;

  container.innerHTML = `
    <div class="ls-meter-row">
      <span class="ls-meter-label">${label}</span>
      <span class="ls-meter-value">${labels.a}: ${valA.toFixed(1)} | ${labels.b}: ${valB.toFixed(1)} ${unit}</span>
    </div>
    <div class="ls-meter-track two-tone" style="height: 6px;">
      <div class="seg-a" style="width: ${pctA.toFixed(1)}%; height: 100%;"></div>
      <div class="seg-b" style="width: ${pctB.toFixed(1)}%; height: 100%;"></div>
    </div>
  `;

  return container;
}
