import Vuex from 'vuex';

import QueryStore from './modules/query-store';
import AppStore from './modules/app-store';
import AuthStore from './modules/auth-store';
import ModelStore from './modules/model-store';
import DataSearchStore from './modules/data-search-store';
import InsightPanelStore from './modules/insight-panel-store';
import ModelPublishStore from './modules/model-publish-store';

export default new Vuex.Store({
  modules: {
    query: QueryStore,
    app: AppStore,
    auth: AuthStore,
    model: ModelStore,
    dataSearch: DataSearchStore,
    insightPanel: InsightPanelStore,
    modelPublishStore: ModelPublishStore,
  },
});
