<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" /> Edit Parameter Options</h4>
    </template>
    <template #body v-if="updatedParameter">
      <label>
        <b>Parameter:</b>
        {{updatedParameter.display_name !== '' ? updatedParameter.display_name : updatedParameter.name}}
      </label>
      <!-- date or date-range -->
      <div v-if="isDateParam || isDateRangeParam" class="param-choices-container">
        <label>
          <b>Date Options:</b>
        </label>
        <div v-if="isDateRangeParam" class="row date-option-container">
          <label class="col-md-6">Date range delimiter</label>
          <input
            v-model="updatedParameter.additional_options.date_range_delimiter"
            type="text"
          >
        </div>
        <div class="row date-option-container">
          <label class="col-md-6">Minimum date:</label>
          <div ref="dateMinPickerElement" class="new-runs-date-picker-container">
            <input class="date-picker-input" placeholder="Select date.." type="text" v-model="updatedParameter.additional_options.date_min" autocomplete="off" data-input />
            <a class="btn btn-default date-picker-buttons" title="toggle" data-toggle>
                <i class="fa fa-calendar"></i>
            </a>
            <a class="btn btn-default date-picker-buttons" title="clear" data-clear>
                <i class="fa fa-close"></i>
            </a>
          </div>
        </div>
        <div class="row date-option-container">
          <label class="col-md-6">Maximum date:</label>
          <div ref="dateMaxPickerElement" class="new-runs-date-picker-container">
            <input class="date-picker-input" placeholder="Select date.." type="text" v-model="updatedParameter.additional_options.date_max" autocomplete="off" data-input />
            <a class="btn btn-default date-picker-buttons" title="toggle" data-toggle>
                <i class="fa fa-calendar"></i>
            </a>
            <a class="btn btn-default date-picker-buttons" title="clear" data-clear>
                <i class="fa fa-close"></i>
            </a>
          </div>
        </div>
      </div>
      <!-- geo -->
      <div v-if="isGeoParam" class="param-choices-container">
        <label>
          <b>Geo Options:</b>
        </label>
        <div class="date-option-container" style="display: flex; flex-direction: column; align-items: baseline">
          <label>Acceptable admin levels:</label>
          <div>
            <div class="checkbox" v-for="level in allGeoLevels" :key="level">
              <label
                @click="updateAcceptableGeoLevels(level)"
                style="cursor: pointer; color: black;">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': updatedParameter.additional_options.geo_acceptable_levels.includes(level), 'fa-square-o': !updatedParameter.additional_options.geo_acceptable_levels.includes(level) }"
                />
                {{level}}
              </label>
            </div>
          </div>
        </div>
        <div class="row date-option-container">
          <label class="col-md-6">Default value label</label>
          <input
            v-model="updatedParameter.additional_options.default_value_label"
            type="text"
          >
        </div>
        <div class="row date-option-container">
          <label class="col-md-6">Region format:</label>
          <dropdown-button
            :selected-item="updatedParameter.additional_options.geo_region_format"
            :items="acceptableGeoFormats"
            @item-selected="updateAcceptableGeoFormat"
          />
        </div>
        <div v-if="updatedParameter.additional_options.geo_region_format === GeoAttributeFormat.GADM_Code" class="row date-option-container checkbox">
          <label
            @click="toggleOmitGADMCodeVersion()"
            style="cursor: pointer; color: black;">
            <i
              class="fa fa-lg fa-fw"
              :class="{ 'fa-check-square-o': updatedParameter.additional_options.geo_omit_gadm_code_version, 'fa-square-o': !updatedParameter.additional_options.geo_omit_gadm_code_version }"
            />
            Omit GADM code version
          </label>
        </div>
        <div v-if="updatedParameter.additional_options.geo_region_format === GeoAttributeFormat.Bounding_Box" class="row date-option-container">
          <label class="col-md-6">Bounding box format</label>
          <input
            v-model="updatedParameter.additional_options.geo_bbox_format"
            :style="{ width: (updatedParameter.additional_options.geo_bbox_format.length * 0.75) + 'ch' }"
            type="text"
          >
          <button
            type="button"
            class="btn"
            style="margin-left: 2px; padding: 2px 4px"
            @click.stop="resetBBoxFormat()">
              Reset
          </button>
        </div>
        <div class="row date-option-container">
          <label class="col-md-6" style="font-style: italic; margin-left: 1rem;">example</label>
          <label style="font-style: italic">{{geoFormatExample}}</label>
        </div>
      </div>
      <!-- choices -->
      <div class="row" style="padding: 2rem;">
        <label><b>Data value/Label choices:</b></label>
        <br />
        Value:
        <input
          type="text"
          :value="newChoiceInput"
          @input="newChoiceInput = $event.target.value"
        >
        Label:
        <input
          type="text"
          :value="newChoiceLabelInput"
          @input="newChoiceLabelInput = $event.target.value"
        >
        <button
          type="button"
          class="btn first-button"
          style="padding: 0; margin-left: 4px;"
          @click.stop="updatedParameter.choices.push(newChoiceInput); updatedParameter.choices_labels.push(newChoiceLabelInput)">
            Add
        </button>
      </div>
      <div v-if="updatedParameter.choices && updatedParameter.choices.length > 0" class="param-choices-container">
        <div class="row">
          <label class="col-md-7"><b>Value(s)</b></label>
          <label><b>Label(s)</b></label>
        </div>
        <div
          v-for="(choice, indx) in updatedParameter.choices"
          :key="choice"
          class="row" style="padding-bottom: 1rem;">
          <label class="col-md-7">{{choice}}</label>
          <input
            v-model="updatedParameter.choices_labels[indx]"
            type="text"
          >
          <i class="fa fa-fw fa-close delete-choice" @click="deleteChoice(choice)" />
        </div>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="saveUpdatedParamOptions()">
            Update
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent, PropType, nextTick, ref } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { ModelParameter } from '@/types/Datacube';
import _ from 'lodash';
import { DatacubeGenericAttributeVariableType, DatacubeGeoAttributeVariableType, GeoAttributeFormat } from '@/types/Enums';
import flatpickr from 'flatpickr';
import { DEFAULT_DATE_RANGE_DELIMETER } from '@/utils/datacube-util';
import DropdownButton from '@/components/dropdown-button.vue';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';

export default defineComponent({
  name: 'ModalEditParamChoices',
  components: {
    Modal,
    DropdownButton
  },
  emits: [
    'close'
  ],
  props: {
    selectedParameter: {
      type: Object as PropType<ModelParameter>,
      required: true
    }
  },
  setup() {
    const dateMinPickerElement = ref<HTMLElement | null>(null);
    const dateMaxPickerElement = ref<HTMLElement | null>(null);

    const newChoiceInput = ref('');
    const newChoiceLabelInput = ref('');

    return {
      dateMinPickerElement,
      dateMaxPickerElement,
      newChoiceInput,
      newChoiceLabelInput
    };
  },
  computed: {
    isDateParam(): boolean {
      return this.selectedParameter.type === DatacubeGenericAttributeVariableType.Date;
    },
    isDateRangeParam(): boolean {
      return this.selectedParameter.type === DatacubeGenericAttributeVariableType.DateRange;
    },
    isGeoParam(): boolean {
      return this.selectedParameter.type === DatacubeGenericAttributeVariableType.Geo;
    },
    acceptableGeoFormats(): string[] {
      return Object.values(GeoAttributeFormat); // TODO: consider more human-readable labels
    },
    allGeoLevels(): string[] {
      return Object.values(DatacubeGeoAttributeVariableType); // TODO: consider more human-readable labels
    },
    geoFormatExample(): string {
      if (!this.updatedParameter || this.updatedParameter.additional_options.geo_bbox_format === undefined) return '';
      // show some format example
      let formatStr = this.updatedParameter.additional_options.geo_bbox_format;
      if (this.updatedParameter.additional_options.geo_region_format === GeoAttributeFormat.Bounding_Box) {
        formatStr = formatStr.replace('{left}', ETHIOPIA_BOUNDING_BOX.LEFT.toString());
        formatStr = formatStr.replace('{top}', ETHIOPIA_BOUNDING_BOX.TOP.toString());
        formatStr = formatStr.replace('{right}', ETHIOPIA_BOUNDING_BOX.RIGHT.toString());
        formatStr = formatStr.replace('{bottom}', ETHIOPIA_BOUNDING_BOX.BOTTOM.toString());
        return formatStr;
      }
      if (this.updatedParameter.additional_options.geo_region_format === GeoAttributeFormat.Full_GADM_PATH) {
        // example gadm path: country__admin1__admin2__admin3
        const allGeoLevels = Object.values(DatacubeGeoAttributeVariableType) as string[];
        return allGeoLevels.join(REGION_ID_DELIMETER);
      }
      if (this.updatedParameter.additional_options.geo_region_format === GeoAttributeFormat.GADM_Code) {
        return this.updatedParameter.additional_options.geo_omit_gadm_code_version ? 'ETH.7' : 'ETH.7_1'; // example geo-code
      }
      return '';
    }
  },
  data: () => ({
    updatedParameter: undefined as ModelParameter | undefined,
    GeoAttributeFormat,
    defaultBBoxFormat: '[ [{left}, {top}], [{right}, {bottom}] ]'
  }),
  mounted() {
    this.updatedParameter = _.cloneDeep(this.selectedParameter);

    const datePickerOptions: flatpickr.Options.Options = {
      allowInput: false, // should the user be able to directly enter date value?
      wrap: true, // enable the flatpickr lib to utilize toggle/clear buttons
      clickOpens: false // do not allow click on the input date picker to open the calendar
    };
    nextTick(() => {
      if (this.dateMinPickerElement !== null) {
        flatpickr(this.dateMinPickerElement, datePickerOptions);
      }
      if (this.dateMaxPickerElement !== null) {
        flatpickr(this.dateMaxPickerElement, datePickerOptions);
      }
    });

    // ensure some default options are there for date/date-range and geo parameters
    if (!this.updatedParameter.additional_options) {
      this.updatedParameter.additional_options = {};
    }
    if (!this.updatedParameter.additional_options.default_value_label) {
      this.updatedParameter.additional_options.default_value_label = this.updatedParameter.default;
    }
    if (this.isGeoParam) {
      if (!this.updatedParameter.additional_options.geo_region_format) {
        this.updatedParameter.additional_options.geo_region_format = GeoAttributeFormat.Full_GADM_PATH;
      }
      if (!this.updatedParameter.additional_options.geo_acceptable_levels) {
        this.updatedParameter.additional_options.geo_acceptable_levels = this.allGeoLevels;
      }
      if (!this.updatedParameter.additional_options.geo_bbox_format) {
        this.resetBBoxFormat();
      }
      if (this.updatedParameter.additional_options.geo_omit_gadm_code_version === undefined) {
        this.updatedParameter.additional_options.geo_omit_gadm_code_version = false;
      }
    }
    if (this.isDateRangeParam || this.isDateParam) {
      if (this.isDateRangeParam && !this.updatedParameter.additional_options.date_range_delimiter) {
        this.updatedParameter.additional_options.date_range_delimiter = DEFAULT_DATE_RANGE_DELIMETER;
      }
      if (!this.updatedParameter.additional_options.date_min) {
        this.updatedParameter.additional_options.date_min = '';
      }
      if (!this.updatedParameter.additional_options.date_max) {
        this.updatedParameter.additional_options.date_max = '';
      }
    }
  },
  methods: {
    deleteChoice(choice: string) {
      if (this.updatedParameter && this.updatedParameter.choices) {
        const choiceIndex = this.updatedParameter?.choices?.findIndex(c => c === choice);
        this.updatedParameter.choices.splice(choiceIndex, 1);
        this.updatedParameter.choices_labels?.splice(choiceIndex, 1);
      }
    },
    toggleOmitGADMCodeVersion() {
      if (this.updatedParameter) {
        this.updatedParameter.additional_options.geo_omit_gadm_code_version = !this.updatedParameter.additional_options.geo_omit_gadm_code_version;
      }
    },
    resetBBoxFormat() {
      if (this.updatedParameter) {
        this.updatedParameter.additional_options.geo_bbox_format = this.defaultBBoxFormat;
      }
    },
    updateAcceptableGeoFormat(val: GeoAttributeFormat) {
      if (this.updatedParameter) {
        this.updatedParameter.additional_options.geo_region_format = val;
      }
    },
    updateAcceptableGeoLevels(val: string) {
      if (this.updatedParameter) {
        //
        // toggle level
        //
        const acceptableLevels = this.updatedParameter.additional_options.geo_acceptable_levels ?? [];
        if (acceptableLevels.includes(val)) {
          // only remove this level if there is at least one other acceptable level
          if (acceptableLevels.length > 1) {
            this.updatedParameter.additional_options.geo_acceptable_levels = acceptableLevels.filter(l => l !== val);
          }
        } else {
          // add level
          this.updatedParameter.additional_options.geo_acceptable_levels = [...acceptableLevels, val];
        }
      }
    },
    saveUpdatedParamOptions() {
      // optimization: do not save if nothing has changed
      //  compare 'updatedParameter' against 'selectedParameter'
      let dataHasChanged = true;

      // check param choices/date/date-range/geo
      if (_.isEqual(this.updatedParameter, this.selectedParameter)) {
        dataHasChanged = false;
      }

      // save updated parameter in the original metadata
      if (dataHasChanged) {
        this.$emit('close', { cancel: false, updatedParameter: this.updatedParameter });
      } else {
        this.close();
      }
    },
    close(cancel = true) {
      this.$emit('close', { cancel });
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

::v-deep(.modal-container) {
  width: max-content;
  max-width: 80vw;
  .modal-body {
    height: 300px;
    width: 50vw;
    overflow-y: scroll;
  }
}

.title {
  text-transform: initial !important;
  margin-top: 2rem;
  padding-left: 2rem;
  font-weight: bold;
  font-size: x-large !important;
}

.param-choices-container {
  padding: 1rem;
}

.new-runs-date-picker-container {
  display: flex;
  margin-left: 1rem;
  margin-right: 1rem;
  .date-picker-input {
    border-width: thin;
    background-color: lightgray;
    cursor: auto;
  }
  .date-picker-buttons {
      padding: 4px 8px;
    }
}

.date-option-container {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  // width: 100%;
}

.checkbox {
  user-select: none; /* Standard syntax */
  display: inline-block;
  margin: 0;
  padding: 0;
  label {
    font-weight: normal;
    margin: 0;
    padding: 0;
    cursor: auto;
    color: gray;
  }
}

.delete-choice {
  font-size: $font-size-large;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #ff6955;
  cursor: pointer;

  &:hover {
    color: #850f00;
  }
}

</style>
