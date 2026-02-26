import _ from 'lodash';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import FiltersUtil from '@/utils/filters-util';
import { ClauseOperand, Filters } from '@/types/Filters';

type View = 'documents' | 'statements' | 'audits';
const DEFAULT_VIEW: View = 'documents';

interface Pagination {
  from: number;
  size?: number;
  sort?: { [key: string]: string };
}

interface QueryUpdate {
  filters?: Filters;
  view?: View;
  layout?: any;
  documents?: Pagination;
  statements?: Pagination;
  audits?: Pagination;
}

const defaultDocumentsQuery = Object.freeze({ from: 0, size: 50, sort: {} });
const defaultStatementsQuery = Object.freeze({ from: 0, size: 50, sort: {} });
const defaultAuditsQuery = Object.freeze({ from: 0, size: 50, sort: {} });
const defaultLayout = Object.freeze({
  layoutOption: 'cose-bilkent',
  hierarchyDepth: 0,
  direction: 'x',
  showLabels: true,
  showEdges: true,
  edgeOpacity: 0.4,
  minimumNodeDepth: 1,
});
const START_ZERO = {
  documents: { from: 0 },
  statements: { from: 0 },
  audits: { from: 0 },
};

export const useQueryStore = defineStore('query', () => {
  const route = useRoute();
  const router = useRouter();

  const lastQuery = ref<Filters>(FiltersUtil.newFilters());

  const query = computed(() =>
    Object.assign(
      {
        statements: Object.assign({}, defaultStatementsQuery),
        documents: Object.assign({}, defaultDocumentsQuery),
        audits: Object.assign({}, defaultAuditsQuery),
      },
      route.query
    )
  );
  const filters = computed<Filters>(() => {
    const f = _.get(route, 'query.filters', {});
    return _.isEmpty(f) ? FiltersUtil.newFilters() : (f as Filters);
  });
  const view = computed<View>(() => _.get(route, 'query.view', DEFAULT_VIEW) as View);
  const statements = computed<Pagination>(
    () => _.get(route, 'query.statements', defaultStatementsQuery) as Pagination
  );
  const documents = computed<Pagination>(
    () => _.get(route, 'query.documents', defaultDocumentsQuery) as Pagination
  );
  const audits = computed<Pagination>(
    () => _.get(route, 'query.audits', defaultAuditsQuery) as Pagination
  );
  const layout = computed(() => _.get(route, 'query.layout', defaultLayout));
  const cag = computed(() => _.get(route, 'query.cag', null));

  function _buildQuery(updateObj: QueryUpdate) {
    const _filters = updateObj.filters ?? filters.value;
    const _layout = updateObj.layout ?? layout.value;
    const _view = updateObj.view ?? view.value;
    const _cag = cag.value;
    const q: any = {
      filters: _filters,
      view: _view,
      layout: _layout,
      documents: Object.assign(
        {},
        documents.value,
        _.pickBy(updateObj.documents, (v) => !_.isNil(v))
      ),
      statements: Object.assign(
        {},
        statements.value,
        _.pickBy(updateObj.statements, (v) => !_.isNil(v))
      ),
      audits: Object.assign(
        {},
        audits.value,
        _.pickBy(updateObj.audits, (v) => !_.isNil(v))
      ),
    };
    if (!_.isEmpty(_cag)) q.cag = _cag;
    return q;
  }

  function setSearchFilters(newFilters: Filters) {
    router.push({ query: _buildQuery({ filters: newFilters, ...START_ZERO }) }).catch(() => {});
  }
  function clearLastQuery() {
    lastQuery.value = null as any;
  }
  function setLastQuery(newFilters: Filters) {
    lastQuery.value = _buildQuery({ filters: newFilters }) as any;
  }
  function addSearchTerm({
    field,
    term,
    operand,
    isNot,
  }: {
    field: string;
    term: any;
    operand?: ClauseOperand;
    isNot?: boolean;
  }) {
    const f = _.cloneDeep(filters.value);
    if (
      field === 'score' ||
      field === 'belief' ||
      field === 'temporal' ||
      field === 'num_evidences'
    ) {
      FiltersUtil.removeClause(f, field, 'or', false);
    }
    FiltersUtil.addSearchTerm(f, field, term, operand ?? 'or', isNot ?? false);
    router.push({ query: _buildQuery({ filters: f, ...START_ZERO }) }).catch(() => {});
  }
  function removeSearchTerm({
    field,
    term,
    operand,
    isNot,
  }: {
    field: string;
    term: any;
    operand?: ClauseOperand;
    isNot?: boolean;
  }) {
    const f = _.cloneDeep(filters.value);
    FiltersUtil.removeSearchTerm(f, field, term, operand ?? 'or', isNot ?? false);
    const newFilters = FiltersUtil.isEmpty(f) ? FiltersUtil.newFilters() : f;
    router.push({ query: _buildQuery({ filters: newFilters, ...START_ZERO }) }).catch(() => {});
  }
  function setSearchClause({
    field,
    values,
    operand,
    isNot,
  }: {
    field: string;
    values: any[];
    operand?: ClauseOperand;
    isNot?: boolean;
  }) {
    const f = _.cloneDeep(filters.value);
    FiltersUtil.setClause(f, field, values, operand ?? 'or', isNot ?? false);
    router.push({ query: _buildQuery({ filters: f, ...START_ZERO }) }).catch(() => {});
  }
  function setPagination({ view: pView, from, size }: { view: View; from: number; size: number }) {
    const viewQueryObj: QueryUpdate = {};
    viewQueryObj[pView] = { from, size };
    router.push({ query: _buildQuery(viewQueryObj) }).catch(() => {});
  }
  function setOrderBy({
    view: oView,
    field,
    sortOrder,
  }: {
    view: View;
    field: string;
    sortOrder: string;
  }) {
    const viewQueryObj: QueryUpdate = {};
    viewQueryObj[oView] = { from: 0, sort: { [field]: sortOrder } };
    router.push({ query: _buildQuery(viewQueryObj) }).catch(() => {});
  }
  function setView(newView: View) {
    router.push({ query: _buildQuery({ view: newView }) }).catch(() => {});
  }
  function setLayout(newLayout: any) {
    router.push({ query: _buildQuery({ layout: newLayout }) }).catch(() => {});
  }

  return {
    lastQuery,
    query,
    filters,
    view,
    statements,
    documents,
    audits,
    layout,
    cag,
    setSearchFilters,
    clearLastQuery,
    setLastQuery,
    addSearchTerm,
    removeSearchTerm,
    setSearchClause,
    setPagination,
    setOrderBy,
    setView,
    setLayout,
  };
});
