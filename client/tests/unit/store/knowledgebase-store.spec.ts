/* eslint-disable no-unused-expressions */
import { cloneDeep } from 'lodash';

import { createStore } from 'vuex';
import storeConfig from '@/store/modules/knowledgebase-store';

describe('knowledgebase-store', () => {
  it('filteredStatementCount', async () => {
    const store = createStore(cloneDeep(storeConfig));

    expect(store.state.filteredStatementCount).to.equal(0);

    // commit test
    store.commit('setFilteredStatementCount', 99);
    expect(store.state.filteredStatementCount).to.equal(99);

    // action test
    await store.dispatch('setFilteredStatementCount', 10);
    expect(store.state.filteredStatementCount).to.equal(10);
  });
});
