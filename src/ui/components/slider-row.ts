import type { ParamSpec } from '@/types';

export function createSliderRow(
  spec: ParamSpec,
  currentValue: number,
  onChange: (val: number) => void,
  tutorialId?: string
): HTMLElement {
  const row = document.createElement('div');
  row.style.marginBottom = 'var(--ls-sp-2)';

  const pct = spec.max > spec.min ? ((currentValue - spec.min) / (spec.max - spec.min)) * 100 : 0;
  const nomPct = spec.max > spec.min ? ((spec.default - spec.min) / (spec.max - spec.min)) * 100 : 0;

  row.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-size:var(--ls-size-xs); margin-bottom:3px;">
      <span style="color:var(--ls-text-dim)" title="${spec.explain}">${spec.label}</span>
      <span class="slider-display" style="font-family:var(--ls-font-mono); color:var(--ls-text)">${currentValue.toFixed(2)} ${spec.unit}</span>
    </div>
    <div style="position:relative; height:6px; background:var(--bg-inset); border:1px solid var(--border); border-radius:0; margin-bottom:2px;">
      <div class="slider-fill" style="position:absolute; left:0; top:0; height:100%; width:${pct.toFixed(0)}%; background:var(--accent); border-radius:0;"></div>
      <div style="position:absolute; left:${nomPct.toFixed(0)}%; top:-3px; width:1px; height:12px; background:var(--ok);" title="Nominal: ${spec.default}"></div>
    </div>
    <input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${currentValue}"
      style="width:100%; accent-color:var(--ls-orange); height:3px;" ${tutorialId ? `data-tutorial="${tutorialId}"` : ''} />
    <div style="display:flex; justify-content:space-between; font-family:var(--ls-font-mono); font-size:0.6rem; color:var(--ls-text-micro);">
      <span>${spec.min}</span>
      <span style="color:var(--ls-green)">NOM ${spec.default}</span>
      <span>${spec.max}</span>
    </div>
  `;

  const input = row.querySelector('input') as HTMLInputElement;
  const display = row.querySelector('.slider-display') as HTMLElement;
  const fill = row.querySelector('.slider-fill') as HTMLElement;

  input.addEventListener('input', () => {
    const val = Number(input.value);
    display.textContent = `${val.toFixed(2)} ${spec.unit}`;
    const newPct = spec.max > spec.min ? ((val - spec.min) / (spec.max - spec.min)) * 100 : 0;
    fill.style.width = `${newPct.toFixed(0)}%`;
    onChange(val);
  });

  return row;
}
