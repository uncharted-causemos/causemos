<template>
  <div class="comp-analysis-container">
    <action-bar />
    <main>
    <analytical-questions-and-insights-panel />
    <div class="flex-row column insight-capture">
      <div v-if="analysisItems.length">
        <datacube-comparative-card
          v-for="item in analysisItems"
          :key="item.id"
          class="datacube-comparative-card"
          :class="{ 'selected': selectedDatacubeId === item.id }"
          :datacubeId="item.datacubeId"
          :id="item.id"
          :isSelected="selectedDatacubeId === item.datacubeId"
          @click="selectedDatacubeId = item.datacubeId"
        />
      </div>
      <empty-state-instructions v-else />
    </div>
    </main>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from 'vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import DatacubeComparativeCard from '@/components/widgets/datacube-comparative-card.vue';
import ActionBar from '@/components/data/action-bar.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';

export default defineComponent({
  name: 'CompAnalysis',
  components: {
    DatacubeComparativeCard,
    ActionBar,
    EmptyStateInstructions,
    AnalyticalQuestionsAndInsightsPanel
  },
  setup() {
    const store = useStore();
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const selectedDatacubeId = ref('');

    watchEffect(() => {
      if (analysisItems.value && analysisItems.value.length > 0) {
        // @FIXME: select first one by default
        selectedDatacubeId.value = analysisItems.value[0].id;

        // set context-ids to fetch insights correctly for all datacubes in this analysis
        const contextIDs = analysisItems.value.map((dc: any) => dc.id);
        store.dispatch('insightPanel/setContextId', contextIDs);
      }
    });

    return {
      selectedDatacubeId,
      analysisItems
    };
  },
  unmounted(): void {
  },
  mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();
  },
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel'
    })
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flex-row {
  display: flex;
  flex: 1;
  min-height: 0;
}

main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  .datacube-comparative-card {
    border-style: solid;
    border-color: transparent;
    border-width: thin;
    margin: 1rem;
    &:hover {
      border-color: blue;
    }
  }
  .selected {
    border-color: black;
  }
}

</style>
