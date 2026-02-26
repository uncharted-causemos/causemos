import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import FloatingVue from 'floating-vue';
import Toast, { useToast, TYPE } from 'vue-toastification';
import Vue3Resize from 'vue3-resize';
import PrimeVue from 'primevue/config';
import PrimeVueStylePreset from '@/styles/PrimeVueStylePreset';
import { useAuthStore } from '@/stores/auth-store';

import 'vue-toastification/dist/index.css';
import 'floating-vue/dist/style.css';

const pinia = createPinia();
const app = createApp(App).use(pinia).use(router).use(Vue3Resize);

app.use(PrimeVue, {
  theme: {
    preset: PrimeVueStylePreset,
  },
});

app.use(Toast);
app.use(FloatingVue, {
  themes: {
    'min-max-tooltip': {
      $extend: 'tooltip',
      $resetCss: true,
      placement: 'right',
      distance: 10,
    },
  },
});

app.mixin({
  methods: {
    // toaster(message, type, close) {
    toaster(message: string, msgType: TYPE, sticky = false) {
      const toast = useToast();
      const timeout = sticky === true ? false : 3000;
      toast(message, {
        timeout,
        type: msgType,
      });
    },
  },
});

app.directive('focus', {
  mounted(el) {
    el.focus();
  },
});

await useAuthStore(pinia).initKeycloak();
app.mount('#app');
