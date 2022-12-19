<template>
  <div class="config-bar-container">
    Analysis of the
    <strong>{{ timeScaleLabel }}</strong>
    <button disabled class="btn btn-sm " @click="showModalTimeScale = true">
      <i class="fa fa-fw fa-pencil" />
    </button>
    following
    <date-dropdown
      :data="projectionStartDate"
      @date-updated="setProjectionStartDate"
    />
    .
    &nbsp;
    Display the last
    <dropdown-button
      :items="historyOptions"
      :selected-item="selectedHistoryRange"
      :is-dropdown-above="true"
      :is-dropdown-left-aligned="true"
      @item-selected="setHistory"
    />
    <modal-time-scale

      v-if="showModalTimeScale"
      :initially-selected-time-scale="modelSummary?.parameter?.time_scale"
      @save-time-scale="saveTimeScale"
      @close="showModalTimeScale = false"
    />
  </div>
</template>

<script lang="ts">
import { TIME_SCALE_OPTIONS_MAP } from '@/utils/time-scale-util';
import { defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import modelService from '@/services/model-service';
import dropdownButton, { DropdownItem } from '../dropdown-button.vue';
import DateDropdown from '@/components/widgets/date-dropdown.vue';
import { CAGModelParameter, CAGModelSummary } from '@/types/CAG';
import { mapGetters } from 'vuex';
import { TimeScale } from '@/types/Enums';
import ModalTimeScale from '../qualitative/modal-time-scale.vue';

const historyConfigs = {
  [TimeScale.Months]: [
    { displayName: '12 months', value: 12 },
    { displayName: '24 months', value: 24 },
    { displayName: '48 months', value: 48 }
  ],
  [TimeScale.Years]: [
    { displayName: '10 years', value: 12 * 10 },
    { displayName: '20 years', value: 12 * 20 },
    { displayName: '40 years', value: 12 * 40 }
  ]
};

export default defineComponent({
  components: { dropdownButton, DateDropdown, ModalTimeScale },
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
    const selectedTimeScale = ref(modelSummary.value.parameter.time_scale);
    const projectionStartDate = ref(
      modelSummary.value.parameter.projection_start
    );
    const selectedHistoryRange = ref(
      modelSummary.value.parameter.history_range
    );


    watchEffect(() => {
      // Whenever modelSummary changes, update local state variables
      selectedHistoryRange.value = modelSummary.value.parameter.history_range;
      selectedTimeScale.value = modelSummary.value.parameter.time_scale;
      projectionStartDate.value = modelSummary.value.parameter.projection_start;
    });
    return {
      selectedTimeScale,
      projectionStartDate,
      selectedHistoryRange,
      showModalTimeScale: ref(false),
      historyConfigs
    };
  },
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG'
    }),
    historyOptions(): DropdownItem[] {
      const timeScale = this.modelSummary.parameter.time_scale;
      return historyConfigs[timeScale];
    },
    timeScaleLabel(): string {
      return TIME_SCALE_OPTIONS_MAP.get(this.selectedTimeScale)?.label ?? '';
    }
  },
  methods: {
    async setHistory(range: number) {
      const newParameter: Partial<CAGModelParameter> = {
        history_range: range
      };
      await modelService.updateModelParameter(this.currentCAG, newParameter);
      this.$emit('model-parameter-changed');
    },
    async setProjectionStartDate(newStartDate: number) {
      await modelService.updateModelParameter(this.currentCAG, {
        projection_start: newStartDate
      });
      this.$emit('model-parameter-changed');
    },
    async saveTimeScale(newTimeScale: TimeScale) {
      const newParameter: Partial<CAGModelParameter> = {
        time_scale: newTimeScale
      };
      this.showModalTimeScale = false;
      await modelService.updateModelParameter(this.currentCAG, newParameter);
      this.$emit('model-parameter-changed');
    }
  }
});
</script>

<style lang="scss" scoped>
.config-bar-container {
  display: flex;
  align-items: center;
  z-index: 1;
  gap: 5px;
}
</style>
