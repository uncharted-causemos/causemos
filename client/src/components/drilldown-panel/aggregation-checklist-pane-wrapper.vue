<template>
  <aggregation-checklist-pane
    v-bind="$attrs"
    :selected-item-ids="selectedItemIds"
    :should-show-deselected-bars="shouldShowDeselectedBars || selectedItemIds.length === 0"
  />
</template>

<script lang="ts">

import AggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import { defineComponent, PropType } from '@vue/runtime-core';

export default defineComponent({
  name: 'AggregationChecklistPaneWrapper',
  components: {
    AggregationChecklistPane
  },
  props: {
    shouldShowDeselectedBars: {
      type: Boolean,
      required: true
    },
    selectedItemIds: {
      type: Object as PropType<string[]>,
      default: []
    }
  }
});

</script>
