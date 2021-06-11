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
              :class="{ 'attribute-invalid': param.display_name === '' }"
            >
            <input
              v-model="param.unit"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': param.unit === '' }"
            >
          </td>
          <td>
            <textarea
              v-model="param.description"
              type="text"
              class="model-attribute-desc"
              :class="{ 'attribute-invalid': param.description === '' }"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <table class="table model-table">
      <thead>
          <tr>
              <th>Output Knobs</th>
          </tr>
      </thead>
      <tbody v-if="metadata && metadata.outputs">
        <tr v-for="param in metadata.outputs" :key="param.id">
          <td class="model-attribute-pair">
            <input
              v-model="param.display_name"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': param.display_name === '' }"
            >
            <input
              v-model="param.unit"
              type="text"
              class="model-attribute-text"
              :class="{ 'attribute-invalid': param.unit === '' }"
            >
          </td>
          <td>
            <textarea
              v-model="param.description"
              type="text"
              class="model-attribute-desc"
              :class="{ 'attribute-invalid': param.description === '' }"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import _ from 'lodash';
import { Model, ModelParameter } from '@/types/Datacube';
import { getDatacubeById } from '@/services/new-datacube-service';

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
    const metadata = ref<Model | null>(null);
    async function fetchMetadata() {
      const response = await getDatacubeById(props.selectedModelId);
      metadata.value = response;
    }
    fetchMetadata();
    return {
      metadata
    };
  },
  computed: {
    inputParameters(): Array<any> {
      return this.metadata ? this.metadata.parameters.filter((p: ModelParameter) => !p.is_drilldown) : [];
    }
  },
  mounted(): void {
    this.checkAndNotifyValidity();
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
    checkAndNotifyValidity() {
      if (this.metadata === null || _.isEmpty(this.metadata)) {
        return;
      }
      let isValid = true;
      const invalidInputs = this.metadata.parameters.filter((p: any) => p.display_name === '' || p.unit === '' || p.description === '');
      const invalidOutputs = this.metadata.outputs.filter((p: any) => p.display_name === '' || p.unit === '' || p.description === '');
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
}

</style>
