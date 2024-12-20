import Vuex from 'vuex';

import QueryStore from './modules/query-store';
import AppStore from './modules/app-store';
import AuthStore from './modules/auth-store';
import DataSearchStore from './modules/data-search-store';
import InsightPanelStore from './modules/insight-panel-store';

export default new Vuex.Store({
  modules: {
    query: QueryStore,
    app: AppStore,
    auth: AuthStore,
    dataSearch: DataSearchStore,
    insightPanel: InsightPanelStore,
  },
});
