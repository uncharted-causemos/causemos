import Vuex from 'vuex';

import QueryStore from './modules/query-store';
import StatementsStore from './modules/statements-store';
import AppStore from './modules/app-store';
import PanelStore from './modules/panel-store';
import TourStore from './modules/tour-store';
import KnowledgebaseStore from './modules/knowledgebase-store';
import GraphStore from './modules/graph-store';
import ModelStore from './modules/model-store';
import DataSearchStore from './modules/data-search-store';
import DataAnalysisStore from './modules/data-analysis-store';
import InsightPanelStore from './modules/insight-panel-store';
import ModelPublishStore from './modules/model-publish-store';
import ContextInsightPanelStore from './modules/context-insight-panel-store';
import AnalysisChecklistStore from './modules/analysis-checklist-store';

export default new Vuex.Store({
  modules: {
    query: QueryStore,
    statements: StatementsStore,
    app: AppStore,
    panel: PanelStore,
    tour: TourStore,
    kb: KnowledgebaseStore,
    graph: GraphStore,
    model: ModelStore,
    dataSearch: DataSearchStore,
    dataAnalysis: DataAnalysisStore,
    insightPanel: InsightPanelStore,
    contextInsightPanel: ContextInsightPanelStore,
    modelPublishStore: ModelPublishStore,
    analysisChecklist: AnalysisChecklistStore
  }
});
