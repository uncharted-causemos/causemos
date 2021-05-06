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
          <li class="nav-item nav-item--label">
            <span>{{ projectMetadata.name || project }}</span>
            <span v-if="currentView === 'home'">
              All Projects
            </span>
          </li>
          <li
            v-if="project !== null"
            class="nav-item"
            :class="{underlined: currentView === 'overview'}">
            <router-link
              class="nav-link"
              :to="{name:'overview', params:{project: project}}"
            ><i class="fa fa-search" />
              Overview</router-link>
          </li>
          <li
            v-if="project!== null"
            class="nav-item"
            :class="{underlined: currentView === 'dataStart' || currentView === 'data'}">
            <router-link
              class="nav-link"
              :to="{name:'dataStart', params:{project: project}}"
            ><i class="fa fa-table" />
              Data</router-link>
          </li>
          <li
            v-if="project!== null"
            class="nav-item"
            :class="{underlined: currentView === 'qualitative' || currentView === 'qualitativeStart'}">
            <router-link
              class="nav-link"
              :to="{name:'qualitativeStart', params:{project: project} }"
            ><i class="fa fa-book" />
              Knowledge</router-link>
          </li>
          <li
            v-if="project!== null"
            class="nav-item"
            :class="{underlined: currentView === 'quantitativeStart' || currentView === 'quantitative'}">
            <router-link
              class="nav-link"
              :to="{name: 'quantitativeStart', params:{project}}"
            > <i class="fa fa-connectdevelop" />
              Models</router-link>
          </li>
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

      <!-- Bookmarking -->
      <bookmark-controls v-if="currentView === 'qualitative' || currentView === 'quantitative' || currentView === 'modelPublishingExperiment'" />
    </div>
  </nav>
</template>

<script>
import { mapGetters } from 'vuex';

import BookmarkControls from '@/components/bookmark-panel/bookmark-controls';

export default {
  name: 'NavBar',
  components: {
    BookmarkControls
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      projectMetadata: 'app/projectMetadata',
      selectedModel: 'model/selectedModel',
      lastQuery: 'query/lastQuery'
    })
  }
};
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
