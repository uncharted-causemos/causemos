import Vue from 'vue';
import Toasted from 'vue-toasted';
import VTooltip from 'v-tooltip';
import VueResize from 'vue-resize';
import App from './App.vue';
import router from './router';
import store from './store';
import { sync } from 'vuex-router-sync';

Vue.config.productionTip = false;

Vue.use(Toasted);
Vue.use(VTooltip);
Vue.use(VueResize);

// This adds a store.state.route
sync(store, router);


// Register a global custom directive called `v-focus`. This can be added to input elements
// for autofocus
Vue.directive('focus', {
  inserted: function (el) {
    el.focus();
  }
});

// Mixin registration
Vue.mixin({
  methods: {
    // Register toaster as global function available to all components
    toaster(message, type, close) {
      this.$toasted.show(message, {
        theme: 'toasted-primary',
        position: 'top-right',
        type: type,
        duration: close === true ? null : 2000,
        action: close === true ? [
          {
            text: 'Close',
            onClick: (e, toastObject) => {
              toastObject.goAway(0);
            }
          }
        ] : []
      });
    }
  }
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');

