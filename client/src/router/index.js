import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import DomainProjectOverview from '@/views/DomainProjectOverview.vue';
import DatasetOverview from '@/views/DatasetOverview.vue';
import AnalysisProjectOverview from '@/views/AnalysisProjectOverview.vue';
import NewProject from '@/views/NewProject.vue';
import NewDomainProject from '@/views/NewDomainProject.vue';
import DataExplorer from '@/views/DataExplorer.vue';
// import GraphExperiment from '@/views/GraphExperiment.vue';
import QualitativeView from '@/views/QualitativeView.vue';
import KnowledgeBaseExplorer from '@/views/KnowledgeBaseExplorer.vue';
import QuantitativeView from '@/views/QuantitativeView.vue';
import AuditTrail from '@/views/AuditTrail.vue';
import NotFound from '@/views/NotFound.vue';
import DatacubeDrilldown from '@/views/DatacubeDrilldown';
import CompAnalysis from '@/views/CompAnalysis';
import ModelPublishingExperiment from '@/views/ModelPublishingExperiment';
import IndicatorPublishingExperiment from '@/views/IndicatorPublishingExperiment';
import NodeCompExperiment from '@/views/NodeCompExperiment';
import NodeDrilldown from '@/views/NodeDrilldown';
import NodeDataExplorer from '@/views/NodeDataExplorer.vue';
import HistogramDemo from '@/views/HistogramDemo.vue';
import qs from 'qs';
import _ from 'lodash';
import store from '@/store';


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

// Load analysis state for dataAnalysis store before route enter
// NOTE: this is specific to the new data space (and the new data explorer)
async function loadAnalysisState(to, from, next) {
  await store.dispatch('dataAnalysis/loadState', to.params.analysisId);
  next();
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/newProject',
    name: 'newProject',
    component: NewProject
  },
  {
    path: '/newDomainProject',
    name: 'newDomainProject',
    component: NewDomainProject
  },
  {
    path: '/:projectType/:project/overview',
    name: 'overview',
    component: AnalysisProjectOverview
  },
  {
    path: '/:projectType/:project/domainDatacubeOverview',
    name: 'domainDatacubeOverview',
    component: DomainProjectOverview
  },
  {
    path: '/:projectType/:project/datasetOverview',
    name: 'datasetOverview',
    component: DatasetOverview
  },
  {
    path: '/:projectType/:project/data/:analysisId',
    name: 'data',
    component: DatacubeDrilldown,
    beforeEnter: loadAnalysisState
  },
  {
    path: '/:projectType/:project/dataComparative/:analysisId',
    name: 'dataComparative',
    component: CompAnalysis,
    beforeEnter: loadAnalysisState
  },
  {
    // @HACK: a special route to view the a domain model instance (or datacube) using the same way an analyst would see it
    path: '/:projectType/:project/domainDatacubeOverview',
    name: 'dataPreview',
    component: DatacubeDrilldown
  },
  {
    path: '/:projectType/:project/data/:analysisId/explorer',
    name: 'dataExplorer',
    component: DataExplorer,
    beforeEnter: loadAnalysisState
  },
  {
    path: '/:projectType/:project/model-publishing-experiment',
    name: 'modelPublishingExperiment',
    component: ModelPublishingExperiment
  },
  {
    path: '/:projectType/:project/indicator-publishing-experiment',
    name: 'indicatorPublishingExperiment',
    component: IndicatorPublishingExperiment
  },
  // {
  //   path: '/graph-experiment',
  //   name: 'graphExperiment',
  //   component: GraphExperiment
  // },
  {
    path: '/:projectType/:project/qualitative/:currentCAG',
    name: 'qualitative',
    component: QualitativeView
  },
  {
    path: '/:projectType/:project/kb-explorer',
    name: 'kbExplorer',
    component: KnowledgeBaseExplorer
  },
  {
    path: '/:projectType/:project/quantitative/:currentCAG',
    name: 'quantitative',
    component: QuantitativeView
  },
  {
    path: '/:projectType/:project/quantitative/:currentCAG/:nodeId/indicator/:indicatorId',
    name: 'nodeCompExperiment',
    component: NodeCompExperiment
  },
  {
    path: '/:projectType/:project/quantitative/:currentCAG/:nodeId',
    name: 'nodeDrilldown',
    component: NodeDrilldown
  },
  {
    path: '/:projectType/:project/quantitative/:currentCAG/:nodeId/explorer',
    name: 'nodeDataExplorer',
    component: NodeDataExplorer
  },
  {
    path: '/:projectType/:project/audit-trail',
    name: 'auditTrail',
    component: AuditTrail
  },
  {
    path: '/histogram-demo',
    name: 'histogramDemo',
    component: HistogramDemo
  },
  /* 404, this has to go last */
  {
    path: '/:pathMatch(.*)*',
    component: NotFound
  }
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
  history: createWebHashHistory(process.env.BASE_URL),
  routes: routes
});
