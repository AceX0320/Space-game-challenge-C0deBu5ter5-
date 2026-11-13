/**
 * Create a stylized container panel.
 */
export function createPanel(title?: string, contentHtml = ''): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'panel';

  if (title) {
    const heading = document.createElement('div');
    heading.className = 'panel-title';
    heading.textContent = title;
    panel.appendChild(heading);
  }

  if (contentHtml) {
    const body = document.createElement('div');
    body.className = 'panel-body';
    body.innerHTML = contentHtml;
    panel.appendChild(body);
  }

  return panel;
}

