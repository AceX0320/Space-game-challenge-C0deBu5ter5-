/**
 * Attach a tooltip helper element.
 */
export function createTooltip(text: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'tooltip-icon';
  span.title = text;
  span.textContent = ' ℹ️';
  span.style.cursor = 'help';
  span.style.fontSize = '0.85em';
  return span;
}
