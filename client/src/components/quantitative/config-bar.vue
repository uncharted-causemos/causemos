<template>
  <div class="config-bar-container">
    Using the
    <dropdown-button
      :items="engineOptions"
      :selected-item="selectedEngine"
      :is-dropdown-above="true"
      :is-dropdown-left-aligned="true"
      @item-selected="setEngine"
    />
    engine, project over a period of
    <strong>Years</strong>
    starting in
    <date-dropdown
      :data="projectionStartDate"
      @updated="setProjectionStartDate"
    />
    .
  </div>
</template>

<script lang="ts">
import { TIME_SCALE_OPTIONS_MAP } from '@/utils/time-scale-util';
import { defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import modelService, { ENGINE_OPTIONS } from '@/services/model-service';
import dropdownButton, { DropdownItem } from '../dropdown-button.vue';
import DateDropdown from '@/components/widgets/date-dropdown.vue';
import { CAGModelSummary } from '@/types/CAG';
import { mapGetters } from 'vuex';

export default defineComponent({
  components: { dropdownButton, DateDropdown },
  name: 'QuantitativeConfigBar',
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    }
  },
  emits: ['model-parameter-changed'],
  setup(props) {
    const { modelSummary } = toRefs(props);
    const selectedEngine = ref(modelSummary.value.parameter.engine);
    const selectedTimeScale = ref(modelSummary.value.parameter.time_scale);
    const projectionStartDate = ref(
      modelSummary.value.parameter.projection_start
    );
    watchEffect(() => {
      // Whenever modelSummary changes, update local state variables
      selectedEngine.value = modelSummary.value.parameter.engine;
      selectedTimeScale.value = modelSummary.value.parameter.time_scale;
      projectionStartDate.value = modelSummary.value.parameter.projection_start;
    });
    return {
      selectedEngine,
      selectedTimeScale,
      projectionStartDate
    };
  },
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG'
    }),
    engineOptions(): DropdownItem[] {
      return ENGINE_OPTIONS.map(option => ({
        displayName: option.value,
        value: option.key
      }));
    },
    timeScaleLabel(): string {
      return TIME_SCALE_OPTIONS_MAP.get(this.selectedTimeScale)?.label ?? '';
    }
  },
  methods: {
    async setEngine(newEngine: string) {
      this.selectedEngine = newEngine;
      await modelService.updateModelParameter(this.currentCAG, {
        engine: newEngine
      });
      this.$emit('model-parameter-changed');
    },
    async setProjectionStartDate(newStartDate: number) {
      console.log('start date', newStartDate);
      await modelService.updateModelParameter(this.currentCAG, {
        projection_start: newStartDate
      });
      this.$emit('model-parameter-changed');
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.config-bar-container {
  display: flex;
  align-items: center;
  z-index: 1;
  gap: 5px;
}
</style>
