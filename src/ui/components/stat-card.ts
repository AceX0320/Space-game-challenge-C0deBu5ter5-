export interface StatCardOptions {
  status?: 'ok' | 'warn' | 'bad' | 'info';
  subtext?: string;
  tooltip?: string;
}

export function createStatCard(label: string, value: string, opts: StatCardOptions = {}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'ls-stat';

  const statusClass = opts.status ? ` ${opts.status}` : '';

  card.innerHTML = `
    <span class="ls-stat-label" ${opts.tooltip ? `title="${opts.tooltip}"` : ''}>${label}</span>
    <span class="ls-stat-value${statusClass}">${value}</span>
    ${opts.subtext ? `<span class="ls-stat-sub">${opts.subtext}</span>` : ''}
  `;

  return card;
}
