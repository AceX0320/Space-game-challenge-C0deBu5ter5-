import { defineConfig } from 'vite';
import { resolve } from 'path';

const base = process.env['VITE_BASE'] ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: { outDir: 'dist', sourcemap: true },
});
