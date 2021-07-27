<template>
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
    <table id="inputknobs" class="table model-table">
      <thead>
          <tr>
              <th class="name-col">Input Knobs</th>
              <th class="desc-col">Description</th>
          </tr>
      </thead>
      <tbody v-if="metadata && metadata.parameters">
        <tr v-for="param in inputParameters" :key="param.id">
          <td class="model-attribute-pair">
            <input
              v-model="param.display_name"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': !isValid(param.display_name) }"
            >
            <input
              v-model="param.unit"
              type="text"
              class="model-attribute-text"
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
        </tr>
      </tbody>
    </table>
    <table id="outputknobs" class="table model-table">
      <thead>
          <tr>
              <th class="name-col">
                Output Features
                <div v-if="outputVariables.length > 0 && currentOutputName !== ''">
                  <span style="fontWeight: normal; fontStyle: italic">
                    Default: {{ outputVariables[currentOutputIndex].display_name }}
                  </span>
                </div>
              </th>
              <th class="desc-col">Description</th>
          </tr>
      </thead>
      <tbody v-if="metadata && metadata.outputs">
        <tr
          v-for="param in outputVariables"
          :key="param.id"
          :class="{'primary-output': param.name === currentOutputName}">
          <td class="model-attribute-pair">
            <input
              v-model="param.display_name"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': !isValid(param.display_name) }"
            >
            <input
              v-model="param.unit"
              type="text"
              class="model-attribute-text"
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
      <tbody v-if="metadata && metadata.qualifier_outputs">
        <tr
          v-for="qualifier in metadata.qualifier_outputs"
          :key="qualifier.id">
          <td class="model-attribute-pair">
            <input
              v-model="qualifier.display_name"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': !isValid(qualifier.display_name) }"
            >
            <input
              v-model="qualifier.unit"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': !isValid(qualifier.unit) }"
            >
            <div>Related Features</div>
            <select disabled ame="related_features" id="related_features">
              <option
                v-for="relatedFeature in qualifier.related_features"
                :key="relatedFeature"
              >{{relatedFeature.name}}</option>
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
          </td>
          <td>
            <div>Role</div>
            <div class="role-list"
              :class="{ 'attribute-invalid': !(qualifier.roles.length > 0) }"
            >
              <div
                v-for="role in Object.keys(FeatureQualifierRoles)"
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
import { computed, defineComponent, PropType, ComputedRef, toRefs } from 'vue';
import _ from 'lodash';
import { DatacubeFeature, FeatureQualifier, Model, ModelParameter } from '@/types/Datacube';
import { useStore } from 'vuex';
import { FeatureQualifierRoles } from '@/types/Enums';

export default defineComponent({
  name: 'ModelDescription',
  components: {
  },
  props: {
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    }
  },
  emits: [
    'check-model-metadata-validity'
  ],
  setup(props) {
    const { metadata } = toRefs(props);
    const store = useStore();

    // NOTE: this index is mostly driven from the component 'datacube-model-header'
    //       which may list either all outputs or only the validated ones
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    const outputVariables: ComputedRef<DatacubeFeature[]> = computed(() => {
      if (metadata.value && currentOutputIndex.value >= 0) {
        const outputs = metadata.value.validatedOutputs ? metadata.value.validatedOutputs : metadata.value.outputs;
        return outputs;
      }
      return [];
    });

    const currentOutputName = computed(() => {
      if (outputVariables.value) {
        return outputVariables.value[currentOutputIndex.value].name;
      }
      return '';
    });

    return {
      currentOutputIndex,
      currentOutputName,
      outputVariables,
      FeatureQualifierRoles
    };
  },
  computed: {
    inputParameters(): Array<any> {
      return this.metadata && this.metadata.parameters ? this.metadata.parameters.filter((p: ModelParameter) => !p.is_drilldown) : [];
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
    scrollToSection(sectionName: string) {
      const elm = document.getElementById(sectionName) as HTMLElement;
      const scrollViewOptions: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      };
      elm.scrollIntoView(scrollViewOptions);
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
      if (invalidInputs.length > 0 || invalidOutputs.length > 0) {
        isValid = false;
      }
      const parentComp = this.$parent;
      if (parentComp) {
        parentComp.$emit('check-model-metadata-validity', { valid: isValid });
      }
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

</style>
