<template>
  <div class="list-datacubes-drawer-pane-container">
    <template v-if="analysisItems.length > 0">
      <div v-for="item in analysisItems" :key="item.datacubeId">
        <label
          @click="toggleItemSelection(item)"
          style="cursor: pointer"
          :style="{ color: item.selected || canSelectItem ? '#000000' : '#707070' }"
        >
          <i
            class="fa fa-lg fa-fw"
            :class="{ 'fa-check-square-o': item.selected, 'fa-square-o': !item.selected }"
          />
          <span>
            {{ getDisplayName(item) }}
          </span>
        </label>
        <i class="fa fa-fw fa-close delete-item" @click="removeItem(item)" />
      </div>
    </template>
    <message-display v-else :message="messageNoData" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, PropType, toRefs, ref, watchEffect } from 'vue';

import { useStore } from 'vuex';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { AnalysisItem } from '@/types/Analysis';
import {
  MAX_ANALYSIS_DATACUBES_COUNT,
  getId,
  getDatacubeId,
  getState,
} from '@/utils/analysis-util';
import { getOutputDisplayNamesForBreakdownState } from '@/utils/datacube-util';
import { Datacube } from '@/types/Datacube';
import { getDatacubesByIds } from '@/services/datacube-service';

export default defineComponent({
  name: 'ListDatacubesDrawerPane',
  components: {
    MessageDisplay,
  },
  props: {
    analysisItems: {
      type: Array as PropType<AnalysisItem[]>,
      required: true,
    },
  },
  emits: ['toggle-analysis-item-selected', 'remove-analysis-item'],
  data: () => ({
    messageNoData:
      'No Datacubes are added to this analysis. \nPlease add some datacube by clicking on <b>"Search Data Cubes"</b> button!',
  }),
  setup(props) {
    const { analysisItems } = toRefs(props);
    const store = useStore();

    const metadataMap = ref<{ [datacubeId: string]: Partial<Datacube> }>({});
    watchEffect(async () => {
      // Only fetch datacubes with necessary fields specified in `includes`
      const result = await getDatacubesByIds(_.uniq(analysisItems.value.map(getDatacubeId)), {
        includes: ['id', 'name', 'maintainer.organization', 'outputs.name', 'outputs.display_name'],
      });
      result.forEach((datacube) => (metadataMap.value[datacube.id] = datacube));
    });

    const canSelectItem = computed(() => {
      return (
        analysisItems.value.filter((item) => item.selected).length < MAX_ANALYSIS_DATACUBES_COUNT
      );
    });

    const getDisplayName = (item: AnalysisItem) => {
      const metadata = metadataMap.value[getDatacubeId(item)] ?? {};
      const outputDisplayName = getOutputDisplayNamesForBreakdownState(
        getState(item).breakdownState,
        metadata.outputs
      );
      return [outputDisplayName, metadata.name ?? '', metadata.maintainer?.organization ?? '']
        .filter((text) => text !== '')
        .join(' - ');
    };

    return {
      store,
      canSelectItem,
      getDisplayName,
    };
  },
  methods: {
    toggleItemSelection(item: AnalysisItem) {
      if (item.selected || this.canSelectItem) {
        this.$emit('toggle-analysis-item-selected', getId(item));
      }
    },
    removeItem(item: AnalysisItem) {
      this.$emit('remove-analysis-item', getId(item));
    },
  },
});
</script>

<style lang="scss">
@import '~styles/variables';

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
