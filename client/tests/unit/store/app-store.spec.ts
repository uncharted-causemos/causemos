/* eslint-disable no-unused-expressions */
import { cloneDeep } from 'lodash';
import { expect } from 'chai';
import { createStore } from 'vuex';
import storeConfig from '@/store/modules/app-store';

// See: https://vue-test-utils.vuejs.org/guides/using-with-vuex.html
describe('app-store', () => {
  it('overlay state', () => {
    const store = createStore(cloneDeep(storeConfig));

    store.commit('disableOverlay');
    expect(store.state.overlayActivated).to.equal(false);

    store.commit('enableOverlay', 'abc');
    expect(store.state.overlayActivated).to.equal(true);
  });

  it('overlay message', (done) => {
    const store = createStore(cloneDeep(storeConfig));
    const testMessage = 'test overlay';

    expect(store.state.overlayActivated).to.equal(false);

    // action test
    store
      .dispatch('enableOverlay', testMessage)
      .then(() => {
        expect(store.state.overlayActivated).to.equal(true);
        expect(store.state.overlayMessage).to.equal(testMessage);
        done();
      })
      .catch((err) => {
        console.log('error', err);
        done(err);
      });
  });
});
