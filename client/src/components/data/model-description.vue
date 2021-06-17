<template>
  <div class="model-description-container">
    <table class="table model-table">
      <thead>
          <tr>
              <th>Input Knobs</th>
              <th>Description</th>
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
    <table class="table model-table">
      <thead>
          <tr>
              <th>
                Output Knobs
              </th>
              <th v-if="outputVariables.length > 0 && currentOutputName !== ''">
                Selected Output:
                <span style="fontWeight: normal">
                  {{ outputVariables[currentOutputIndex].display_name }}
                </span>
              </th>
          </tr>
      </thead>
      <tbody v-if="metadata && metadata.outputs">
        <tr
          v-for="param in outputVariables"
          :key="param.id"
          :style="{backgroundColor: param.name === currentOutputName ? 'gray' : 'transparent'}">
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
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, toRefs } from 'vue';
import _ from 'lodash';
import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { useStore } from 'vuex';
import useModelMetadata from '@/services/composables/useModelMetadata';

export default defineComponent({
  name: 'DatacubeDescription',
  components: {
  },
  props: {
    selectedModelId: {
      type: String,
      default: null
    }
  },
  emits: [
    'check-model-metadata-validity'
  ],
  setup(props) {
    const { selectedModelId } = toRefs(props);
    const metadata = useModelMetadata(selectedModelId) as Ref<Model | null>;
    const store = useStore();

    // NOTE: this index is mostly driven from the component 'datacube-model-header'
    //       which may list either all outputs or only the validated ones
    const currentOutputIndex: ComputedRef<number> = computed(() => store.getters['modelPublishStore/currentOutputIndex']);

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
      metadata,
      currentOutputIndex,
      currentOutputName,
      outputVariables
    };
  },
  computed: {
    inputParameters(): Array<any> {
      return this.metadata ? this.metadata.parameters.filter((p: ModelParameter) => !p.is_drilldown) : [];
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

.model-table tbody tr td {
  border-width: 0px;
  line-height: 24px;
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
  margin-bottom: 10px;
  border-color: rgb(216, 214, 214);
  min-width: 100px;
  flex-basis: 100%;
}

.model-attribute-desc {
  border-width: 1px;
  margin-bottom: 22px;
  border-color: rgb(216, 214, 214);
  min-width: 400px;
  flex-basis: 100%;
}

.model-description-container {
  flex-wrap: initial;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

</style>
