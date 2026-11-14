export interface ModalAction {
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

export function showModal(
  title: string,
  content: HTMLElement | string,
  actions: ModalAction[] = []
): () => void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--ls-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  const box = document.createElement('div');
  box.className = 'ls-panel';
  box.style.cssText = `
    max-width: 500px;
    width: 90%;
    border-radius: 0;
  `;

  const header = document.createElement('div');
  header.className = 'ls-panel-header';
  header.innerHTML = `
    <span class="ls-panel-title">${title}</span>
    <button class="ls-btn ls-btn-ghost" style="padding:2px 6px; font-size:0.8rem" id="modal-close-btn">✕</button>
  `;
  box.appendChild(header);

  const body = document.createElement('div');
  body.className = 'ls-panel-body';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else {
    body.appendChild(content);
  }
  box.appendChild(body);

  if (actions.length > 0) {
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: var(--ls-sp-2);
      padding: var(--ls-sp-2) var(--ls-sp-3);
      border-top: 1px solid var(--ls-border);
      background: var(--ls-panel-alt);
    `;
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.className = `ls-btn${act.primary ? ' ls-btn-primary' : ''}`;
      btn.textContent = act.label;
      btn.addEventListener('click', () => {
        close();
        act.onClick?.();
      });
      footer.appendChild(btn);
    }
    box.appendChild(footer);
  }

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  header.querySelector('#modal-close-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return close;
}
