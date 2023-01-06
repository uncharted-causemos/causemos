<template>
  <side-panel
    class="cag-side-panel-container"
    :tabs="tabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
    <cag-scenarios-pane
      v-if="currentTab === 'Scenarios'"
      :scenarios="scenarios"
      @new-scenario="$emit('new-scenario', $event)"
      @update-scenario="$emit('update-scenario', $event)"
      @delete-scenario="$emit('delete-scenario', $event)"
      @delete-scenario-clamp="$emit('delete-scenario-clamp', $event)"
      @duplicate-scenario="$emit('duplicate-scenario', $event)"
    />

    <cag-analytics-pane
      v-if="currentTab === 'Analytics'"
      :model-summary="modelSummary"
      :model-components="modelComponents"
      :scenarios="scenarios"
      @show-path="showPath"
    />

    <list-context-insight-pane v-if="currentTab === 'Context Insights'" />

    <div v-if="currentTab === 'Details'" class="details-pane">
      <p v-if="modelComponents !== null">
        This CAG contains <strong>{{ nodeCount }}</strong> node{{ nodeCount !== 1 ? 's' : '' }} and
        <strong>{{ edgeCount }}</strong> edge{{ edgeCount !== 1 ? 's' : '' }}.
      </p>
      <button class="btn" @click="onDownload">Download CAG as JSON</button>
      <button v-if="isExperimentDownloadVisible" class="btn" @click="onDownloadExperiment">
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
import { computed, defineComponent, PropType, ref, watchEffect } from 'vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import CagScenariosPane from '@/components/cag/cag-scenarios-pane.vue';
import CagAnalyticsPane from '@/components/cag/cag-analytics-pane.vue';
import { mapGetters, useStore } from 'vuex';
import { CAGModelSummary, CAGGraph, Scenario, GraphPath } from '@/types/CAG';

export default defineComponent({
  name: 'CAGSidePanel',
  components: {
    SidePanel,
    ListContextInsightPane,
    // ListAnalyticalQuestionsPane,
    CagScenariosPane,
    CagAnalyticsPane,
  },
  emits: [
    'new-scenario',
    'update-scenario',
    'delete-scenario',
    'delete-scenario-clamp',
    'download-experiment',
    'show-path',
    'duplicate-scenario',
  ],
  props: {
    isExperimentDownloadVisible: {
      type: Boolean,
      default: false,
    },
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      default: null,
    },
    modelComponents: {
      type: Object as PropType<CAGGraph>,
      default: null,
    },
    scenarios: {
      type: Array as PropType<Scenario[]>,
      default: () => [],
    },
  },
  setup() {
    const store = useStore();
    const currentView = computed(() => store.getters['app/currentView']);

    const tabsQuantitative = [
      { name: 'Scenarios', icon: 'fa fa-circle-o fa-lg' },
      { name: 'Analytics', icon: 'fa fa-fw fa-flask fa-lg' },
      { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' },
      { name: 'Details', icon: 'fa fa-fw fa-info-circle fa-lg' },
    ];

    const tabsQualitative = [
      { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' },
      { name: 'Details', icon: 'fa fa-fw fa-info-circle fa-lg' },
    ];

    const tabs = ref(tabsQuantitative);

    watchEffect(() => {
      if (currentView.value) {
        tabs.value = currentView.value === 'quantitative' ? tabsQuantitative : tabsQualitative;
      }
    });
    return {
      tabs,
    };
  },
  data: () => ({
    currentTab: '',
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG',
    }),
    downloadURL() {
      return `/api/models/${this.currentCAG}/register-payload`;
    },
    nodeCount(): number {
      return this.modelComponents?.nodes?.length ?? 0;
    },
    edgeCount(): number {
      return this.modelComponents?.edges?.length ?? 0;
    },
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
    },
    showPath(item: GraphPath) {
      this.$emit('show-path', item);
    },
  },
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
