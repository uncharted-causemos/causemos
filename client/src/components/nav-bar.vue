<template>
  <nav class="navbar-container" v-if="isNavbarVisible">
    <div class="navbar-left-group">
      <a href="#/" class="nav-item nav-item--logo clickable">
        <img class="logo" src="../assets/causemos-logo-colour.svg" alt="CauseMos logo" />
      </a>
      <template v-for="(navItem, index) of navItems" :key="index">
        <i v-if="index !== 0" class="fa fa-fw fa-caret-right breadcrumb-caret" />
        <!-- ASSUMPTION: navItem.route is not null for all navItems except for the last one -->
        <router-link
          v-if="index !== navItems.length - 1"
          class="nav-item clickable"
          :to="navItem.route ?? ''"
        >
          <i class="fa fa-fw" :class="[navItem.icon]" />
          <span class="nav-item-label">{{ navItem.text }}</span>
        </router-link>
        <!-- The last navItem is considered "active" and not clickable -->
        <div v-else class="nav-item active">
          <i class="fa fa-fw" :class="[navItem.icon]" />
          <span class="nav-item-label">{{ navItem.text }}</span>
        </div>
      </template>
      <div id="navbar-trailing-teleport-destination" class="trailing"></div>
    </div>

    <div class="navbar-right-group">
      <div v-if="showNavbarInsightsPanelButton" class="nav-item insights-controls">
        <div
          class="nav-item clickable navbar-insights-panel-button"
          @click="showNavbarInsightsPanel = !showNavbarInsightsPanel"
        >
          <i class="fa fa-fw fa-star" />
          <span class="nav-item-label">Insights</span>
        </div>

        <NavbarInsightsPanel
          v-if="showNavbarInsightsPanel"
          class="navbar-insights-panel"
          @close="showNavbarInsightsPanel = false"
        />
      </div>
      <a
        :href="applicationConfiguration.CLIENT__USER_DOCS_URL"
        target="_blank"
        class="nav-item clickable"
      >
        <i class="fa fa-question" />
      </a>
      <div class="nav-item clickable" @click="logout">
        <i class="fa fa-sign-out" />
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import { ProjectType } from '@/types/Enums';
import { computed, defineComponent, ref } from 'vue';
import { useRoute } from 'vue-router';
import { mapActions, useStore } from 'vuex';
import NavbarInsightsPanel from '@/components/insight-manager/navbar-insights-panel.vue';
import useApplicationConfiguration from '@/composables/useApplicationConfiguration';
import useModelOrDatasetName from '@/composables/useModelOrDatasetName';

interface NavBarItem {
  route: { name: string; params: any } | null;
  icon?: string;
  text: string;
}

export default defineComponent({
  name: 'NavBar',
  components: {
    NavbarInsightsPanel,
  },
  setup() {
    const store = useStore();
    const project = computed(() => store.getters['app/project']);
    const projectMetadata = computed(() => store.getters['app/projectMetadata']);
    const route = useRoute();
    // New data space pages use `route.query.analysis_id`, while other existing pages use
    //  `route.params.analysisId`.
    const analysisId = computed(
      () => (route.query.analysis_id as string) ?? (route.params.analysisId as string)
    );
    const analysisName = computed(() => store.getters['app/analysisName']);

    const datacubeId = computed(() => (route.params.datacubeId as string) ?? null);
    const modelOrDatasetName = useModelOrDatasetName(datacubeId);

    const analysisProjectItem = computed<NavBarItem>(() => ({
      text: projectMetadata.value.name,
      icon: 'fa-folder',
      route: { name: 'overview', params: { project: project.value } },
    }));
    const datacubeProjectItem = computed<NavBarItem>(() => {
      const navBarItem = {
        text: projectMetadata.value.name,
        icon: projectMetadata.value.type === 'model' ? 'fa-connectdevelop' : 'fa-table',
        route: {
          name:
            projectMetadata.value.type === 'model' ? 'domainDatacubeOverview' : 'datasetOverview',
          params: { project: project.value },
        },
      };
      return navBarItem;
    });

    const quantitativeAnalysisItem = computed(() => ({
      text: analysisName.value,
      icon: 'fa-list',
      route: {
        name: 'dataComparative',
        params: {
          project: project.value,
          analysisId: analysisId.value,
          projectType: ProjectType.Analysis,
        },
      },
    }));

    const indexStructureItem = computed(() => ({
      text: analysisName.value,
      icon: 'fa-book',
      route: {
        name: 'indexStructure',
        params: {
          project: project.value,
          analysisId: analysisId.value,
          projectType: ProjectType.Analysis,
        },
      },
    }));
    const indexResultsItem = computed(() => ({
      text: 'Results',
      icon: 'fa-map',
      route: {
        name: 'indexStructure',
        params: {
          project: project.value,
          analysisId: analysisId.value,
          projectType: ProjectType.Analysis,
        },
      },
    }));
    const indexProjectionsItem = computed(() => ({
      text: 'Projections',
      icon: 'fa-line-chart',
      route: {
        name: 'indexProjections',
        params: {
          project: project.value,
          analysisId: analysisId.value,
          projectType: ProjectType.Analysis,
        },
      },
    }));

    const getPreviousRouteItemForDrilldown = () => {
      if (route.query.index_node_id) return indexStructureItem.value;
      if (route.query.index_projections_node_id) return indexProjectionsItem.value;
      return quantitativeAnalysisItem.value;
    };

    const siteMap = computed<{ [key: string]: NavBarItem[] }>(() => ({
      home: [],
      newDomainProject: [],
      domainDatacubeOverview: [datacubeProjectItem.value],
      datasetOverview: [datacubeProjectItem.value],
      modelPublisher: [
        datacubeProjectItem.value,
        { icon: 'fa-cube', route: null, text: 'Instance' },
      ],
      indicatorPublisher: [
        datacubeProjectItem.value,
        { icon: 'fa-cube', route: null, text: 'Indicator' },
      ],
      overview: [analysisProjectItem.value],
      dataComparative: [analysisProjectItem.value, quantitativeAnalysisItem.value],
      data: [
        analysisProjectItem.value,
        quantitativeAnalysisItem.value,
        { icon: 'fa-cube', route: null, text: 'Datacube drilldown' },
      ],
      indexResultsDataExplorer: [
        analysisProjectItem.value,
        indexStructureItem.value,
        { icon: 'fa-cube', route: null, text: 'Datacube drilldown' },
      ],
      projectionsDataExplorer: [
        analysisProjectItem.value,
        indexStructureItem.value,
        indexProjectionsItem.value,
        { icon: 'fa-cube', route: null, text: 'Datacube drilldown' },
      ],
      indexStructure: [analysisProjectItem.value, indexStructureItem.value],
      indexResults: [analysisProjectItem.value, indexStructureItem.value, indexResultsItem.value],
      indexProjections: [
        analysisProjectItem.value,
        indexStructureItem.value,
        indexProjectionsItem.value,
      ],
      documents: [
        analysisProjectItem.value,
        { icon: 'fa-book', route: null, text: 'Explore documents' },
      ],
      modelDrilldown: [
        analysisProjectItem.value,
        quantitativeAnalysisItem.value,
        {
          icon: 'fa-connectdevelop',
          route: null,
          text: modelOrDatasetName.value ?? 'Model drilldown',
        },
      ],
      datasetDrilldown: [
        analysisProjectItem.value,
        getPreviousRouteItemForDrilldown(),
        { icon: 'fa-table', route: null, text: modelOrDatasetName.value ?? 'Dataset drilldown' },
      ],
    }));

    const currentView = computed(() => store.getters['app/currentView']);
    const navItems = computed(() => siteMap.value[currentView.value] ?? null);
    const isNavbarVisible = computed(() => navItems.value !== null);
    const VIEWS_WITH_NAVBAR_INSIGHTS_PANEL = [
      'indexStructure',
      'indexResults',
      'indexProjections',
      'modelDrilldown',
      'datasetDrilldown',
    ];
    const showNavbarInsightsPanelButton = computed(() =>
      VIEWS_WITH_NAVBAR_INSIGHTS_PANEL.includes(currentView.value)
    );
    const showNavbarInsightsPanel = ref(false);

    const { applicationConfiguration } = useApplicationConfiguration();

    return {
      navItems,
      isNavbarVisible,
      showNavbarInsightsPanelButton,
      showNavbarInsightsPanel,
      applicationConfiguration,
    };
  },
  methods: {
    ...mapActions({
      logout: 'auth/logout',
    }),
  },
});
</script>

<style scoped lang="scss">
@import '@/styles/variables';

.navbar-container {
  height: $navbar-outer-height;
  display: flex;
  justify-content: space-between;
  background: var(--p-surface-0);
  padding: 0.5rem;
  padding-right: 1rem;
  border-bottom: 1px solid var(--p-content-border-color);
  transition: left var(--p-transition-duration);
}

.navbar-left-group,
.navbar-right-group {
  display: flex;
  gap: 1rem;
}

.trailing {
  align-self: center;
}

.nav-item {
  display: flex;
  align-items: center;
  text-decoration: none;
  border-radius: var(--p-border-radius-md);
  padding: 0 10px;
  gap: 0.25rem;

  .nav-item-label,
  i {
    color: var(--p-text-muted-color);
  }

  &.clickable {
    cursor: pointer;
    transition: background-color var(--p-transition-duration) ease;
  }
}

.nav-item.clickable {
  &:hover {
    color: var(--p-text-color);
    background-color: var(--p-primary-50);
  }
}

.nav-item.active {
  .nav-item-label,
  i {
    color: var(--p-text-color);
  }
}

.breadcrumb-caret {
  color: var(--p-surface-300);
  align-self: center;
}

// Logo

.nav-item--logo {
  padding: 0;
  margin-right: 2rem;
}

.logo {
  height: 130%;
  position: relative;
  bottom: 10%;
}

// Insights

.insights-controls {
  display: flex;
  position: relative;
}

.navbar-insights-panel-button {
  height: 100%;
}

.navbar-insights-panel {
  position: absolute;
  width: 270px;
  height: 700px;
  top: calc(100% - 5px);
  right: 0;
}
</style>
