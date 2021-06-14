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
import InsightPanelStore from './modules/insight-panel-store';

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
    insightPanel: InsightPanelStore
  }
});
