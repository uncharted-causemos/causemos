<template>
  <div v-if="metadata" class="model-header">
    <div class="model-attribute-pair">
      <label style="font-weight: normal">Model</label>
      <input :value="metadata.name" type="text" class="disabled" style="border-width: 1px" />
    </div>
    <div class="model-attribute-pair">
      <label style="font-weight: normal">Default output variable</label>
      <select name="outputs" id="outputs" @change="onOutputSelectionChange($event)">
        <option
          v-for="(selectValue, indx) in modelOutputs"
          :key="selectValue"
          :selected="indx === currentOutputIndex"
        >
          {{ selectValue }}
        </option>
      </select>
    </div>
    <div class="model-attribute-pair" style="flex-grow: inherit">
      <label style="font-weight: normal">Model description</label>
      <textarea :value="metadata.description" @input="updateDesc" rows="2" />
    </div>
  </div>
</template>

<script lang="ts">
import { Model } from '@/types/Datacube';
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { useStore } from 'vuex';
import { getOutputs } from '@/utils/datacube-util';
import { updateDatacubesOutputsMap } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';
import useActiveDatacubeFeature from '@/composables/useActiveDatacubeFeature';
import _ from 'lodash';

export default defineComponent({
  name: 'DatacubeModelHeader',
  props: {
    metadata: {
      type: Object as PropType<Model | null>,
      default: null,
    },
    itemId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { metadata, itemId } = toRefs(props);

    const maintainer = computed<any>(() => {
      return metadata.value?.maintainer ?? {};
    });

    const modelOutputs = computed<string[]>(() => {
      const outputs = metadata.value && getOutputs(metadata.value);
      return outputs?.map((o) => o.display_name) ?? [];
    });

    function updateDesc(e: Event) {
      if (metadata.value) {
        const textArea = e.target as HTMLTextAreaElement;
        metadata.value.description = textArea.value;
      }
    }

    const store = useStore();
    const route = useRoute();
    const { currentOutputIndex } = useActiveDatacubeFeature(metadata, itemId);

    return {
      updateDesc,
      maintainer,
      modelOutputs,
      currentOutputIndex,
      store,
      route,
    };
  },
  methods: {
    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      updateDatacubesOutputsMap(this.itemId, this.store, selectedOutputIndex);
    },
  },
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
