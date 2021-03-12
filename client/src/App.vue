<template>
  <div id="app">
    <overlay
      v-if="overlayActivated"
      :message="overlayMessage"
    />
    <nav-bar v-if="!isNavBarHidden" />
    <router-view />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import NavBar from '@/components/nav-bar';
import Overlay from '@/components/overlay';
import projectService from '@/services/project-service';
import 'leaflet/dist/leaflet.css';

/* Vue Resize helper */
import 'vue-resize/dist/vue-resize.css';

const viewsWithNoNavbar = [
  'kbExplorer',
  'dataExplorer',
  'createDataCube'
];

export default {
  name: 'App',
  components: {
    NavBar,
    Overlay
  },
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
      overlayMessage: 'app/overlayMessage',
      overlayActivated: 'app/overlayActivated',
      project: 'app/project'
    }),
    isNavBarHidden() {
      return viewsWithNoNavbar.includes(this.currentView);
    }
  },
  watch: {
    project: function() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setOntologyConcepts: 'app/setOntologyConcepts',
      setProjectMetadata: 'app/setProjectMetadata',
      setConceptDefinitions: 'app/setConceptDefinitions'
    }),
    refresh() {
      if (_.isEmpty(this.project)) {
        this.setOntologyConcepts([]);
        this.setProjectMetadata({});
        return;
      }
      projectService.getProject(this.project).then(project => {
        this.setProjectMetadata(project);
      });

      projectService.getProjectOntologyDefinitions(this.project).then(data => {
        this.setConceptDefinitions(data);
        this.setOntologyConcepts(Object.keys(data));
      });
    }
  }
};
</script>

<style lang="scss">

/* Font awesome */
$fa-font-path: '~font-awesome/fonts';
@import '~font-awesome/scss/font-awesome';


/* Uncharted Booststrap */
$uncharted-font-path: '~@uncharted/uncharted-bootstrap/dist/fonts/';
$icon-font-path: '~@uncharted/uncharted-bootstrap/dist/fonts/bootstrap-sass/assets/fonts/bootstrap/';
@import "~@uncharted/uncharted-bootstrap/scss/uncharted-bootstrap";

/* Uncharted stories facet */
@import '~@uncharted.software/stories-facets/dist/facets.min.css';


/* World Modeler style and overrides */
@import "/styles/wm-theme/wm-overrides";
@import "/styles/wm";

</style>
