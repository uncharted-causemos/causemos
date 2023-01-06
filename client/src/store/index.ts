import Vuex from 'vuex';

import QueryStore from './modules/query-store';
import StatementsStore from './modules/statements-store';
import AppStore from './modules/app-store';
import TourStore from './modules/tour-store';
import KnowledgebaseStore from './modules/knowledgebase-store';
import GraphStore from './modules/graph-store';
import ModelStore from './modules/model-store';
import DataSearchStore from './modules/data-search-store';
import InsightPanelStore from './modules/insight-panel-store';
import ModelPublishStore from './modules/model-publish-store';

export default new Vuex.Store({
  modules: {
    query: QueryStore,
    statements: StatementsStore,
    app: AppStore,
    tour: TourStore,
    kb: KnowledgebaseStore,
    graph: GraphStore,
    model: ModelStore,
    dataSearch: DataSearchStore,
    insightPanel: InsightPanelStore,
    modelPublishStore: ModelPublishStore,
  },
});
