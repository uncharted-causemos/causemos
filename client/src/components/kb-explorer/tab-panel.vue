<template>
  <div id="tabPanel" class="tab-panel-container h-100 flex flex-col">
    <div class="tab-bar-row flex">
      <tab-bar :tabs="tabs" :active-tab-id="view" @tab-click="setActive" />
      <sub-action-bar />
    </div>
    <div class="data-awareness-bar">
      <counters
        :documents-count="documentsCount"
        :evidences-count="evidencesCount"
        :statements-count="statementsCount"
        :nodes-count="nodesCount"
        :edges-count="edgesCount"
        :view="view"
        :selected-nodes-count="selectedNodesCount"
      />
    </div>
    <div class="tab-content flex-grow-1 h-0 insight-capture">
      <div class="tab-pane active h-100">
        <statements-view v-if="view === 'statements'" />
        <cyto-graph
          v-if="view === 'graphs'"
          :graph-data="graphData"
          :layout="layout"
          @clear-selection="setSubGraphByFilters"
        />
        <map-view v-if="view === 'maps'" :map-data="mapData" />
        <documents-view v-if="view === 'documents'" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import { defineComponent, ref, Ref } from 'vue';

import projectService from '@/services/project-service';
import Counters from '@/components/kb-explorer/counters.vue';
import StatementsView from '@/components/kb-explorer/statements-view.vue';
import DocumentsView from '@/components/kb-explorer/documents-view.vue';
import SubActionBar from '@/components/kb-explorer/sub-action-bar.vue';
import MapView from '@/components/kb-explorer/map-view.vue';
import CytoGraph from '@/components/graph/cyto-graph.vue';
import filtersUtil from '@/utils/filters-util';
import { transformMapData } from '@/utils/map-util';
import TabBar from '../widgets/tab-bar.vue';
import { SELECTED_COLOR } from '@/utils/colors-util';

interface GEOPoint {
  geometry: {
    coordinates: number[];
    type: string;
  };
  properties: {
    count: number;
    name: string;
    color?: string;
  };
  type: string;
}

interface MapData {
  type: string;
  features: GEOPoint[];
}

// Grey
const UNSELECTED_REGION_STYLE = Object.freeze({
  color: '#808080',
  weight: 1,
  fillColor: '#808080',
  fillOpacity: 0.6,
});

const SELECTED_REGION_STYLE = Object.freeze({
  color: SELECTED_COLOR,
  borderWidth: 1,
  fillColor: SELECTED_COLOR,
  fillOpacity: 0.6,
});

const SELECTABLE_REGION_STYLE = Object.freeze({
  color: '#ffae19',
  borderWidth: 1,
  fillColor: '#e69f00',
  fillOpacity: 0.6,
});

export default defineComponent({
  name: 'TabPanel',
  components: {
    Counters,
    CytoGraph,
    DocumentsView,
    MapView,
    StatementsView,
    SubActionBar,
    TabBar,
  },
  setup() {
    const tabs = [
      {
        name: 'Docs',
        icon: 'fa fa-file-text',
        id: 'documents',
      },
      {
        name: 'Table',
        icon: 'fa fa-table',
        id: 'statements',
      },
      {
        name: 'Graph',
        icon: 'fa fa-connectdevelop',
        id: 'graphs',
      },
      {
        name: 'Map',
        icon: 'fa fa-map',
        id: 'maps',
      },
    ];

    const setMapDataPromise: any = null;
    const graphData = ref(null);
    const mapData = ref(null) as Ref<MapData | null>;
    const documentsData = ref(null);

    return {
      tabs,
      graphData,
      mapData,
      documentsData,
      setMapDataPromise,
    };
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      updateToken: 'app/updateToken',
      view: 'query/view',
      statementsCount: 'kb/filteredStatementCount',
      nodesCount: 'graph/filteredNodesCount',
      edgesCount: 'graph/filteredEdgesCount',
      selectedNodesCount: 'graph/selectedNodesCount',
      documentsCount: 'kb/documentsCount',
      evidencesCount: 'kb/evidencesCount',
      filters: 'query/filters',
      layout: 'query/layout',
    }),
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
      // update subgraph selection when filter chnages
      this.setSubGraphByFilters();
    },
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    view(n, o) {
      if (_.isEqual(n, o)) return;
      if (this.view === 'graphs') {
        this.refreshGraphData();
      } else if (this.view === 'maps') {
        this.refreshMapData();
      }
    },
  },
  mounted() {
    this.setMapData();
    this.refresh();
    this.setSubGraphByFilters();
  },
  methods: {
    ...mapActions({
      setView: 'query/setView',
      setSearchClause: 'query/setSearchClause',
      removeSearchTerm: 'query/removeSearchTerm',
      setSelectedSubgraphEdges: 'graph/setSelectedSubgraphEdges',
      setFilteredEdgesCount: 'graph/setFilteredEdgesCount',
    }),
    refresh() {
      if (this.view === 'graphs') {
        this.refreshGraphData();
      } else if (this.view === 'maps') {
        this.refreshMapData();
      }
    },
    refreshGraphData() {
      projectService.getProjectGraph(this.project, this.filters).then((graph) => {
        this.graphData = graph;
      });
    },
    setActive(tabId: string) {
      this.setView(tabId);
    },
    setMapData() {
      this.setMapDataPromise = projectService
        .getProjectLocationsPromise(this.project, filtersUtil.newFilters())
        .then((d) => {
          const transformedData = transformMapData(d.data);
          this.mapData = Object.assign({}, this.mapData, {
            type: 'FeatureCollection',
            features: transformedData,
          });
        });
    },
    refreshMapData() {
      /*
       * 1) Separate out locations into three categories for different color schemes:
       *  - selected (colour scheme: teal)
       *  - related (filtered but not selected, colour scheme: orange)
       *  - unrelated (not in filtered, colour scheme: grey)
       */
      Promise.all([
        projectService.getProjectLocationsPromise(this.project, this.filters),
        this.setMapDataPromise,
      ]).then((results) => {
        const geoJSON = results[0].data.geoJSON;
        const locationNames = geoJSON.features.map((d: GEOPoint) => d.properties.name);
        const geoLocationNameFacet = filtersUtil.findPositiveFacetClause(
          this.filters,
          'factorLocationName'
        );
        const relatedLocations = new Set(locationNames);
        const selectedLocations = new Set();
        if (geoLocationNameFacet && !_.isEmpty(geoLocationNameFacet)) {
          geoLocationNameFacet.values.forEach((v) => {
            selectedLocations.add(v);
          });
        }
        const features = this.mapData?.features.map((feature: GEOPoint) => {
          feature.properties.color = UNSELECTED_REGION_STYLE.fillColor;
          if (selectedLocations.has(feature.properties.name)) {
            feature.properties.color = SELECTED_REGION_STYLE.fillColor;
          } else if (relatedLocations.has(feature.properties.name)) {
            feature.properties.color = SELECTABLE_REGION_STYLE.fillColor;
          }
          return feature;
        });
        this.mapData = Object.assign({}, this.mapData, { features: features });
      });
    },
    setSubGraphByFilters() {
      projectService.getProjectEdges(this.project, this.filters).then((edges) => {
        this.setSelectedSubgraphEdges(edges);
        this.setFilteredEdgesCount(edges.length);
      });
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.tab-panel-container {
  position: relative;
}

.tab-bar-row {
  padding: 0 10px;
}

.tab-content {
  background: $background-light-2;
}

.data-awareness-bar {
  background-color: $background-light-2;
  display: flex;
}
</style>
