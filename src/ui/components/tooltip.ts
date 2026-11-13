/**
 * Attach a design-token tooltip to an element or create a tooltip wrapper.
 */
export function createTooltip(triggerText: string, tooltipText: string): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'ls-tooltip-wrap';
  wrap.innerHTML = `
    <span>${triggerText}</span>
    <span class="ls-tooltip-box">${tooltipText}</span>
  `;
  return wrap;
}

export function attachTooltip(target: HTMLElement, text: string): void {
  target.title = text;
}
