<template>
  <div v-if="metadata" class="model-header">
    <div class="model-attribute-pair">
      <label style="font-weight: normal;">Model</label>
      <input
        :value="metadata.name"
        type="text"
        class="disabled"
        style="border-width: 1px;"
      >
    </div>
    <div class="model-attribute-pair">
      <label style="font-weight: normal;">Default output variable</label>
      <select name="outputs" id="outputs" @change="onOutputSelectionChange($event)">
        <option
          v-for="(selectValue, indx) in modelOutputs"
          :key="selectValue"
          :selected="indx === currentOutputIndex"
        >{{selectValue}}</option>
      </select>
    </div>
    <div class="model-attribute-pair" style="flex-grow: inherit">
      <label style="font-weight: normal;">Model description</label>
      <textarea :value="metadata.description" @input="updateDesc" rows="2" />
    </div>
  </div>
</template>

<script lang="ts">
import { Model } from '@/types/Datacube';
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';
import { mapActions, useStore } from 'vuex';
import { getOutputs } from '@/utils/datacube-util';
import { getDatacubeKeyFromAnalysis } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';

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

    const maintainer = computed<any>(() => {
      return metadata.value?.maintainer ?? {};
    });

    const modelOutputs = computed<string[]>(() => {
      const outputs = metadata.value && getOutputs(metadata.value);
      return outputs?.map(o => o.display_name) ?? [];
    });

    function updateDesc (e: InputEvent) {
      if (metadata.value) {
        const textArea = e.target as HTMLTextAreaElement;
        metadata.value.description = textArea.value;
      }
    }

    const store = useStore();
    const route = useRoute();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = ref(0);
    watch(
      () => [
        metadata.value,
        datacubeCurrentOutputsMap.value
      ],
      () => {
        const datacubeKey = getDatacubeKeyFromAnalysis(metadata.value, store, route);
        currentOutputIndex.value = datacubeCurrentOutputsMap.value[datacubeKey] ? datacubeCurrentOutputsMap.value[datacubeKey] : 0;
      }
    );

    return {
      updateDesc,
      maintainer,
      modelOutputs,
      currentOutputIndex,
      store,
      route
    };
  },
  methods: {
    ...mapActions({
      setDatacubeCurrentOutputsMap: 'app/setDatacubeCurrentOutputsMap'
    }),
    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      const datacubeKey = getDatacubeKeyFromAnalysis(this.metadata, this.store, this.route);
      const defaultFeature = {
        [datacubeKey]: selectedOutputIndex
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
