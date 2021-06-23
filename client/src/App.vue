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
import domainModelProjectService from '@/services/domain-model-project-service';

/* Vue Resize helper */
import 'vue3-resize/dist/vue3-resize.css';


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
      project: 'app/project',
      isDomainModelProject: 'app/isDomainModelProject'
    }),
    isNavBarHidden() {
      return viewsWithNoNavbar.includes(this.currentView);
    }
  },
  watch: {
    project: function() {
      if (this.isDomainModelProject) {
        this.refreshDomainModel();
      } else {
        this.refresh();
      }
    }
  },
  mounted() {
    if (this.isDomainModelProject) {
      this.refreshDomainModel();
    } else {
      this.refresh();
    }
  },
  methods: {
    ...mapActions({
      setOntologyConcepts: 'app/setOntologyConcepts',
      setProjectMetadata: 'app/setProjectMetadata',
      setConceptDefinitions: 'app/setConceptDefinitions'
    }),
    refreshDomainModel() {
      if (_.isEmpty(this.project)) {
        return;
      }
      domainModelProjectService.getProject(this.project).then(project => {
        this.setProjectMetadata({ name: project.name });
      });
    },
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


/* Uncharted Bootstrap */
$uncharted-font-path: '~@uncharted/uncharted-bootstrap/dist/fonts/';
$icon-font-path: '~@uncharted/uncharted-bootstrap/dist/fonts/bootstrap-sass/assets/fonts/bootstrap/';
@import "~@uncharted/uncharted-bootstrap/scss/uncharted-bootstrap";

/* Sass entrypoint */
@import "/styles/wm";

</style>
