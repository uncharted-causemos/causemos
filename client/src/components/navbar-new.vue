<template>
  <nav class="navbar-container">
    <div class="navbar-left-group">
      <a href="#/" class="nav-item nav-item--logo clickable">
        <img
          class="logo"
          src="../assets/causemos-icon-white.svg"
          alt="CauseMos logo"
        />
      </a>
      <template v-for="(navItem, index) of navItems" :key="index">
        <router-link
          v-if="navItem.isActive === false"
          class="nav-item clickable"
          :to="navItem.route"
        >
          <i class="fa fa-fw" :class="[navItem.icon]" />
          <span class="nav-item-label">{{ navItem.text }}</span>
        </router-link>
        <div v-else class="nav-item active">
          <i class="fa fa-fw" :class="[navItem.icon]" />
          <span class="nav-item-label">{{ navItem.text }}</span>
        </div>
      </template>
      <div class="trailing">
        <slot />
      </div>
    </div>

    <!-- Help button -->
    <a
      v-if="showHelpButton"
      href="https://docs.google.com/presentation/d/1WnIXxAd639IFMOKEAu3E3C1SUgfzsCO6oLLbKOvAZkI/edit#slide=id.g8c51928f8f_0_200"
      target="_blank"
      class="nav-item clickable"
    >
      <i class="fa fa-question" />
    </a>
  </nav>
</template>

<script lang="ts">
import { getAnalysis } from '@/services/analysis-service';
import { ProjectType } from '@/types/Enums';
import { computed, defineComponent, onMounted, PropType, ref, toRefs } from 'vue';
import { useStore } from 'vuex';

interface NavbarItem {
  route: { name: string; params: any } | null;
  icon?: string;
  text: string;
  isActive: boolean;
}

const ANALYSIS_PROJECT_ICON = 'fa-clone';
const DATACUBE_PROJECT_ICON = 'fa-connectdevelop';
const QUANTITATIVE_ANALYSIS_ICON = 'fa-line-chart';
const QUALITATIVE_ANALYSIS_ICON = 'fa-book';
const NODE_DRILLDOWN_ICON = 'fa-circle';

// TODO: Is there a cleaner way to determine whether the current view is part
//  of a quantitative or quantitative analysis?
//  If so, do that.
//  If not, flesh out this list.
const DATA_ANALYSIS_VIEWS = ['dataComparative'];

export default defineComponent({
  name: 'NavbarNew',
  props: {
    showHelpButton: {
      type: Boolean,
      default: true
    },
    // The page that contains this navbar will know when a user renames an
    //  analysis. This prop is a way to let the navbar know about the new name
    //  to avoid needing to re-fetch it.
    changedAnalysisName: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  setup(props) {
    const { changedAnalysisName } = toRefs(props);
    const store = useStore();

    const project = computed(() => store.getters['app/project']);
    const projectMetadata = computed(
      () => store.getters['app/projectMetadata']
    );
    const projectType = computed(() => store.getters['app/projectType']);
    const currentView = computed(() => store.getters['app/currentView']);
    const quantitativeAnalysisId = computed(
      () => store.getters['dataAnalysis/analysisId']
    );

    const analysisNameOnMounted = ref('');
    onMounted(async () => {
      // TODO: fetch the right analysis name depending on whether this
      //  is a quantitative or qualitiative analysis
      // TODO: handle case where no analysis is open
      const result = await getAnalysis(quantitativeAnalysisId.value);
      analysisNameOnMounted.value = result.title;
    });

    const isCurrentAnalysisInDataSpace = computed(() => {
      return DATA_ANALYSIS_VIEWS.includes(currentView.value);
    });

    const navItems = computed(() => {
      const result: NavbarItem[] = [];
      if (
        project.value === null ||
        projectMetadata.value === null ||
        projectMetadata.value.name === ''
      ) {
        return result;
      }

      // Add an item for the current project
      const projectTypeIcon =
        projectType.value === ProjectType.Analysis
          ? ANALYSIS_PROJECT_ICON
          : DATACUBE_PROJECT_ICON;
      const projectRouteName =
        projectType.value === ProjectType.Analysis
          ? 'overview'
          : 'domainDatacubeOverview';
      const projectNavItem = {
        icon: projectTypeIcon,
        route: { name: projectRouteName, params: { project: project.value } },
        text: projectMetadata.value.name,
        isActive: false
      };
      result.push(projectNavItem);

      if (
        projectType.value === ProjectType.Analysis &&
        currentView.value !== 'overview'
      ) {
        // Add an item for the current analysis
        // TODO: this nav item will require a route in qualitative analyses
        // {name:'quantitative', params:{project: project, currentCAG: currentCAG, projectType: ProjectType.Analysis}}
        const analysisNavItem = {
          icon: isCurrentAnalysisInDataSpace.value
            ? QUANTITATIVE_ANALYSIS_ICON
            : QUALITATIVE_ANALYSIS_ICON,
          route: null,
          text: changedAnalysisName.value ?? analysisNameOnMounted.value,
          isActive: false
        };
        result.push(analysisNavItem);

        if (currentView.value === 'nodeDrilldown') {
          // Add an item for the current node
          const nodeDrilldownNavItem = {
            icon: NODE_DRILLDOWN_ICON,
            route: null,
            text: 'Node drilldown',
            isActive: false
          };
          result.push(nodeDrilldownNavItem);
        }
      }

      // The last entry in the current navigation path is always the one that's
      //  active
      result[result.length - 1].isActive = true;
      return result;
    });

    return {
      navItems
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.navbar-container {
  height: $navbar-outer-height;
  display: flex;
  justify-content: space-between;
  background: #363434;
  padding: 0 15px;
}

.navbar-left-group {
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
  padding: ($navbar-outer-height - $logo-size) / 2;
}

.logo {
  height: $logo-size;
  position: relative;
  // Nudge the logo up a little bit so it's more visually centered
  bottom: $logo-size / 10;
}
</style>
