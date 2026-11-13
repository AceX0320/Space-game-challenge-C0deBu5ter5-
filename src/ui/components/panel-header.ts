export function createPanelHeader(title: string, rightContent?: HTMLElement | string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'ls-panel-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'ls-panel-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  if (rightContent) {
    if (typeof rightContent === 'string') {
      const rightSpan = document.createElement('span');
      rightSpan.innerHTML = rightContent;
      header.appendChild(rightSpan);
    } else {
      header.appendChild(rightContent);
    }
  }

  return header;
}
