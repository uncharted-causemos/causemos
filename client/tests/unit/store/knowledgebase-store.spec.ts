/* eslint-disable no-unused-expressions */
import { cloneDeep } from 'lodash';
import { expect } from 'chai';
import { createStore } from 'vuex';
import storeConfig from '@/store/modules/knowledgebase-store';

describe('knowledgebase-store', () => {
  it('filteredStatementCount', (done) => {
    const store = createStore(cloneDeep(storeConfig));

    expect(store.state.filteredStatementCount).to.equal(0);

    // commit test
    store.commit('setFilteredStatementCount', 99);
    expect(store.state.filteredStatementCount).to.equal(99);

    // action test
    store
      .dispatch('setFilteredStatementCount', 10)
      .then(() => {
        expect(store.state.filteredStatementCount).to.equal(10);
        done();
      })
      .catch((err) => {
        console.log('error', err);
        done(err);
      });
  });
});
