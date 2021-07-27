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
        <select name="outputs" id="outputs"
          v-if="attr.type === 'select'"
          @change="onOutputSelectionChange($event)"
        >
          <option
            v-for="(selectValue, indx) in attr.value"
            :key="selectValue"
            :selected="indx === currentOutputIndex"
          >{{selectValue}}</option>
        </select>
    </div>
  </div>
</template>

<script lang="ts">
import { Model } from '@/types/Datacube';
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { mapActions, useStore } from 'vuex';

interface ModelAttribute {
  name: string;
  value: string | string[];
  tweakable: boolean;
  type?: string;
}

export default defineComponent({
  name: 'DatacubeModelHeader',
  props: {
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    }
  },
  setup(props) {
    const { metadata } = toRefs(props);

    const modelAttributes = computed<ModelAttribute[]>(() => {
      const attributes: ModelAttribute[] = [];
      if (metadata.value === null) return attributes;
      // fill in the model attribute
      // TODO: how spacing and label names are used
      attributes.push({
        name: 'Model family',
        value: metadata.value.name,
        tweakable: false,
        type: 'text'
      });
      /*
      attributes.push({
        name: 'Model instance',
        value: modelMetadata.version,
        tweakable: false,
        type: 'text'
      });
      */
      const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;
      attributes.push({
        name: 'Default output variable',
        value: outputs.map(o => o.display_name),
        tweakable: true,
        type: 'select'
      });
      attributes.push({
        name: 'Model description',
        value: metadata.value.description,
        tweakable: true,
        type: 'textarea'
      });
      return attributes;
    });

    const store = useStore();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    return {
      modelAttributes,
      currentOutputIndex
    };
  },
  methods: {
    ...mapActions({
      setDatacubeCurrentOutputsMap: 'app/setDatacubeCurrentOutputsMap'
    }),
    updateAttributeValue(attr: ModelAttribute) {
      console.log(attr.value);
      // TODO: update the local data or the back end to ensure other components are synced up
    },
    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      const defaultFeature = {
        [this.metadata?.id ?? '']: selectedOutputIndex
      };
      this.setDatacubeCurrentOutputsMap(defaultFeature);
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
