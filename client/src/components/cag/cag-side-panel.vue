<template>
  <side-panel
    class="cag-side-panel-container"
    :tabs="tabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
    <list-analytical-questions-pane
      v-if="currentTab === 'Analysis Checklist'"
    />

    <list-context-insight-pane v-if="currentTab === 'Context Insights'" />

    <div v-if="currentTab === 'Details'" class="details-pane">
      <p v-if="modelComponents !== null">
        This CAG contains <strong>{{ nodeCount }}</strong> node{{ nodeCount !== 1 ? 's' : '' }}
        and <strong>{{ edgeCount }}</strong> edge{{ edgeCount !== 1 ? 's' : '' }}.
      </p>
      <button class="btn btn-default" @click="onDownload">
        Download CAG as JSON
      </button>
      <button
        v-if="isExperimentDownloadVisible"
        class="btn btn-default"
        @click="onDownloadExperiment"
      >
        Download experiment as JSON
      </button>
    </div>

    <template #below-tabs>
      <slot name="below-tabs" />
    </template>
  </side-panel>
</template>

<script lang="ts">
import SidePanel from '@/components/side-panel/side-panel.vue';
import { defineComponent, PropType } from 'vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import { mapGetters } from 'vuex';
import { CAGGraph } from '@/types/CAG';

export default defineComponent({
  name: 'CAGSidePanel',
  components: {
    SidePanel,
    ListContextInsightPane,
    ListAnalyticalQuestionsPane
  },
  props: {
    isExperimentDownloadVisible: {
      type: Boolean,
      default: false
    },
    modelComponents: {
      type: Object as PropType<CAGGraph>,
      default: null
    }
  },
  data: () => ({
    tabs: Object.freeze([
      { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' },
      { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' },
      { name: 'Details', icon: 'fa fa-fw fa-info-circle fa-lg' }
    ]),
    currentTab: ''
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG'
    }),
    downloadURL() {
      return `/api/models/${this.currentCAG}/register-payload`;
    },
    nodeCount(): number {
      return this.modelComponents?.nodes?.length ?? 0;
    },
    edgeCount(): number {
      return this.modelComponents?.edges?.length ?? 0;
    }
  },
  methods: {
    setActive(tab: string) {
      this.currentTab = tab;
    },
    onDownload() {
      window.location.href = this.downloadURL;
    },
    onDownloadExperiment() {
      this.$emit('download-experiment');
    }
  }
});
</script>

<style lang="scss" scoped>
.details-pane button {
  width: 100%;

  &:not(:first-child) {
    margin-top: 10px;
  }
}
</style>
