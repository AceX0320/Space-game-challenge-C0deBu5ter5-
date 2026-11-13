import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

const base = process.env['VITE_BASE'] ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist', sourcemap: true },
});
