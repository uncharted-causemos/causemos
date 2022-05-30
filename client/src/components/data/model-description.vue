<template>
  <modal-edit-param-choices
    v-if="showEditParamOptionsModal === true"
    :selected-parameter="selectedParameter"
    @close="onEditParamOptionsModalClose" />
  <div class="desc-header">
    <a @click="scrollToSection('inputknobs')">
      Input Knobs
    </a>
    <a @click="scrollToSection('outputknobs')">
      Output Features
    </a>
    <a @click="scrollToSection('outputqualifiers')" style="margin-right: 1rem;" >
      Qualifiers
    </a>
  </div>
  <div class="model-description-container">
    <!-- inputs -->
    <table id="inputknobs" class="table model-table">
      <thead>
          <tr>
              <th class="name-col">Input Knobs</th>
              <th class="desc-col">Description</th>
              <th class="additional-col">Flags</th>
          </tr>
      </thead>
      <tbody v-if="metadata && inputParameters">
        <tr v-for="param in inputParameters" :key="param.id">
          <td class="model-attribute-pair">
            <input
              v-model="param.display_name"
              type="text"
              class="model-attribute-text"
              placeholder="display name"
              :class="{ 'attribute-invalid': !isValid(param.display_name) }"
            >
            <input
              v-model="param.unit"
              type="text"
              class="model-attribute-text"
              placeholder="unit"
            >
            <dropdown-button
              class="dropdown-button"
              :inner-button-label="'Type'"
              :items="getValidDataTypesForParam(param.type)"
              :selected-item="getDataTypeDisplayName(param.data_type)"
              @item-selected="setParamDataType($event, param)"
            />
          </td>
          <td>
            <textarea
              v-model="param.description"
              type="text"
              class="model-attribute-desc"
              :class="{ 'attribute-invalid': !isValid(param.description) }"
            />
            <dropdown-button
              v-if="canChangeType(param.type)"
              class="dropdown-button"
              :inner-button-label="'Field Type'"
              :items="paramTypeGroupButtons"
              :selected-item="param.type"
              @item-selected="setParamType($event, param)"
            />
            <div v-if="param.data_type === ModelParameterDataType.Numerical" class="numeric-param-range">
              <input
                v-model="param.min"
                type="number"
                class="model-param-range-text"
                placeholder="min"
                @keyup.enter="onParamRangeUpdated"
              >
              <input
                v-model="param.max"
                type="number"
                class="model-param-range-text"
                style="margin-left: 4px"
                placeholder="max"
                @keyup.enter="onParamRangeUpdated"
              >
            </div>
          </td>
          <td style="padding-right: 0; padding-left: 0; display: flex; flex-direction: column">
            <div v-if="isDateParam(param) === false" class="checkbox">
              <label
                @click="updateInputKnobVisibility(param)"
                style="cursor: pointer; color: black;">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': param.is_visible, 'fa-square-o': !param.is_visible }"
                />
                Visible
              </label>
            </div>
            <small-text-button
              v-if="param.choices_labels || isDateParam(param) || isGeoParam(param)"
              @click="editParamOptions(param)"
              :label="'Edit Options'"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <!-- outputs -->
    <table id="outputknobs" class="table model-table">
      <thead>
          <tr>
              <th class="name-col">
                Output Features
                <div v-if="outputVariables.length > 0">
                  <span style="fontWeight: normal; fontStyle: italic">
                    Default: {{ currentOutputFeature.display_name }}
                  </span>
                </div>
              </th>
              <th class="desc-col">Description</th>
              <th class="additional-col">Flags</th>
          </tr>
      </thead>
      <tbody v-if="metadata && metadata.outputs">
        <tr
          v-for="param in outputVariables"
          :key="param.id"
          :class="{'primary-output': param.name === currentOutputFeature.name}">
          <td class="model-attribute-pair">
            <input
              v-model="param.display_name"
              type="text"
              class="model-attribute-text"
              placeholder="display name"
              :class="{ 'attribute-invalid': !isValid(param.display_name) }"
            >
            <input
              v-model="param.unit"
              type="text"
              class="model-attribute-text"
              placeholder="unit"
            >
          </td>
          <td>
            <textarea
              v-model="param.description"
              type="text"
              class="model-attribute-desc"
              :class="{ 'attribute-invalid': !isValid(param.description) }"
            />
          </td>
          <td style="padding-right: 0; padding-left: 0">
            <div class="checkbox">
              <label
                @click="updateOutputVisibility(param)"
                style="cursor: pointer; color: black;">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': param.is_visible, 'fa-square-o': !param.is_visible }"
                />
                Visible
              </label>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- qualifiers -->
    <table id="outputqualifiers" class="table model-table">
      <thead>
          <tr>
              <th class="name-col">Qualifiers</th>
              <th class="desc-col">Description</th>
          </tr>
      </thead>
      <tbody v-if="metadata && qualifiers">
        <tr
          v-for="qualifier in qualifiers"
          :key="qualifier.id">
          <td class="model-attribute-pair">
            <input
              v-model="qualifier.display_name"
              type="text"
              class="model-attribute-text"
              placeholder="display name"
              :class="{ 'attribute-invalid': !isValid(qualifier.display_name) }"
            >
            <input
              v-model="qualifier.unit"
              type="text"
              class="model-attribute-text"
              placeholder="unit"
            >
          </td>
          <td>
            <textarea
              v-model="qualifier.description"
              type="text"
              rows="2"
              class="model-attribute-desc"
              :class="{ 'attribute-invalid': !isValid(qualifier.description) }"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ComputedRef, toRefs, Ref, ref } from 'vue';
import _ from 'lodash';
import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { mapActions, useStore } from 'vuex';
import {
  DatacubeAttributeVariableType,
  DatacubeGenericAttributeVariableType,
  ModelParameterDataType
} from '@/types/Enums';
import ModalEditParamChoices from '@/components/modals/modal-edit-param-choices.vue';
import { isBreakdownQualifier } from '@/utils/qualifier-util';
import { getOutputs } from '@/utils/datacube-util';
import { scrollToElement } from '@/utils/dom-util';
import DropdownButton from '@/components/dropdown-button.vue';
import { useRoute } from 'vue-router';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';
import SmallTextButton from '@/components/widgets/small-text-button.vue';

export default defineComponent({
  name: 'ModelDescription',
  components: {
    ModalEditParamChoices,
    DropdownButton,
    SmallTextButton
  },
  props: {
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    },
    itemId: {
      type: String,
      required: true
    }
  },
  emits: [
    'check-model-metadata-validity',
    'refresh-metadata'
  ],
  setup(props, { emit }) {
    const { metadata, itemId } = toRefs(props);
    const store = useStore();
    const route = useRoute();

    const getDataTypeDisplayName = (name: string) => {
      if (name === ModelParameterDataType.Nominal || name === ModelParameterDataType.Ordinal) {
        return 'Discrete';
      } else if (name === ModelParameterDataType.Numerical) {
        return 'Continuous';
      } else {
        return 'Freeform';
      }
    };

    // because nominal and ordinal are both mapped to discrete, we need to filter one of them out
    const paramDataTypeGroupButtons = _.uniqBy(
      Object.values(ModelParameterDataType)
        .map(val => ({ displayName: getDataTypeDisplayName(val), value: val })), 'displayName'
    );


    // Current Conversion Rules:
    //
    // string param cannot be made continuous, can only be switched between discrete and freeform
    // params of type string, geo, date. and date-range are convertible to each other without any validation
    // numeric params cannot be made freeform, only discrete and continuous
    // numeric params can have their range updated, or choices added

    const isDiscrete = (dataType: ModelParameterDataType) => {
      return dataType === ModelParameterDataType.Nominal || dataType === ModelParameterDataType.Ordinal || dataType === ModelParameterDataType.Freeform;
    };
    const isNumber = (type: DatacubeAttributeVariableType) => {
      return type === DatacubeGenericAttributeVariableType.Int || type === DatacubeGenericAttributeVariableType.Float;
    };

    const getValidDataTypesForParam = (paramType: DatacubeGenericAttributeVariableType) => {
      // remove freeform from numeric types
      if (isNumber(paramType)) {
        return paramDataTypeGroupButtons.filter(item => item.value !== ModelParameterDataType.Freeform);
      }
      // remove continuous from string param
      if (paramType === DatacubeGenericAttributeVariableType.String) {
        return paramDataTypeGroupButtons.filter(item => item.value !== ModelParameterDataType.Numerical);
      }
      return paramDataTypeGroupButtons;
    };

    const setParamDataType = (newDataType: ModelParameterDataType, param: ModelParameter) => {
      // convert continuous to discrete
      if (isDiscrete(newDataType)) {
        param.choices = []; // this will trigger loading choices from existing runs
        param.choices_labels = _.clone(param.choices);
        param.data_type = newDataType;
      }
      // convert discrete to numeric/continuous
      //  requires an initial (valid) range: min and max values
      if (isDiscrete(param.data_type) && isNumber(param.type) && newDataType === ModelParameterDataType.Numerical) {
        param.choices = undefined;
        param.choices_labels = undefined;
        param.data_type = newDataType;
      }

      // need to emit an event for the metadata to refresh the sync with all components
      emit('refresh-metadata');
    };

    // only the following type are convertable to each other
    //  i.e., a geo can be converted to string
    const validParamType = [
      DatacubeGenericAttributeVariableType.String,
      DatacubeGenericAttributeVariableType.Geo,
      DatacubeGenericAttributeVariableType.Date,
      DatacubeGenericAttributeVariableType.DateRange
    ];
    // REVIEW: this may be simplified as a direct map; i.e. Object.Keys(DatacubeGenericAttributeVariableType)
    const getTypeDisplayName = (name: string) => {
      if (name === DatacubeGenericAttributeVariableType.String) {
        return 'String';
      } else if (name === DatacubeGenericAttributeVariableType.Geo) {
        return 'Geo';
      } else if (name === DatacubeGenericAttributeVariableType.Date) {
        return 'Date';
      } else if (name === DatacubeGenericAttributeVariableType.DateRange) {
        return 'Date range';
      }
    };
    const paramTypeGroupButtons = ref(
      validParamType.map(val => ({ displayName: getTypeDisplayName(val), value: val }))
    );

    const setParamType = (newType: DatacubeGenericAttributeVariableType, param: ModelParameter) => {
      param.type = newType;
      // need to emit an event for the metadata to refresh the sync with all components
      emit('refresh-metadata');
    };
    const canChangeType = (type: DatacubeGenericAttributeVariableType) => {
      return validParamType.includes(type);
    };

    // NOTE: this index is mostly driven from the component 'datacube-model-header'
    //       which may list either all outputs or only the validated ones
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const { currentOutputIndex } = useActiveDatacubeFeature(metadata, itemId);

    const outputVariables: ComputedRef<DatacubeFeature[]> = computed(() => {
      return metadata.value ? metadata.value.outputs : [];
    });

    const validatedOutputVariables: ComputedRef<DatacubeFeature[]> = computed(() => {
      return metadata.value ? getOutputs(metadata.value) : [];
    });

    const currentOutputFeature = computed(() => {
      return validatedOutputVariables.value[currentOutputIndex.value];
    });

    const selectedParameter = ref(null) as Ref<ModelParameter | null>;
    const showEditParamOptionsModal = ref(false);

    return {
      datacubeCurrentOutputsMap,
      currentOutputIndex,
      validatedOutputVariables,
      currentOutputFeature,
      outputVariables,
      ModelParameterDataType,
      showEditParamOptionsModal,
      selectedParameter,
      paramTypeGroupButtons,
      setParamDataType,
      getDataTypeDisplayName,
      canChangeType,
      setParamType,
      getValidDataTypesForParam,
      store,
      route
    };
  },
  computed: {
    inputParameters(): Array<any> {
      return this.metadata && this.metadata.parameters ? this.metadata.parameters.filter((p: ModelParameter) => !p.is_drilldown) : [];
    },
    qualifiers(): Array<any> {
      // hide on-breakdown and implicit qualifiers, e.g., admin1, admin2, lat, lng, etc.
      const qualifiers = this.metadata?.qualifier_outputs?.filter(q => isBreakdownQualifier(q)) ?? [];
      return qualifiers;
    }
  },
  watch: {
    metadata: {
      handler(/* newValue, oldValue */) {
        this.checkAndNotifyValidity();
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    ...mapActions({
      setDatacubeCurrentOutputsMap: 'app/setDatacubeCurrentOutputsMap'
    }),
    isDateParam(param: ModelParameter) {
      return param.type === DatacubeGenericAttributeVariableType.Date || param.type === DatacubeGenericAttributeVariableType.DateRange;
    },
    isGeoParam(param: ModelParameter) {
      return param.type === DatacubeGenericAttributeVariableType.Geo;
    },
    scrollToSection(sectionName: string) {
      const elm = document.getElementById(sectionName) as HTMLElement;
      scrollToElement(elm);
    },
    editParamOptions(param: ModelParameter) {
      // show a modal to edit param options
      this.selectedParameter = param;
      this.showEditParamOptionsModal = true;
    },
    onEditParamOptionsModalClose(status: any) {
      this.showEditParamOptionsModal = false;
      if (status.cancel === false) {
        const updatedParam = status.updatedParameter;
        if (this.selectedParameter !== null) {
          if (this.isDateParam(this.selectedParameter) || this.isGeoParam(this.selectedParameter)) {
            this.selectedParameter.additional_options = updatedParam.additional_options;
          }
          this.selectedParameter.choices_labels = updatedParam.choices_labels;

          // need to emit an event for the metadata to refresh the sync with all components
          this.$emit('refresh-metadata');
        }
      }
    },
    visibleOutputsCount() {
      return this.validatedOutputVariables.filter(o => o.is_visible).length;
    },
    isValidatedOutput(output: DatacubeFeature) {
      return this.validatedOutputVariables.findIndex(o => o.name === output.name) >= 0;
    },
    isValid(name: string) {
      return name && name !== '';
    },
    checkAndNotifyValidity() {
      if (this.metadata === null || _.isEmpty(this.metadata)) {
        return;
      }
      let isValid = true;
      const invalidInputs = this.inputParameters.filter((p: any) => !this.isValid(p.display_name) || !this.isValid(p.description));
      const invalidOutputs = this.outputVariables.filter((p: any) => !this.isValid(p.display_name) || !this.isValid(p.description));
      const outputQualifiers = this.qualifiers.filter((p: any) => !this.isValid(p.display_name) || !this.isValid(p.description));

      if (invalidInputs.length > 0 || invalidOutputs.length > 0 || outputQualifiers.length > 0) {
        isValid = false;
      }
      this.$emit('check-model-metadata-validity', isValid);
    },
    updateInputKnobVisibility(param: ModelParameter) {
      param.is_visible = !param.is_visible;
      // need to emit an event for the metadata to refresh the sync with all components
      //  for example to allow the PC to show/hide
      //   the relevant dimension based on the updated visibility
      this.$emit('refresh-metadata');
    },
    updateOutputVisibility(output: DatacubeFeature) {
      // at least one validated output must be visible
      if (this.visibleOutputsCount() === 1 &&
          this.isValidatedOutput(output) && output.is_visible) {
        return;
      }

      output.is_visible = !output.is_visible;
      // need to emit an event for the metadata to refresh the sync with all components
      //  for example to filter the outputs dropdown list based on the updated visibility

      // if we are not toggling the 'currentOutputFeature', then update the currentOutputIndex
      // so that the currentOutputFeature would still be the same
      if (output.name !== this.currentOutputFeature.name) {
        const updatedCurrentOutputsMap = _.cloneDeep(this.datacubeCurrentOutputsMap);
        if (this.currentOutputIndex > 0) { // REVIEW!?
          const datacubeKey = this.itemId;
          updatedCurrentOutputsMap[datacubeKey] = this.currentOutputIndex - 1;
        }
        this.setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
      }

      this.$emit('refresh-metadata');
    },
    updateDrilldownVisibility(param: ModelParameter) {
      param.is_visible = !param.is_visible;
      // need to emit an event for the metadata to refresh the sync with all components
      //  for example to allow the Breakdown panel to show/hide
      //  the relevant drilldown-dimension based on the updated visibility
      this.$emit('refresh-metadata');
    },
    onParamRangeUpdated() {
      this.$emit('refresh-metadata');
    }
  }
});

</script>

<style lang="scss" scoped>
@import "~styles/variables";

.name-col {
  width: 20%
}

.desc-col {
  width: 70%
}

.additional-col {
  width: 10%
}

.role-list {
  display: flex;
  flex-direction: column;
  border-style: solid;
  border-width: thin;
  border-color: lightgray;
  overflow: auto;
  max-height: 80px;

  div {
    cursor: pointer;
    &:hover {
      background:#EAEBEC;
    }
  }
}

.desc-header {
  padding-bottom: 1rem;
  display: flex;
  justify-content: flex-end;

  a {
    margin-left: 2rem;
    color: blue;
    cursor: pointer;
  }
}

.model-table tbody tr td {
  border-width: 0px;
}

table.model-table thead tr th {
  background-color: lavender;
}

.primary-output {
  border-left-style: solid;
  border-left-color: cadetblue;
  border-left-width: 20px;
}

.model-attribute-pair {
  display: flex;
  flex-direction: column;
}

.attribute-invalid {
  border:1px solid red !important;
}

.model-attribute-text {
  border-width: 1px;
  margin-bottom: 6px;
  border-color: rgb(216, 214, 214);
  min-width: 100%;
  flex-basis: 100%;
}

.numeric-param-range {
  display: flex;
  margin-top: 1rem;
}
.model-param-range-text {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
}

.model-attribute-desc {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
  min-width: 100%;
  flex-basis: 100%;
}

.model-description-container {
  flex-wrap: initial;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  position: relative;
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

.dropdown-button {
  width: 100%;
}
:deep(.dropdown-btn) {
  width: 100%;
}

</style>
