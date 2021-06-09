<template>
  <modal @close="close()">
    <template #header>
      <h4> Model Parameters </h4>
    </template>
    <template #body>
      <div class="row">
        <div class="col-sm-4">
          <label>Historical Start:</label>
          <date-dropdown
            :data="startDate"
            @updated="onUpdateStartDate" />
        </div>
        <div class="col-sm-4">
          <label>Historical End:</label>
          <date-dropdown
            :data="endDate"
            @updated="onUpdateEndDate" />
        </div>
      </div>
      <div
        v-if="hasErrorStartDate"
        class="error-format-message">
        {{ errorMsgStartDate }}
      </div>
      <div
        v-if="hasErrorEndDate"
        class="error-format-message">
        {{ errorMsgEndDate }}
      </div>
      <div class="row">
        <div class="col-sm-4">
          <label>Projection Start:</label>
          <date-dropdown
            :data="projectionStartDate"
            @updated="onUpdateProjectionStartDate" />
        </div>
        <div class="col-sm-4">
          <label>Projection Steps:</label>
          <div>
            <input
              v-model.number="selectedNumSteps"
              type="number"
              class="form-control input-sm"
              min="1"
              step="1">
          </div>
        </div>
      </div>
      <div
        v-if="hasErrorProjectionStartDate"
        class="error-format-message">
        {{ errorMsgProjectionStartDate }}
      </div>
      <div class="row">
        <div class="col-sm-4">
          <label>Projection Engine:</label>
          <select
            v-model="selectedEngine"
            class="form-control input-sm">
            <option
              v-for="engineOption in engineOptions"
              :key="engineOption.key"
              :value="engineOption.key"
              :selected="engineOption.key === selectedEngine"
            >{{ engineOption.value }}</option>
          </select>
        </div>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="save()">Save
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">

import _ from 'lodash';

import { defineComponent, ref, computed, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import DateDropdown from '@/components/widgets/date-dropdown.vue';
import { DATE_SELECTION } from '@/utils/messages-util';
import modelService from '@/services/model-service';
import { CAGModelSummary } from '@/types/CAG';

export default defineComponent({
  name: 'ModalEditParameters',
  components: {
    Modal,
    DateDropdown
  },
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    }
  },
  emits: [
    'close', 'save'
  ],
  setup(props) {
    const selectedEngine = ref('dyse');
    const selectedStartDate = ref(0);
    const selectedEndDate = ref(0);
    const selectedNumSteps = ref(0);
    const selectedProjectionStartDate = ref(0);

    const hasErrorStartDate = ref(false);
    const hasErrorEndDate = ref(false);
    const hasErrorProjectionStartDate = ref(false);

    return {
      // constants
      errorMsgStartDate: DATE_SELECTION.START_DATE_AFTER_END_DATE,
      errorMsgEndDate: DATE_SELECTION.END_DATE_BEFORE_START_DATE,
      errorMsgProjectionStartDate: DATE_SELECTION.END_DATE_BEFORE_START_DATE,

      // reactive
      selectedEngine,
      selectedStartDate,
      selectedEndDate,
      selectedNumSteps,
      selectedProjectionStartDate,
      engineOptions: modelService.ENGINE_OPTIONS,
      hasErrorStartDate,
      hasErrorEndDate,
      hasErrorProjectionStartDate,

      startDate: computed(() => props.modelSummary.parameter.indicator_time_series_range.start),
      endDate: computed(() => props.modelSummary.parameter.indicator_time_series_range.end),
      projectionStartDate: computed(() => props.modelSummary.parameter.projection_start)
    };
  },
  created() {
  },
  mounted() {
    if (_.isEmpty(this.modelSummary)) return;
    this.selectedEngine = this.modelSummary.parameter.engine;
    this.selectedStartDate = this.modelSummary.parameter.indicator_time_series_range.start;
    this.selectedEndDate = this.modelSummary.parameter.indicator_time_series_range.end;
    this.selectedProjectionStartDate = this.modelSummary.parameter.projection_start;
    this.selectedNumSteps = this.modelSummary.parameter.num_steps;
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
    save() {
      this.$emit('save', {
        indicator_time_series_range: {
          start: this.selectedStartDate,
          end: this.selectedEndDate
        },
        projection_start: this.selectedProjectionStartDate,
        num_steps: this.selectedNumSteps,
        engine: this.selectedEngine
      });
    },
    onUpdateStartDate(newTimeStamp: number) {
      this.selectedStartDate = newTimeStamp;
      this.hasErrorEndDate = false; // Reset so we don't get both messages at the same time
      this.hasErrorStartDate = this.selectedStartDate > this.selectedEndDate;
      this.hasErrorProjectionStartDate = this.selectedProjectionStartDate < this.selectedStartDate;
    },
    onUpdateEndDate(newTimeStamp: number) {
      this.selectedEndDate = newTimeStamp;
      this.hasErrorStartDate = false;
      this.hasErrorEndDate = this.selectedEndDate < this.selectedStartDate;
    },
    onUpdateProjectionStartDate(newTimeStamp: number) {
      this.selectedProjectionStartDate = newTimeStamp;
      this.hasErrorProjectionStartDate = this.selectedProjectionStartDate < this.selectedStartDate;
    }
  }
});
</script>

<style scoped lang="scss">

.modal-container {
  width: 300px;
}

::v-deep(.row) {
  margin: 0;
  margin-top:20px;
}

::v-deep(.col-sm-4) {
  padding: 0;
}

.first-button {
  margin-right: 10px;
}
</style>
