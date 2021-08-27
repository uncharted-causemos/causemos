<template>
  <modal-edit-param-choices
    v-if="showEditParamChoicesModal === true"
    :selected-parameter="selectedParameter"
    @close="onEditParamChoicesModalClose" />
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
              :class="{ 'attribute-invalid': !isValid(param.unit) }"
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
          <td style="padding-right: 0">
            <div class="checkbox">
              <label
                @click="updateInputKnobVisibility(param)"
                style="cursor: pointer; color: black;">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': param.is_visible, 'fa-square-o': !param.is_visible }"
                />
                Visibility
              </label>
            </div>
            <div class="checkbox">
              <label>
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': param.data_type === ModelParameterDataType.Freeform, 'fa-square-o': param.data_type !== ModelParameterDataType.Freeform }"
                />
                Freeform
              </label>
            </div>
            <button
              v-if="param.choices_labels"
              type="button"
              class="btn btn-link edit-choices"
              @click="editParamChoices(param)">
              Rename Choices
            </button>
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
              :class="{ 'attribute-invalid': !isValid(param.unit) }"
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
          <td style="padding-right: 0">
            <div class="checkbox">
              <label
                @click="updateOutputVisibility(param)"
                style="cursor: pointer; color: black;">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': param.is_visible, 'fa-square-o': !param.is_visible }"
                />
                Visibility
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
              <th class="additional-col"></th>
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
              :class="{ 'attribute-invalid': !isValid(qualifier.unit) }"
            >
            <div>Related Features</div>
            <select disabled ame="related_features" id="related_features">
              <option
                v-for="relatedFeature in qualifier.related_features"
                :key="relatedFeature"
              >{{relatedFeature}}</option>
            </select>
          </td>
          <td>
            <textarea
              v-model="qualifier.description"
              type="text"
              rows="3"
              class="model-attribute-desc"
              :class="{ 'attribute-invalid': !isValid(qualifier.description) }"
            />
            <div class="checkbox">
              <label
                @click="updateDrilldownVisibility(qualifier)"
                style="cursor: pointer; color: black;">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': qualifier.is_visible, 'fa-square-o': !qualifier.is_visible }"
                />
                Visibility
              </label>
            </div>
          </td>
          <td>
            <div>Role</div>
            <div
              v-if="qualifier.roles"
              class="role-list"
              :class="{ 'attribute-invalid': !(qualifier.roles.length > 0) }"
            >
              <div
                v-for="role in Object.values(FeatureQualifierRoles)"
                :key="role"
                @click="updateQualifierRole(qualifier, role)"
              >
                <div>
                  <i
                    class="fa fa-fw"
                    :class="{ 'fa-check-square-o': isValidQualifierRole(qualifier, role), 'fa-square-o': !isValidQualifierRole(qualifier, role) }"
                  />
                  {{ role }}
                </div>
                </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ComputedRef, toRefs, Ref, ref } from 'vue';
import _ from 'lodash';
import { DatacubeFeature, FeatureQualifier, Model, ModelParameter } from '@/types/Datacube';
import { mapActions, useStore } from 'vuex';
import { FeatureQualifierRoles, ModelParameterDataType } from '@/types/Enums';
import ModalEditParamChoices from '@/components/modals/modal-edit-param-choices.vue';

export default defineComponent({
  name: 'ModelDescription',
  components: {
    ModalEditParamChoices
  },
  props: {
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    }
  },
  emits: [
    'check-model-metadata-validity',
    'refresh-metadata'
  ],
  setup(props) {
    const { metadata } = toRefs(props);
    const store = useStore();

    // NOTE: this index is mostly driven from the component 'datacube-model-header'
    //       which may list either all outputs or only the validated ones
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    const outputVariables: ComputedRef<DatacubeFeature[]> = computed(() => {
      return metadata.value ? metadata.value.outputs : [];
    });

    const validatedOutputVariables: ComputedRef<DatacubeFeature[]> = computed(() => {
      if (metadata.value) {
        return metadata.value.validatedOutputs ?? metadata.value.outputs;
      }
      return [];
    });

    const currentOutputFeature = computed(() => {
      return validatedOutputVariables.value[currentOutputIndex.value];
    });

    const selectedParameter = ref(null) as Ref<ModelParameter | null>;
    const showEditParamChoicesModal = ref(false);

    return {
      datacubeCurrentOutputsMap,
      currentOutputIndex,
      validatedOutputVariables,
      currentOutputFeature,
      outputVariables,
      FeatureQualifierRoles,
      ModelParameterDataType,
      showEditParamChoicesModal,
      selectedParameter
    };
  },
  computed: {
    inputParameters(): Array<any> {
      return this.metadata && this.metadata.parameters ? this.metadata.parameters.filter((p: ModelParameter) => !p.is_drilldown) : [];
    },
    qualifiers(): Array<any> {
      // includes both drilldown-inputs and output-qualifiers
      const qualifiers = [];
      // first, add actual output qualifiers
      qualifiers.push(...this.metadata?.qualifier_outputs ?? []);
      // then, add all drilldown params as qualifiers
      const drilldownParams = this.metadata?.parameters.filter((p: ModelParameter) => p.is_drilldown) ?? [];
      drilldownParams.forEach((p: any) => {
        // since ModelParameter does not share the same structure as FeatureQualifier,
        //  we need to add the missing FeatureQualifier attributes
        if (!p.roles) {
          p.roles = [];
        }
        if (!p.roles.includes(FeatureQualifierRoles.Breakdown)) {
          p.roles.push(FeatureQualifierRoles.Breakdown);
        }
        if (!p.related_features) {
          p.related_features = [(this.currentOutputFeature as DatacubeFeature).name];
        }
      });
      qualifiers.push(...drilldownParams);
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
    scrollToSection(sectionName: string) {
      const elm = document.getElementById(sectionName) as HTMLElement;
      const scrollViewOptions: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      };
      elm.scrollIntoView(scrollViewOptions);
    },
    editParamChoices(param: ModelParameter) {
      // show a modal to edit param choices
      this.selectedParameter = param;
      this.showEditParamChoicesModal = true;
    },
    onEditParamChoicesModalClose(status: any) {
      this.showEditParamChoicesModal = false;
      if (status.cancel === false) {
        const updatedParam = status.updatedParameter;
        if (this.selectedParameter !== null) {
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
    updateQualifierRole(qualifier: FeatureQualifier, role: FeatureQualifierRoles) {
      if (qualifier.roles.includes(role)) {
        qualifier.roles = qualifier.roles.filter(r => r !== role);
      } else {
        qualifier.roles.push(role);
      }
    },
    isValidQualifierRole(qualifier: FeatureQualifier, role: FeatureQualifierRoles) {
      return qualifier.roles.includes(role);
    },
    isValid(name: string) {
      return name && name !== '';
    },
    checkAndNotifyValidity() {
      if (this.metadata === null || _.isEmpty(this.metadata)) {
        return;
      }
      let isValid = true;
      const invalidInputs = this.inputParameters.filter((p: any) => !this.isValid(p.display_name) || !this.isValid(p.unit) || !this.isValid(p.description));
      const invalidOutputs = this.outputVariables.filter((p: any) => !this.isValid(p.display_name) || !this.isValid(p.unit) || !this.isValid(p.description));
      const outputQualifiers = this.qualifiers.filter((p: any) => !this.isValid(p.display_name) || !this.isValid(p.unit) || !this.isValid(p.description));

      if (invalidInputs.length > 0 || invalidOutputs.length > 0 || outputQualifiers.length > 0) {
        isValid = false;
      }
      const parentComp = this.$parent;
      if (parentComp) {
        parentComp.$emit('check-model-metadata-validity', { valid: isValid });
      }
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
        if (this.currentOutputIndex > 0) {
          updatedCurrentOutputsMap[this.metadata?.id ?? ''] = this.currentOutputIndex - 1;
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
  width: 60%
}

.additional-col {
  width: 20%
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

.edit-choices {
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
  margin-top: 0;
  color: black;
}

</style>
