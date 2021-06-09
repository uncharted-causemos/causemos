import Vuex from 'vuex';

import QueryStore from './modules/query-store';
import StatementsStore from './modules/statements-store';
import AppStore from './modules/app-store';
import PanelStore from './modules/panel-store';
import KnowledgebaseStore from './modules/knowledgebase-store';
import GraphStore from './modules/graph-store';
import ModelStore from './modules/model-store';
import DataSearchStore from './modules/data-search-store';
import DataAnalysisStore from './modules/data-analysis-store';
import InsightpanelStore from './modules/insightpanel-store';
import BookmarkpanelStore from './modules/bookmarkpanel-store';

export default new Vuex.Store({
  modules: {
    query: QueryStore,
    statements: StatementsStore,
    app: AppStore,
    panel: PanelStore,
    kb: KnowledgebaseStore,
    graph: GraphStore,
    model: ModelStore,
    dataSearch: DataSearchStore,
    dataAnalysis: DataAnalysisStore,
    insightPanel: InsightpanelStore,
    bookmarkPanel: BookmarkpanelStore
  }
});
