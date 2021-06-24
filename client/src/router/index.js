import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import ProjectOverview from '@/views/ProjectOverview.vue';
import DomainProjectOverview from '@/views/DomainProjectOverview.vue';
import NewProject from '@/views/NewProject.vue';
import DataStart from '@/views/DataStart.vue';
import DataExplorer from '@/views/DataExplorer.vue';
import CreateDataCube from '@/views/CreateDataCube.vue';
import TileExperiment from '@/views/TileExperiment.vue';
import GraphExperiment from '@/views/GraphExperiment.vue';
import QualitativeView from '@/views/QualitativeView.vue';
import QualitativeStart from '@/views/QualitativeStart.vue';
import KnowledgeBaseExplorer from '@/views/KnowledgeBaseExplorer.vue';
import QuantitativeStart from '@/views/QuantitativeStart.vue';
import QuantitativeView from '@/views/QuantitativeView.vue';
import AuditTrail from '@/views/AuditTrail.vue';
import NotFound from '@/views/NotFound.vue';
import CompAnalysisExperiment from '@/views/CompAnalysisExperiment';
import ModelPublishingExperiment from '@/views/ModelPublishingExperiment';
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
async function loadAnalysisState(to, from, next) {
  await store.dispatch('dataAnalysis/loadState', to.params.analysisID);
  next();
}

// Load analysis state for dataAnalysis store before route enter
// NOTE: this is specific to the new data space (and the new data explorer)
async function loadAnalysisStateNew(to, from, next) {
  await store.dispatch('dataAnalysis/loadStateNew', to.params.analysisID);
  next();
}

async function loadDomainProjectState(to, from, next) {
  await store.dispatch('app/isDomainProject', true);
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
    path: '/:project/overview',
    name: 'overview',
    component: ProjectOverview
  },
  {
    path: '/:project/domainDatacubeOverview',
    name: 'domainDatacubeOverview',
    component: DomainProjectOverview,
    beforeEnter: loadDomainProjectState
  },
  {
    path: '/:project/data',
    name: 'dataStart',
    component: DataStart
  },
  {
    path: '/:project/data/:analysisID',
    name: 'data',
    component: CompAnalysisExperiment,
    beforeEnter: loadAnalysisStateNew
  },
  {
    // @HACK: a special route to view the a domain model instance (or datacube) using the same way an analyst would see it
    path: '/:project/domainDatacubeOverview',
    name: 'dataPreview',
    component: CompAnalysisExperiment,
    beforeEnter: loadDomainProjectState
  },
  {
    path: '/:project/data/:analysisID/explorer',
    name: 'dataExplorer',
    component: DataExplorer,
    beforeEnter: loadAnalysisState
  },
  {
    path: '/:project/data/:analysisID/create-data-cube',
    name: 'createDataCube',
    component: CreateDataCube
  },
  {
    path: '/tile-experiment',
    name: 'tileExperiment',
    component: TileExperiment
  },
  {
    path: '/:project/model-publishing-experiment',
    name: 'modelPublishingExperiment',
    component: ModelPublishingExperiment,
    beforeEnter: loadDomainProjectState
  },
  {
    path: '/graph-experiment',
    name: 'graphExperiment',
    component: GraphExperiment
  },
  {
    path: '/:project/qualitative',
    name: 'qualitativeStart',
    component: QualitativeStart
  },
  {
    path: '/:project/qualitative/:currentCAG',
    name: 'qualitative',
    component: QualitativeView
  },
  {
    path: '/:project/kb-explorer',
    name: 'kbExplorer',
    component: KnowledgeBaseExplorer
  },
  {
    path: '/:project/quantitative',
    name: 'quantitativeStart',
    component: QuantitativeStart
  },
  {
    path: '/:project/quantitative/:currentCAG',
    name: 'quantitative',
    component: QuantitativeView
  },
  {
    path: '/:project/audit-trail',
    name: 'auditTrail',
    component: AuditTrail
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
