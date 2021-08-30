<template>
  <nav class="navbar-container">
    <div class="navbar-left-group">
      <a
        href="#/"
        class="nav-item nav-item--logo"
      >
        <img
          class="logo"
          src="../assets/causemos-icon-white.svg"
          alt="CauseMos logo"
        />
      </a>
      <template
        v-for="(navItem, index) of navItems"
        :key="index"
      >
        <router-link
          v-if="navItem.route !== undefined"
          class="nav-item"
          :to="navItem.route"
        >
          <i class="fa fa-fw" :class="[navItem.icon]" />
          {{ navItem.text }}
        </router-link>
        <div
          v-else
          class="nav-item"
        >
          <i class="fa fa-fw" :class="[navItem.icon]" />
          {{ navItem.text }}
        </div>
      </template>
      <!-- TODO: on home page, pass
        [{ text: 'All Projects' }]
        into itemsAfterProject.
      -->
      <div class="nav-item">
        <slot />
      </div>
    </div>

    <!-- Help button -->
    <a
      v-if="showHelpButton"
      href="https://docs.google.com/presentation/d/1WnIXxAd639IFMOKEAu3E3C1SUgfzsCO6oLLbKOvAZkI/edit#slide=id.g8c51928f8f_0_200"
      target="_blank"
    >
      <i class="fa fa-question" />
    </a>
  </nav>
</template>

<script lang="ts">
import { ProjectType } from '@/types/Enums';
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { useStore } from 'vuex';

interface NavbarItem {
  route?: { name: string; params: any };
  icon?: string;
  text: string;
}

export default defineComponent({
  name: 'NavbarNew',
  props: {
    showHelpButton: {
      type: Boolean,
      default: true
    },
    itemsAfterProject: {
      type: Array as PropType<NavbarItem[]>,
      default: []
    }
  },
  setup(props) {
    const { itemsAfterProject } = toRefs(props);
    const store = useStore();

    const project = computed(() => store.getters['app/project']);
    const projectMetadata = computed(
      () => store.getters['app/projectMetadata']
    );
    const projectType = computed(() => store.getters['app/projectType']);

    const projectNavItem = computed<NavbarItem | null>(() => {
      if (
        project.value === null ||
        projectMetadata.value === null ||
        projectMetadata.value.name === ''
      ) {
        return null;
      }
      const icon = projectType.value === ProjectType.Analysis
        ? 'fa-clone'
        : 'fa-connectdevelop';
      const routeName = projectType.value === ProjectType.Analysis
        ? 'overview'
        : 'domainDatacubeOverview';
      return {
        icon,
        route: { name: routeName, params: { project: project.value } },
        text: projectMetadata.value.name
      };
      //   <li
      //     v-if="projectType === ProjectType.Analysis && currentView !== 'overview'"
      //     class="nav-item"
      //     :class="{'nav-item--label': currentView !== 'nodeDrilldown', underlined: currentView === 'dataComparative' || currentView === 'qualitative' || currentView === 'quantitative'}">
      //     <router-link
      //       v-if="currentView === 'nodeDrilldown'"
      //       class="nav-link"
      //       :to="{name:'quantitative', params:{project: project, currentCAG: currentCAG, projectType: ProjectType.Analysis}}"
      //     >
      //       {{ currentView === 'dataComparative' ? 'Quantitative' : 'Qualitative' }}
      //     </router-link>
      //     <template v-else>
      //       <i v-if="currentView === 'quantitative'" class="fa fa-fw fa-connectdevelop" />
      //       <i v-if="currentView === 'qualitative'" class="fa fa-fw fa-book" />
      //       <i v-if="currentView === 'dataComparative'" class="fa fa-fw fa-line-chart" />
      //       {{ currentView === 'dataComparative' ? 'Quantitative' : 'Qualitative' }}
      //     </template>
      //   </li>
      //   <li
      //     v-if="projectType === ProjectType.Analysis && currentView === 'nodeDrilldown'"
      //     class="nav-item nav-item--label"
      //     :class="{underlined: currentView === 'nodeDrilldown'}">
      //     Node Drilldown
      //   </li>
      // </template>
    });

    const navItems = computed(() => {
      const result = [];
      if (projectNavItem.value !== null) {
        result.push(projectNavItem.value);
      }
      result.push(...itemsAfterProject.value);
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
  padding-left: 15px;
}

.navbar-left-group {
  display: flex;
}

.nav-item {
  color: white;
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 0 10px;
  font-size: $font-size-large;
  font-weight: 600;

  i {
    margin-right: 5px;
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
