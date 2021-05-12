/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// This is required because the `vue3-resize` module doesn't contain types
declare module 'vue3-resize';
