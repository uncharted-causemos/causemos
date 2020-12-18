/* eslint-disable no-unused-expressions */
import { cloneDeep } from 'lodash';
import { createLocalVue } from '@vue/test-utils';
import { expect } from 'chai';
import Vuex from 'vuex';
import storeConfig from '@/store/modules/app-store';

// See: https://vue-test-utils.vuejs.org/guides/using-with-vuex.html
describe('app-store', () => {
  it('overlay state', () => {
    const localVue = createLocalVue();
    localVue.use(Vuex);
    const store = new Vuex.Store(cloneDeep(storeConfig));

    store.commit('disableOverlay');
    expect(store.state.overlayActivated).to.equal(false);

    store.commit('enableOverlay', 'abc');
    expect(store.state.overlayActivated).to.equal(true);
  });

  it('overlay message', (done) => {
    const localVue = createLocalVue();
    localVue.use(Vuex);
    const store = new Vuex.Store(cloneDeep(storeConfig));
    const testMessage = 'test overlay';

    expect(store.state.overlayActivated).to.equal(false);

    // action test
    store.dispatch('enableOverlay', testMessage).then(() => {
      expect(store.state.overlayActivated).to.equal(true);
      expect(store.state.overlayMessage).to.equal(testMessage);
      done();
    }).catch(err => {
      console.log('error', err);
      done(err);
    });
  });
});
