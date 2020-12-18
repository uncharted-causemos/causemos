/* Helper functions to bootstrap testing environment */
import _ from 'lodash';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import { sync } from 'vuex-router-sync';
import router from '@/router';
import store from '@/store';

/**
 * Returns the core fully instantiated
 */
let unsync = null;
export function createWMEnvironment() {
  if (!_.isNil(unsync)) unsync();

  const localVue = createLocalVue();
  localVue.use(Vuex);
  unsync = sync(store, router);
  return { router, store, localVue };
}
