<template>
  <div id="app">
    <overlay
      v-if="overlayActivated"
      :message="overlayMessage"
      :messageSecondary="overlayMessageSecondary"
      :cancel-fn="overlayCancelFn"
    />
    <nav-bar class="nav-bar" />
    <insight-manager class="insight-manager" />
    <router-view />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import NavBar from '@/components/nav-bar.vue';
import Overlay from '@/components/overlay.vue';
import projectService from '@/services/project-service';
import domainProjectService from '@/services/domain-project-service';
import { ProjectType } from '@/types/Enums';
import InsightManager from '@/components/insight-manager/insight-manager.vue';
import { enableConcurrentTileRequestsCaching } from '@/utils/map-util';

/* Vue Resize helper */
import 'vue3-resize/dist/vue3-resize.css';
import { getDataset } from '@/services/datacube-service';
import useApplicationConfiguration from '@/composables/useApplicationConfiguration';

export default defineComponent({
  name: 'App',
  components: {
    NavBar,
    Overlay,
    InsightManager,
  },
  setup() {
    useApplicationConfiguration();
  },
  computed: {
    ...mapGetters({
      overlayMessage: 'app/overlayMessage',
      overlayMessageSecondary: 'app/overlayMessageSecondary',
      overlayActivated: 'app/overlayActivated',
      overlayCancelFn: 'app/overlayCancelFn',
      project: 'app/project',
      projectType: 'app/projectType',
    }),
  },
  watch: {
    project: function () {
      if (_.isEmpty(this.project)) {
        this.setProjectMetadata({});
        return;
      }
      switch (this.projectType) {
        case ProjectType.Analysis:
          this.refresh();
          break;
        case ProjectType.Dataset:
          this.refreshDatasetProject();
          break;
        case ProjectType.Model:
          this.refreshDomainProject();
          break;
        default:
          console.error('Unknown project type', this.projectType);
          break;
      }
    },
  },
  mounted() {
    // Enable global map cache
    enableConcurrentTileRequestsCaching();

    if (_.isEmpty(this.project)) {
      this.setProjectMetadata({});
      return;
    }
    switch (this.projectType) {
      case ProjectType.Analysis:
        this.refresh();
        break;
      case ProjectType.Dataset:
        this.refreshDatasetProject();
        break;
      case ProjectType.Model:
        this.refreshDomainProject();
        break;
      default:
        console.error('Unknown project type', this.projectType);
        break;
    }
  },
  methods: {
    ...mapActions({
      setProjectMetadata: 'app/setProjectMetadata',
    }),
    async refreshDomainProject() {
      if (_.isEmpty(this.project)) {
        return;
      }

      let projectId = this.project;

      // TODO: an ideal solution would be to have some sort of dispatcher page
      //  that just takes the datacubeId and sends the domain-modeler user to the proper place
      //  This will allow cleaner redirection from Jataware side once a model registration is complete
      const domainProjectSearchFields = {
        // DomainProjectFilterFields
        type: 'model',
      };
      const existingProjects = await domainProjectService.getProjects(domainProjectSearchFields);
      const domainProjectNames = existingProjects.map((p: any) => p.name);
      if (domainProjectNames.includes(this.project)) {
        // this is a special case where Jataware has redirected to a given domain-project page
        projectId = existingProjects.find((p: any) => p.name === this.project).id;
      }

      domainProjectService.getProject(projectId).then((project) => {
        this.setProjectMetadata(project);
      });
    },
    async refreshDatasetProject() {
      if (_.isEmpty(this.project)) {
        return;
      }

      const dataId = this.project;
      const dataset = await getDataset(dataId);
      this.setProjectMetadata(dataset);
    },
    refresh() {
      if (_.isEmpty(this.project)) {
        this.setProjectMetadata({});
        return;
      }
      projectService.getProject(this.project).then((project) => {
        this.setProjectMetadata(project);
      });
    },
  },
});
</script>

<style lang="scss">
/* Font awesome */
$fa-font-path: 'font-awesome/fonts';
@import 'font-awesome/scss/font-awesome';

/* Sass entrypoint */
@import './styles/wm';

@import 'pdfjs-dist/legacy/web/pdf_viewer.css';

#app {
  isolation: isolate;

  .nav-bar {
    position: relative;
    z-index: 1;
  }

  .insight-manager {
    z-index: 2;
  }
}
</style>
