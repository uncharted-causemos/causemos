<template>
  <div class="list-datacubes-drawer-pane-container">
    <template v-if="analysisItems.length > 0">
      <div v-for="item in analysisItems"
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
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { useStore } from 'vuex';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { AnalysisItem } from '@/types/Analysis';
import { MAX_ANALYSIS_DATACUBES_COUNT } from '@/utils/analysis-util';

export default defineComponent({
  name: 'ListDatacubesDrawerPane',
  components: {
    MessageDisplay
  },
  props: {
    analysisItems: {
      type: Array as PropType<AnalysisItem[]>,
      required: true
    }
  },
  emits: ['toggle-analysis-item-selected', 'remove-analysis-item'],
  data: () => ({
    messageNoData: 'No Datacubes are added to this analysis. \nPlease add some datacube by clicking on <b>"Search Data Cubes"</b> button!'
  }),
  setup(props) {
    const { analysisItems } = toRefs(props);
    const store = useStore();
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);

    const canSelectItem = computed(() => {
      return analysisItems.value.filter(item => item.selected).length < MAX_ANALYSIS_DATACUBES_COUNT;
    });

    return {
      store,
      analysisId,
      canSelectItem
    };
  },
  methods: {
    toggleItemSelection(item: AnalysisItem) {
      if (item.selected || this.canSelectItem) {
        this.$emit('toggle-analysis-item-selected', item.itemId);
      }
    },
    removeItem(item: AnalysisItem) {
      this.$emit('remove-analysis-item', item.itemId);
    }
  }
});
</script>

<style lang="scss">
@import "~styles/variables";

.list-datacubes-drawer-pane-container {
  color: #707070;
  overflow-y: auto;
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
