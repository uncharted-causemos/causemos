<template>
  <div class="breakdown-pane-container">
    <!-- TODO: dropdown to select what we're breaking down by -->
    <!-- TODO: units should be dynamically populated -->
    <aggregation-checklist-pane
      class="checklist-section"
      v-for="type in typeBreakdownData"
      :key="type.name"
      :aggregation-level-count="1"
      :aggregation-level="1"
      :aggregation-level-title="type.name"
      :raw-data="type.data"
      :units="'tonnes'"
    >
      <template #aggregation-description>
        <!-- TODO: highlighted value should be dynamically populated based
        on the selected timestamp -->
        <p class="aggregation-description">Showing data for <span class="highlighted">2019</span>.</p>
        <p class="aggregation-description">Aggregated by <strong>averaging</strong>.</p>
      </template>
    </aggregation-checklist-pane>
    <aggregation-checklist-pane
      class="checklist-section"
      :aggregation-level-count="availableAdminLevels.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevels[selectedAdminLevel]"
      :raw-data="adminLevelData"
      :units="'tonnes'"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #aggregation-description>
        <p class="aggregation-description">Showing data for <span class="highlighted">2019</span>.</p>
        <p class="aggregation-description">Aggregated by <strong>averaging</strong>.</p>
      </template>
    </aggregation-checklist-pane>
    <!-- <aggregation-checklist-pane
      :aggregation-level-count="aggregationLevels.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="'year'"
      :raw-data="adminLevelData"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #subtitle>
        <span>Showing data across <strong>all time</strong>.</span>
      </template>
    </aggregation-checklist-pane> -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
export default defineComponent({
  components: { aggregationChecklistPane },
  name: 'BreakdownPane',
  props: {
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    adminLevelData: {
      type: Object,
      required: true
    },
    availableAdminLevels: {
      type: Array,
      required: true
    },
    typeBreakdownData: {
      type: Array,
      default: () => []
    }
  },
  emits: ['set-selected-admin-level'],
  setup(props, { emit }) {
    function setSelectedAdminLevel(level: number) {
      emit('set-selected-admin-level', level);
    }
    return { setSelectedAdminLevel };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/_variables';

.aggregation-description {
  color: $text-color-medium;
  margin: 0;
  text-align: right;
}

.highlighted {
  color: $selected-dark;
}

.checklist-section {
  margin-top: 30px;
}
</style>
