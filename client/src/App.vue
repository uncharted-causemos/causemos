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
import API from '@/api/api';
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
      setConceptExamples: 'app/setConceptExamples'
    }),
    refresh() {
      if (_.isEmpty(this.project)) {
        this.setOntologyConcepts([]);
        this.setProjectMetadata({});
        return;
      }
      API.get(`projects/${this.project}`, {}).then(result => {
        this.setProjectMetadata(result.data);
      });

      API.get(`projects/${this.project}/ontology-examples`, {}).then(result => {
        this.setConceptExamples(result.data);
        this.setOntologyConcepts(Object.keys(result.data));
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
@import "/styles/wm-theme/wm-theme";
@import "/styles/wm-theme/wm-overrides";
@import "/styles/wm";

</style>
