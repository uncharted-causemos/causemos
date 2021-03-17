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
            disabled="disabled"
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

<script>

import _ from 'lodash';

import Modal from '@/components/modals/modal';
import DateDropdown from '@/components/widgets/date-dropdown';
import { ENGINE_OPTIONS } from '@/utils/projection-util';
import { DATE_SELECTION } from '@/utils/messages-util';

export default {
  name: 'ModalEditParameters',
  components: {
    Modal,
    DateDropdown
  },
  props: {
    modelSummary: {
      type: Object,
      required: true
    }
  },
  emits: [
    'close', 'save'
  ],
  data: () => ({
    selectedEngine: 'dyse',
    selectedStartDate: null,
    selectedEndDate: null,
    selectedNumSteps: 0,
    selectedProjectionStartDate: null,
    engineOptions: ENGINE_OPTIONS,
    hasErrorStartDate: false,
    hasErrorEndDate: false,
    hasErrorProjectionStartDate: false
  }),
  computed: {
    startDate() {
      return this.modelSummary.parameter.indicator_time_series_range.start;
    },
    endDate() {
      return this.modelSummary.parameter.indicator_time_series_range.end;
    },
    projectionStartDate() {
      return this.modelSummary.parameter.projection_start;
    }
  },
  created() {
    this.errorMsgStartDate = DATE_SELECTION.START_DATE_AFTER_END_DATE;
    this.errorMsgEndDate = DATE_SELECTION.END_DATE_BEFORE_START_DATE;
    this.errorMsgProjectionStartDate = DATE_SELECTION.END_DATE_BEFORE_START_DATE;
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
    selectEngine(option) {
      this.selectedEngine = option;
    },
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
    onUpdateStartDate(newTimeStamp) {
      this.selectedStartDate = newTimeStamp;
      this.hasErrorEndDate = false; // Reset so we don't get both messages at the same time
      this.hasErrorStartDate = this.selectedStartDate > this.selectedEndDate;
      this.hasErrorProjectionStartDate = this.selectedProjectionStartDate < this.selectedStartDate;
    },
    onUpdateEndDate(newTimeStamp) {
      this.selectedEndDate = newTimeStamp;
      this.hasErrorStartDate = false;
      this.hasErrorEndDate = this.selectedEndDate < this.selectedStartDate;
    },
    onUpdateProjectionStartDate(newTimeStamp) {
      this.selectedProjectionStartDate = newTimeStamp;
      this.hasErrorProjectionStartDate = this.selectedProjectionStartDate < this.selectedStartDate;
    }
  }
};
</script>

<style scoped lang="scss">

.modal-container {
  width: 300px;
}

/deep/ .modal-body {
  padding: 10px 20px;
}

.first-button {
  margin-right: 10px;
}

.row {
  margin-top:20px;
}


</style>
