import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      legacy({
        targets: ['chrome >= 53', 'edge >= 79', 'firefox >= 60', 'safari >= 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
        renderLegacyChunks: true,
      }),
    ],
    build: {
      target: ['chrome68', 'edge79', 'firefox67', 'safari12', 'es2015'],
      cssTarget: 'chrome61',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
