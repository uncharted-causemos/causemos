/* eslint-disable no-unused-expressions */
import { cloneDeep } from 'lodash';
import { createLocalVue } from '@vue/test-utils';
import { expect } from 'chai';
import Vuex from 'vuex';
import storeConfig from '@/store/modules/statements-store';

describe('statements-store', () => {
  it('toggling column state', (done) => {
    const localVue = createLocalVue();
    localVue.use(Vuex);
    const store = new Vuex.Store(cloneDeep(storeConfig));

    const cols = store.state.columns;
    const numVisibles = cols.filter(d => d.visible === true).length;
    const notVisibleIdx = cols.findIndex(d => d.visible === false);

    if (notVisibleIdx >= 0) {
      let newNumVisibles = 0;
      store.commit('toggleColumn', notVisibleIdx);
      newNumVisibles = store.state.columns.filter(d => d.visible === true).length;
      expect(newNumVisibles).to.equal(numVisibles + 1);
      store.commit('toggleColumn', notVisibleIdx);
      newNumVisibles = store.state.columns.filter(d => d.visible === true).length;
      expect(newNumVisibles).to.equal(numVisibles);
      done();
    } else {
      done();
    }
  });
});
