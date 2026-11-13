export type AdvisorySeverity = 'ok' | 'info' | 'warning' | 'error';

export function createAdvisoryCard(
  title: string,
  message: string,
  severity: AdvisorySeverity = 'warning'
): HTMLElement {
  const card = document.createElement('div');
  const cls = severity === 'warning' ? '' : ` ${severity}`;
  card.className = `ls-advisory${cls}`;

  card.innerHTML = `
    <div class="ls-advisory-title">${title}</div>
    <div>${message}</div>
  `;

  return card;
}
