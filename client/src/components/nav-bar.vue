<template>
  <nav class="navbar-container" v-if="isNavbarVisible">
    <div class="navbar-left-group">
      <a href="#/" class="nav-item nav-item--logo clickable">
        <img class="logo" src="../assets/causemos-icon-white.svg" alt="CauseMos logo" />
      </a>
      <template v-for="(navItem, index) of navItems" :key="index">
        <router-link
          v-if="index !== navItems.length - 1"
          class="nav-item clickable"
          :to="navItem.route"
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
      <!-- Help button -->
      <!-- Old resources
        Up until Mar 2022: https://docs.google.com/presentation/d/19PeNAoCIxNCQxXAZNV4Gn4kMVPCAJKYlLXQCJ6V2SZM/edit?usp=sharing
      -->
      <a
        href="https://docs.google.com/presentation/d/19PeNAoCIxNCQxXAZNV4Gn4kMVPCAJKYlLXQCJ6V2SZM/edit?usp=sharing"
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
    const analysisId = computed(() => route.params.analysisId as string);
    const analysisName = computed(() => store.getters['app/analysisName']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);

    const analysisProjectItem = computed<NavBarItem>(() => ({
      text: projectMetadata.value.name,
      icon: 'fa-clone',
      route: { name: 'overview', params: { project: project.value } },
    }));
    const datacubeProjectItem = computed<NavBarItem>(() => {
      const navBarItem = {
        text: projectMetadata.value.name,
        icon: 'fa-connectdevelop',
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
      icon: 'fa-line-chart',
      route: {
        name: 'dataComparative',
        params: {
          project: project.value,
          analysisId: analysisId.value,
          projectType: ProjectType.Analysis,
        },
      },
    }));
    const qualitativeAnalysisItem = computed(() => ({
      text: analysisName.value,
      icon: 'fa-book',
      route: {
        name: 'quantitative',
        params: {
          project: project.value,
          currentCAG: currentCAG.value,
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
      qualitative: [analysisProjectItem.value, qualitativeAnalysisItem.value],
      quantitative: [analysisProjectItem.value, qualitativeAnalysisItem.value],
      indexStructure: [analysisProjectItem.value, indexStructureItem.value],
      indexResults: [analysisProjectItem.value, indexStructureItem.value, indexResultsItem.value],
      indexProjections: [
        analysisProjectItem.value,
        indexStructureItem.value,
        indexProjectionsItem.value,
      ],
      nodeDrilldown: [
        analysisProjectItem.value,
        qualitativeAnalysisItem.value,
        { icon: 'fa-circle', route: null, text: 'Node drilldown' },
      ],
      // 'nodeDataDrilldown',
      // 'nodeDataExplorer',
      // 'kbExplorer',
      // 'dataExplorer',
    }));

    const currentView = computed(() => store.getters['app/currentView']);
    const navItems = computed(() => siteMap.value[currentView.value] ?? null);
    const isNavbarVisible = computed(() => navItems.value !== null);
    const VIEWS_WITH_NAVBAR_INSIGHTS_PANEL = ['indexStructure'];
    const showNavbarInsightsPanelButton = computed(() =>
      VIEWS_WITH_NAVBAR_INSIGHTS_PANEL.includes(currentView.value)
    );
    const showNavbarInsightsPanel = ref(false);

    return {
      navItems,
      isNavbarVisible,
      showNavbarInsightsPanelButton,
      showNavbarInsightsPanel,
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
  background: $accent-darkest;
  padding: 0 15px;
}

.navbar-left-group,
.navbar-right-group {
  display: flex;

  & > .nav-item:not(:first-child) {
    margin-left: 10px;
  }
}

.trailing {
  align-self: center;
}

.nav-item {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 0 10px;

  i {
    margin-right: 5px;
  }

  .nav-item-label,
  i {
    color: rgba(255, 255, 255, 0.71);
    font-size: $font-size-large;
  }
}

.clickable {
  cursor: pointer;
}

.nav-item.clickable:hover {
  background: rgba(255, 255, 255, 0.2);

  .nav-item-label,
  i {
    color: white;
  }
}

.nav-item.active {
  .nav-item-label,
  i {
    color: white;
  }
  .nav-item-label {
    font-weight: 600;
  }
}

$logo-size: 28px;

.nav-item--logo {
  padding: calc(#{$navbar-outer-height - $logo-size} / 2);
}

.logo {
  height: $logo-size;
  position: relative;
  // Nudge the logo up a little bit so it's more visually centered
  bottom: calc(#{$logo-size} / 10);
}

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
