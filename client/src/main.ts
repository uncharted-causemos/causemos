import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { sync } from 'vuex-router-sync';
import FloatingVue from 'floating-vue';
import Toast, { useToast, TYPE } from 'vue-toastification';

import Vue3Resize from 'vue3-resize';

import 'vue-toastification/dist/index.css';
import 'v-tooltip/dist/v-tooltip.css';
import 'floating-vue/dist/style.css';

sync(store, router);

const app = createApp(App).use(store).use(router).use(Vue3Resize);
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

// fetchSSO remains unused for now, but will become useful in the following non-exhaustive cases
// 1. The httpd gateway is removed, which handles authentication
// 2. Authorization becomes relevant within the app (e.g. admin vs user)
// 3. Additional features need to be introduced (user icons, for example)
// await store.dispatch('auth/fetchSSO');
app.mount('#app');
