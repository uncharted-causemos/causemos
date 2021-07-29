<template>
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <div class="navbar-header">
        <ul class="nav navbar-nav">
          <li
            class="nav-item--logo"
            :class="{active: currentView === 'home'}">
            <a href="#/">
              <img
                class="logo"
                src="../assets/causemos-icon-white.svg"
                alt="CauseMos logo"
              >
            </a>
          </li>
          <li v-if="currentView === 'home'" class="nav-item nav-item--label">
            All Projects
          </li>
          <template v-if="project !== null && projectMetadata !== null && projectMetadata.name !== ''">
            <li
              v-if="projectType !== ProjectType.Analysis"
              class="nav-item"
              :class="{underlined: currentView === 'domainDatacubeOverview'}">
              <router-link
                class="nav-link"
                :to="{name:'domainDatacubeOverview', params:{project: projectMetadata.name}}"
              >
                <i class="fa fa-connectdevelop" />
                {{ projectMetadata.name }}
              </router-link>
            </li>
            <li
              v-if="projectType === ProjectType.Analysis"
              class="nav-item"
              :class="{underlined: currentView === 'overview'}">
              <router-link
                class="nav-link"
                :to="{name:'overview', params:{project: project}}"
              >
                <i class="fa fa-search" />
                {{ projectMetadata.name }}
              </router-link>
            </li>
            <li
              v-if="projectType === ProjectType.Analysis && currentView !== 'overview'"
              class="nav-item nav-item--label"
              :class="{underlined: currentView === 'dataComparative' || currentView === 'qualitative' || currentView === 'quantitative'}">
              {{ currentView === 'dataComparative' ? 'Quantitative' : 'Qualitative' }}
            </li>
          </template>
        </ul>
      </div>

      <!-- Help button -->
      <ul
        class="nav navbar-nav navbar-right help-holder">
        <li class="nav-item nav-item--help">
          <a
            href="https://docs.google.com/presentation/d/1DvixJx4bTkaaIC1mvN26Mf-ykfPzS1NWEmOMMyDWI3E/edit?usp=sharing"
            target="_blank"
          > <i class="fa fa-question" />
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script lang="ts">
import { mapGetters } from 'vuex';
import { defineComponent } from 'vue';

import { ProjectType } from '@/types/Enums';

export default defineComponent({
  name: 'NavBar',
  components: {
  },
  data: () => ({
    ProjectType
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      projectMetadata: 'app/projectMetadata',
      selectedModel: 'model/selectedModel',
      lastQuery: 'query/lastQuery',
      projectType: 'app/projectType'
    })
  }
});
</script>


<style scoped lang="scss">
@import '~styles/variables';

.nav {
  min-height: $navbar-outer-height;
}

.navbar {
  border: none;
  margin-bottom: 0px;
}

a {
  font-weight: 600;
}

.nav-item.underlined {
  border-bottom: 3px solid $selected;
  color: #ffffff;
  .nav-link {
    color: #ffffff;
  }
}

button {
  height: $navbar-outer-height;
  background-color: transparent;
  border: none;
}

.container-fluid {
  padding-right: 0;
}

$logo-size: 28px;

.nav-item--logo {
  height: $navbar-outer-height;
  display: flex;
  align-items: center;
  justify-content: center;

  a {
    padding: ($navbar-outer-height - $logo-size) / 2;
  }
}

.logo {
  height: $logo-size;
  position: relative;
  // Nudge the logo up a little bit so it's more visually centered
  bottom: $logo-size / 10;
}

.nav-item--label {
  color: white;
  padding: 14.5px;
  line-height: 19px;
  font-weight: 600;
}

.help-holder {
  margin: 0;
}

.nav-item--help {
  right: 10px;
}

</style>
