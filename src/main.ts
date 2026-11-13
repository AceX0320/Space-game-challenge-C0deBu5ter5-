import '@/ui/styles/base.css';
import { DEFAULT_FLAGS } from '@/config/feature-flags';
import { getStore, initStore } from '@/state/store';
import { renderRouter } from '@/ui/router';
import { getBodies, getContracts, getItems, getParts, getResearch } from '@/data/index';

async function bootstrap(): Promise<void> {
  // Validate all static data at startup — throws with a clear message on bad data
  getBodies();
  getContracts();
  getParts();
  getItems();
  getResearch();

  initStore(DEFAULT_FLAGS);

  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('Missing #app element in index.html');

  // Subscribe to state changes and re-render
  getStore().subscribe(() => {
    renderRouter(appEl, getStore().getState());
  });

  // Initial render
  renderRouter(appEl, getStore().getState());
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal initialization error:', err);
  document.body.innerHTML = `<pre style="color:red;padding:1rem;background:#1e1e1e">${String(err)}</pre>`;
});

