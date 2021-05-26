<template>
  <div class="model-header">
    <div
      v-for="attr in modelAttributes"
      :key="attr.name"
      class="model-attribute-pair"
      :style="[attr.type === 'textarea' ? 'width: 100%' : '' ]"
      >
        <label style="font-weight: normal;">{{ attr.name }} </label>
        <input
          v-if="attr.type === 'text'"
          v-model="attr.value"
          v-on:change="updateAttributeValue(attr)"
          type="text"
          :class="{ 'disabled': !attr.tweakable }"
          style="border-width: 1px;"
        >
        <textarea
          v-if="attr.type === 'textarea'"
          v-model="attr.value"
          v-on:change="updateAttributeValue(attr)"
          rows="2"
          :class="{ 'disabled': !attr.tweakable }"
        />
        <select name="cars" id="cars"
          v-if="attr.type === 'select'"
        >
          <option
            v-for="selectValue in attr.value"
            :key="selectValue" >{{selectValue}}</option>
        </select>
    </div>
  </div>
</template>

<script lang="ts">
import API from '@/api/api';
import { Model } from '@/types/Datacube';
import { defineComponent, ref, watch } from 'vue';

interface ModelAttribute {
  name: string;
  value: string | string[];
  tweakable: boolean;
  type?: string;
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
      const modelMetadata: Model = JSON.parse(result.data); // FIXME: this should use the Model data type

      // fill in the model attribute
      // TODO: how spacing and label names are used
      modelAttributes.value.push({
        name: 'Model family',
        value: modelMetadata.name,
        tweakable: false,
        type: 'text'
      });
      /*
      modelAttributes.value.push({
        name: 'Model instance',
        value: modelMetadata.version,
        tweakable: false,
        type: 'text'
      });
      */
      modelAttributes.value.push({
        name: 'Default output variable',
        value: modelMetadata.outputs.map(o => o.display_name),
        tweakable: true,
        type: 'select'
      });
      modelAttributes.value.push({
        name: 'Model description',
        value: modelMetadata.description,
        tweakable: true,
        type: 'textarea'
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
  padding-bottom: 5px;
  padding-top: 0px;
  display: flex;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
}

.model-attribute-pair {
  display: flex;
  flex-direction: column;
  padding-right: 8px;
  padding-bottom: 4px;
  font-size: smaller;

  label {
    margin-bottom: 0;
  }
}

.disabled {
  color: darkgray !important;
}

h6 {
  font-size: $font-size-large;
  margin: 0;
}
</style>
