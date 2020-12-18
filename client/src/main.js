import Vue from 'vue';
import Toasted from 'vue-toasted';
import VTooltip from 'v-tooltip';
import VueResize from 'vue-resize';
import App from './App.vue';
import router from './router';
import store from './store';
import { sync } from 'vuex-router-sync';

import precisionFormatter from './filters/precision-formatter';
import ontologyFormatter from './filters/ontology-formatter';
import polarityFormatter from './filters/polarity-formatter';
import listFormatter from './filters/list-formatter';
import statementPolarityFormatter from './filters/statement-polarity-formatter';
import numberFormatter from './filters/number-formatter';
import capitalLettersFormatter from './filters/capitalLetters-formatter';
import filterKeyFormatter from './filters/filter-key-formatter';
import filterValueFormatter from './filters/filter-value-formatter';
import dateFormatter from './filters/date-formatter';
import durationFormatter from './filters/duration-formatter';
import locationFormatter from './filters/location-formatter';
import contradictionCategoryFormatter from './filters/contradiction-category-formatter';
import hedgingCategoryFormatter from './filters/hedging-category-formatter';
import indicatorRunFormatter from './filters/indicator-run-formatter';
import stringFormatter from './filters/string-formatter';


Vue.config.productionTip = false;

// Register global filters (formatters) for the application, this makes
// them available in the templates
Vue.filter('precisionFormatter', precisionFormatter);
Vue.filter('ontologyFormatter', ontologyFormatter);
Vue.filter('polarityFormatter', polarityFormatter);
Vue.filter('listFormatter', listFormatter);
Vue.filter('statementPolarityFormatter', statementPolarityFormatter);
Vue.filter('numberFormatter', numberFormatter);
Vue.filter('capitalLettersFormatter', capitalLettersFormatter);
Vue.filter('filterKeyFormatter', filterKeyFormatter);
Vue.filter('filterValueFormatter', filterValueFormatter);
Vue.filter('dateFormatter', dateFormatter);
Vue.filter('durationFormatter', durationFormatter);
Vue.filter('locationFormatter', locationFormatter);
Vue.filter('contradictionCategoryFormatter', contradictionCategoryFormatter);
Vue.filter('hedgingCategoryFormatter', hedgingCategoryFormatter);
Vue.filter('indicatorRunFormatter', indicatorRunFormatter);
Vue.filter('stringFormatter', stringFormatter);

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

