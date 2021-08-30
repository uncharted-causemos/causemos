<template>
  <nav class="navbar-container">
    <div class="navbar-left-group">
      <a
        href="#/"
        class="nav-item nav-item--logo clickable"
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
          class="nav-item clickable"
          :to="navItem.route"
        >
          <i class="fa fa-fw" :class="[navItem.icon]" />
          <span class="nav-item-label">{{ navItem.text }}</span>
        </router-link>
        <div
          v-else
          class="nav-item"
        >
          <i class="fa fa-fw" :class="[navItem.icon]" />
          <span class="nav-item-label">{{ navItem.text }}</span>
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
      class="nav-item clickable"
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
      // TODO: route should be `null` if
      //  - itemsAfterProject.length === 0
      //  AND
      //  - nothing is passed into the slot
      const routeName = projectType.value === ProjectType.Analysis
        ? 'overview'
        : 'domainDatacubeOverview';
      return {
        icon,
        route: { name: routeName, params: { project: project.value } },
        text: projectMetadata.value.name
      };
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
  padding: 0 15px;
}

.navbar-left-group {
  display: flex;
}

.nav-item {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 0 10px;

  i {
    margin-right: 5px;
  }
}

.clickable:hover {
  background: rgba(255, 255, 255, 0.2);

  .nav-item-label, i {
    color: white;
  }
}

.nav-item-label, i {
  color: rgba(255, 255, 255, 0.71);
  font-size: $font-size-large;
}

.nav-item-label {
  font-weight: 600;
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
