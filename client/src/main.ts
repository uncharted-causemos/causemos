import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { sync } from 'vuex-router-sync';
import VTooltip from 'v-tooltip';
import Toast, { useToast, TYPE } from 'vue-toastification';
import { conceptHumanName } from '@/utils/concept-util';

import Vue3Resize from 'vue3-resize';

import 'vue-toastification/dist/index.css';
import 'v-tooltip/dist/v-tooltip.css';

sync(store, router);

const app = createApp(App).use(store).use(router).use(VTooltip).use(Vue3Resize);
app.use(Toast);

app.mixin({
  methods: {
    // toaster(message, type, close) {
    toaster(message: string, msgType: TYPE, sticky = false) {
      const toast = useToast();
      const timeout = sticky === true ? false : 3000;
      toast(message, {
        timeout: timeout,
        type: msgType,
      });
    },
    ontologyFormatter(concept: string) {
      // This is a bit hacky here, but we use concept formatters all over the place
      // and it is a bit of a pain to inject this across every single component.
      return conceptHumanName(concept, store.getters['app/ontologySet']);
    },
  },
});

app.directive('focus', {
  mounted(el) {
    el.focus();
  },
});

app.mount('#app');
