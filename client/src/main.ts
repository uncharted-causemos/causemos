import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { sync } from 'vuex-router-sync';
import VTooltip from 'v-tooltip'; // FIXME: not working
import Toast, { useToast, TYPE } from 'vue-toastification';

// @ts-ignore
import Vue3Resize from 'vue3-resize';

import 'vue-toastification/dist/index.css';


sync(store, router);

const app = createApp(App).use(store).use(router).use(VTooltip).use(Vue3Resize);
app.use(Toast);

app.mixin({
  methods: {
    // toaster(message, type, close) {
    toaster(message: string, msgType: string, sticky = false) {
      const toast = useToast();
      const t = msgType === 'error' ? TYPE.INFO : TYPE.SUCCESS;
      const timeout = sticky === true ? false : 3000;
      toast(message, {
        timeout: timeout,
        type: t
      });
    }
  }
});


app.directive('focus', {
  mounted(el) {
    el.focus();
  }
});

app.mount('#app');

// import Vue from 'vue';
// import Toasted from 'vue-toasted';
// import VTooltip from 'v-tooltip';
// import VueResize from 'vue-resize';
// import App from './App.vue';
// import router from './router';
// import store from './store';
// import { sync } from 'vuex-router-sync';
// Vue.config.productionTip = false;
//
// Vue.use(Toasted);
// Vue.use(VTooltip);
// Vue.use(VueResize);
//
// // This adds a store.state.route
// sync(store, router);
//
//
// // Register a global custom directive called `v-focus`. This can be added to input elements
// // for autofocus
// Vue.directive('focus', {
//   inserted: function (el) {
//     el.focus();
//   }
// });
//
// // Mixin registration
// Vue.mixin({
//   methods: {
//     // Register toaster as global function available to all components
//     toaster(message, type, close) {
//       this.$toasted.show(message, {
//         theme: 'toasted-primary',
//         position: 'top-right',
//         type: type,
//         duration: close === true ? null : 2000,
//         action: close === true ? [
//           {
//             text: 'Close',
//             onClick: (e, toastObject) => {
//               toastObject.goAway(0);
//             }
//           }
//         ] : []
//       });
//     }
//   }
// });
//
// new Vue({
//   router,
//   store,
//   render: h => h(App)
// }).$mount('#app');

