import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import DomainProjectOverview from '@/views/DomainProjectOverview.vue';
import DatasetOverview from '@/views/DatasetOverview.vue';
import AnalysisProjectOverview from '@/views/AnalysisProjectOverview.vue';
import NewProject from '@/views/NewProject.vue';
import NewDomainProject from '@/views/NewDomainProject.vue';
import DataExplorer from '@/views/DataExplorer.vue';
import IndexStructure from '@/views/IndexStructure.vue';
import IndexResults from '@/views/IndexResults.vue';
import IndexProjections from '@/views/IndexProjections.vue';
import AuditTrail from '@/views/AuditTrail.vue';
import NotFound from '@/views/NotFound.vue';
import DatacubeDrilldown from '@/views/DatacubeDrilldown.vue';
import Documents from '@/views/Documents.vue';
import CompAnalysis from '@/views/CompAnalysis.vue';
import ModelPublisher from '@/views/ModelPublisher.vue';
import IndicatorPublisher from '@/views/IndicatorPublisher.vue';
import IndexNodeDataExplorer from '@/views/IndexNodeDataExplorer.vue';
import PrefectFlowLogs from '@/views/PrefectFlowLogs.vue';
import qs from 'qs';
import _ from 'lodash';

/* Borrowed from pantera */
function formatter(item) {
  if (_.isPlainObject(item)) {
    return _.mapValues(item, formatter);
  } else if (_.isArray(item)) {
    return _.map(item, formatter);
  } else if (item === 'true') {
    return true;
  } else if (item === 'false') {
    return false;
  } else if (!Number.isNaN(Number(item)) && !_.isNull(item)) {
    return Number(item);
  }
  return item;
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/newProject',
    name: 'newProject',
    component: NewProject,
  },
  {
    path: '/newDomainProject',
    name: 'newDomainProject',
    component: NewDomainProject,
  },
  {
    path: '/:projectType/:project/overview',
    name: 'overview',
    component: AnalysisProjectOverview,
  },
  {
    path: '/:projectType/:project/domainDatacubeOverview',
    name: 'domainDatacubeOverview',
    component: DomainProjectOverview,
  },
  {
    path: '/:projectType/:project/datasetOverview',
    name: 'datasetOverview',
    component: DatasetOverview,
  },
  {
    path: '/:projectType/:project/data/:analysisId',
    name: 'data',
    component: DatacubeDrilldown,
  },
  {
    path: '/:projectType/:project/dataComparative/:analysisId',
    name: 'dataComparative',
    component: CompAnalysis,
  },
  {
    path: '/:projectType/:project/data/:analysisId/explorer',
    name: 'dataExplorer',
    component: DataExplorer,
  },
  {
    path: '/:projectType/:project/index-structure/:analysisId',
    name: 'indexStructure',
    component: IndexStructure,
  },
  {
    path: '/:projectType/:project/index-structure/:analysisId/node/:nodeId/explorer',
    name: 'indexNodeDataExplorer',
    component: IndexNodeDataExplorer,
  },
  {
    path: '/:projectType/:project/index-structure/:analysisId/explorer',
    name: 'indexResultsDataExplorer',
    component: DatacubeDrilldown,
  },
  {
    path: '/:projectType/:project/index-projections/:analysisId/explorer',
    name: 'projectionsDataExplorer',
    component: DatacubeDrilldown,
  },
  {
    path: '/:projectType/:project/documents',
    name: 'documents',
    component: Documents,
  },
  {
    path: '/:projectType/:project/index-results/:analysisId',
    name: 'indexResults',
    component: IndexResults,
  },
  {
    path: '/:projectType/:project/index-projections/:analysisId',
    name: 'indexProjections',
    component: IndexProjections,
  },
  {
    path: '/:projectType/:project/model-publishing-experiment',
    name: 'modelPublisher',
    component: ModelPublisher,
  },
  {
    path: '/:projectType/:project/indicator-publishing-experiment',
    name: 'indicatorPublisher',
    component: IndicatorPublisher,
  },
  {
    path: '/prefectFlowLogs/:flowId',
    name: 'prefectFlowLogs',
    component: PrefectFlowLogs,
  },
  {
    path: '/:projectType/:project/audit-trail',
    name: 'auditTrail',
    component: AuditTrail,
  },
  /* 404, this has to go last */
  {
    path: '/:pathMatch(.*)*',
    component: NotFound,
  },
];

export default createRouter({
  parseQuery: (query) => {
    /**
     * Override depth from default 5 to 8
     * Override arrayLimit from default 20 to 300 for filters like geo_context
     * see: https://github.com/ljharb/qs#parsing-objects
     */
    const result = qs.parse(query, { depth: 8, arrayLimit: 300 });
    return formatter(result);
  },
  stringifyQuery: (query) => {
    const result = qs.stringify(query);
    return result ? `${result}` : '';
  },
  history: createWebHashHistory(),
  routes,
});
