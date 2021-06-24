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
import domainProjectService from '@/services/domain-project-service';
import { ProjectType } from '@/types/Enums';

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
      projectType: 'app/projectType'
    }),
    isNavBarHidden() {
      return viewsWithNoNavbar.includes(this.currentView);
    }
  },
  watch: {
    project: function() {
      if (_.isEmpty(this.project)) {
        this.setProjectMetadata({});
        return;
      }
      if (this.projectType === ProjectType.Analysis) {
        this.refresh();
      } else {
        this.refreshDomainProject();
      }
    }
  },
  mounted() {
    if (_.isEmpty(this.project)) {
      this.setProjectMetadata({});
      return;
    }
    if (this.projectType === ProjectType.Analysis) {
      this.refresh();
    } else {
      this.refreshDomainProject();
    }
  },
  methods: {
    ...mapActions({
      setOntologyConcepts: 'app/setOntologyConcepts',
      setProjectMetadata: 'app/setProjectMetadata',
      setConceptDefinitions: 'app/setConceptDefinitions'
    }),
    refreshDomainProject() {
      if (_.isEmpty(this.project)) {
        return;
      }
      domainProjectService.getProject(this.project).then(project => {
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
