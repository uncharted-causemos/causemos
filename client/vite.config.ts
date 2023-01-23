import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
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
        quietDeps: true,
      },
    },
  },
});
