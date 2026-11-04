import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { designTokensPlugin } from './design-tokens.ts';

export default defineConfig({
  plugins: [designTokensPlugin(), viteSingleFile()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 100000000, cssCodeSplit: false },
});
