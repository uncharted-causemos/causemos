import { cloneDeep } from 'lodash';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import QueryStore from '@/store/modules/query-store';
import StatementsStore from '@/store/modules/statements-store';
import AppStore from '@/store/modules/app-store';
import PanelStore from '@/store/modules/panel-store';
import KnowledgebaseStore from '@/store/modules/knowledgebase-store';

/**
 * Provide the very basic plumbings to test components
 */
const defaultStoreConfig = {
  namespaced: true,
  modules: {
    query: QueryStore,
    statements: StatementsStore,
    app: AppStore,
    panel: PanelStore,
    kb: KnowledgebaseStore,
  },
};

/**
 * A wrapper for simlating a component with simplified setup with Vuex-store
 *
 * @param {object} component - vue component
 * @param {object} propsData - initial component properties
 * @param {object} storeConfig - optional, vuex store configuration
 *
 * Example:
 *   import Overlay from '@/components/overlay';
 *   const t = simpleWMMount(Overlay, { message: 'Hello' });
 *   expect(t.find('.message-container').text()).to.equal('Hello');
 *
 */
const simpleWMMount = (component, propsData, storeConfig = defaultStoreConfig) => {
  const localVue = createLocalVue();
  const store = new Vuex.Store(cloneDeep(storeConfig));
  localVue.use(Vuex);

  return shallowMount(component, {
    propsData,
    store,
    localVue,
  });
};

export default {
  simpleWMMount,
  defaultStoreConfig,
};
