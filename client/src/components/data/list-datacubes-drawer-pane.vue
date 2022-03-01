<template>
  <div class="list-datacubes-drawer-pane-container">
    <template v-if="datacubeItems.length > 0">
      <div>List of Available Datacubes</div>
      <div v-for="item in datacubeItems"
        :key="item.datacubeId">
        <div class="checkbox">
          <label
            @click="toggleItemSelection(item)"
            style="cursor: pointer;"
            :style="{ color: item.selected || canSelectItem ? '#000000' : '#707070' }"
            >
            <i
              class="fa fa-lg fa-fw"
              :class="{ 'fa-check-square-o': item.selected, 'fa-square-o': !item.selected }"
            />
            <span v-html="item.name ?? item.datacubeId"></span>
            <i
              class="fa fa-fw fa-close delete-item"
              @click="removeItem(item)"
            />
          </label>
        </div>
      </div>
    </template>
    <message-display
      v-else
      :message="messageNoData"
    />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, ref, watch } from 'vue';

import { useStore } from 'vuex';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { AnalysisItem } from '@/types/Analysis';
import { MAX_ANALYSIS_DATACUBES_COUNT } from '@/utils/analysis-util';

export default defineComponent({
  name: 'ListDatacubesDrawerPane',
  components: {
    MessageDisplay
  },
  data: () => ({
    messageNoData: 'No Datacubes are added to this analysis. \nPlease add some datacube by clicking on <b>"Search Data Cubes"</b> button!'
  }),
  setup() {
    const store = useStore();
    const analysisItems = computed<AnalysisItem[]>(() => store.getters['dataAnalysis/analysisItems']);
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);

    const datacubeItems = ref<AnalysisItem[]>([]);

    watch(
      () => [
        analysisItems.value
      ],
      () => {
        datacubeItems.value = _.cloneDeep(analysisItems.value);
      },
      {
        immediate: true
      }
    );

    const canSelectItem = computed(() => {
      return datacubeItems.value.filter(item => item.selected).length < MAX_ANALYSIS_DATACUBES_COUNT;
    });

    // save selected datacubes in insights so that restoring an insight should remember which datacubes were selected

    return {
      store,
      datacubeItems,
      analysisId,
      canSelectItem
    };
  },
  methods: {
    toggleItemSelection(item: AnalysisItem) {
      if (item.selected || this.canSelectItem) {
        const items = _.cloneDeep(this.datacubeItems);
        const target = items.find(i => i.datacubeId === item.datacubeId && i.id === item.id);
        if (target) {
          target.selected = !target.selected;
        }
        this.datacubeItems = items;
        this.store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: this.analysisId, analysisItems: items });
      }
    },
    removeItem(item: AnalysisItem) {
      const items = _.cloneDeep(this.datacubeItems).filter(i => i.datacubeId !== item.datacubeId && i.id !== item.id);
      this.datacubeItems = items;
      this.store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: this.analysisId, analysisItems: items });
    }
  }
});
</script>

<style lang="scss">
@import "~styles/variables";

.list-datacubes-drawer-pane-container {
  color: #707070;
  overflow-y: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;

  .pane-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .pane-footer {
    margin: 10px 0;
  }

  .checkbox {
    margin-right: 10px;
    user-select: none;
  }

  .delete-item {
    font-size: $font-size-large;
    width: 32px;
    height: 32px;
    border-radius: 3px;
    color: #ff6955;
    cursor: pointer;

    &:hover {
      color: #850f00;
    }
  }
}

</style>
