<template>
  <div id="app">
    <overlay
      v-if="overlayActivated"
      :message="overlayMessage"
      :cancel-fn="overlayCancelFn"
    />
    <nav-bar />
    <insight-manager />
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
import InsightManager from '@/components/insight-manager/insight-manager.vue';

/* Vue Resize helper */
import 'vue3-resize/dist/vue3-resize.css';

export default {
  name: 'App',
  components: {
    NavBar,
    Overlay,
    InsightManager
  },
  computed: {
    ...mapGetters({
      overlayMessage: 'app/overlayMessage',
      overlayActivated: 'app/overlayActivated',
      overlayCancelFn: 'app/overlayCancelFn',
      project: 'app/project',
      projectType: 'app/projectType'
    })
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
    console.log(process.env.VUE_APP_GIT_HASH); // print out current git commit SHA
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
    async refreshDomainProject() {
      if (_.isEmpty(this.project)) {
        return;
      }

      let projectId = this.project;

      // TODO: an ideal solution would be to have some sort of dispatcher page
      //  that just takes the datacubeId and sends the domain-modeler user to the proper place
      //  This will allow cleaner redirection from Jataware side once a model registration is complete
      const domainProjectSearchFields = { // DomainProjectFilterFields
        type: 'model'
      };
      const existingProjects = await domainProjectService.getProjects(domainProjectSearchFields);
      const domainProjectNames = existingProjects.map(p => p.name);
      if (domainProjectNames.includes(this.project)) {
        // this is a special case where Jataware has redirected to a given domain-project page
        projectId = existingProjects.find(p => p.name === this.project).id;
      }

      domainProjectService.getProject(projectId).then(project => {
        this.setProjectMetadata(project);
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

/* Shepherd site tour (i.e., onboarding) */
@import '~shepherd.js/dist/css/shepherd.css';
// override default CSS from shepherd
/*
.shepherd-element {
  border-style: solid;
  border-color: red;
  border-width: 5px;
  .shepherd-content {
    .shepherd-header {
      .shepherd-title {
        color: red;
      }
    }
  }
}
*/
.shepherd-target.my-highlight {
  border-style: solid;
  border-color: red;
  border-width: 3px;
}
.shepherd-element.my-container {
  border-style: solid;
  border-color: gray;
  border-width: 1px;
}
.shepherd-element.my-title .shepherd-title {
  color: black;
  font-size: large;
  font-weight: bold;
  padding: 0;
}
.shepherd-element.my-text .shepherd-text {
  color: rgb(37, 36, 36);
  font-size: medium;
}

/* Font awesome */
$fa-font-path: '~font-awesome/fonts';
@import '~font-awesome/scss/font-awesome';


/* Uncharted Bootstrap */
$uncharted-font-path: '~@uncharted/uncharted-bootstrap/dist/fonts/';
$icon-font-path: '~@uncharted/uncharted-bootstrap/dist/fonts/bootstrap-sass/assets/fonts/bootstrap/';
@import "~@uncharted/uncharted-bootstrap/scss/uncharted-bootstrap";

/* Sass entrypoint */
@import "/styles/wm";

@import '~pdfjs-dist/legacy/web/pdf_viewer.css';
</style>
