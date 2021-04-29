<template>
  <div class="model-header">
    <div
      v-for="attr in modelAttributes"
      :key="attr.name"
      class="model-attribute-pair">
        <label style="font-weight: normal;">{{ attr.name }} </label>
        <input
          v-model="attr.value"
          v-on:change="updateAttributeValue(attr)"
          type="text"
          placeholder=""
          :class="{ 'disabled': !attr.tweakable }"
          style="border-width: 1px;"
          v-bind:style="{ minWidth: attr.minValueWidth + 'px' }"
        >
    </div>
  </div>
</template>

<script lang="ts">
import API from '@/api/api';
import { defineComponent, ref, watch } from 'vue';

interface ModelAttribute {
  name: string;
  value: string;
  tweakable: boolean;
  minValueWidth?: number;
}

export default defineComponent({
  name: 'DatacubeModelHeader',
  props: {
    selectedModelId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const modelAttributes = ref<ModelAttribute[]>([]);

    const minimumInputTextWidth = 60; // pixels

    // FIXME: to really support proper data handling, do not fetch data locally at every component
    //         instead, fetch at parent and pass to children as needed, so updating one will update the others
    async function fetchModelInfo() {
      if (props.selectedModelId === null) return;

      const result = await API.get('fetch-demo-data', {
        params: {
          modelId: props.selectedModelId,
          type: 'metadata'
        }
      });
      const modelMetadata = JSON.parse(result.data); // FIXME: this should use the Model data type

      // fill in the model attribute
      // TODO: how spacing and label names are used
      modelAttributes.value.push({
        name: 'Model family',
        value: modelMetadata.name,
        tweakable: false,
        minValueWidth: minimumInputTextWidth
      });
      modelAttributes.value.push({
        name: 'Model instance',
        value: modelMetadata.version,
        tweakable: false,
        minValueWidth: minimumInputTextWidth
      });
      // TODO: this should be a dropdown
      modelAttributes.value.push({
        name: 'Default output variable',
        value: modelMetadata.outputs[0].display_name,
        tweakable: true,
        minValueWidth: minimumInputTextWidth
      });
      // TODO: make the desc in a new line
      modelAttributes.value.push({
        name: 'Model description',
        value: modelMetadata.description,
        tweakable: true,
        minValueWidth: minimumInputTextWidth * 4
      });
    }

    watch(() => props.selectedModelId, fetchModelInfo, { immediate: true });

    return {
      modelAttributes
    };
  },
  methods: {
    updateAttributeValue(attr: ModelAttribute) {
      console.log(attr.value);
      // TODO: update the local data or the back end to ensure other components are synced up
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.model-header {
  padding: 10px 0;
  display: flex;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
}

.model-attribute-pair {
  display: flex;
  flex-direction: column;
  padding: 5px 10px;
}

.disabled {
  color: darkgray !important;
}

h6 {
  font-size: $font-size-large;
  margin: 0;
}
</style>
