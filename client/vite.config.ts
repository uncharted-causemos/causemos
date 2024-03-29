import { defineConfig, UserConfig } from 'vite';
import type { InlineConfig } from 'vitest';
import vue from '@vitejs/plugin-vue';
import * as path from 'path';

interface VitestConfig extends UserConfig {
  test: InlineConfig;
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~styles': path.resolve(__dirname, './src/styles'),
    },
  },
  base: '/app/',
  server: {
    host: '127.0.0.1',
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'esnext',
  },
  preview: {
    port: 8080,
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // treat all components starting with `facet` as custom elements
          // ignore facets as custom elements
          isCustomElement: (tag) => tag.startsWith('facet-'),
        },
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Silence deprecation warnings for node_modules
        // Particularly relevant for the / Division Operator breaking change:
        //  https://sass-lang.com/documentation/breaking-changes/slash-div
        quietDeps: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom', // alternative to jsdom which focuses heavily on performance
    coverage: {
      all: false, // Set to true to see the coverage for all files including the files without any tests.
      provider: 'v8',
      exclude: [],
    },
  },
} as VitestConfig);
