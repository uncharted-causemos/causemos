/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// This is required because the `vue3-resize` & `v-tooltip` modules don't contain types
declare module 'vue3-resize';
declare module 'v-tooltip';

declare module 'vsup';

declare module 'uuid';

declare module 'file-saver';
