<template>
  <div class="datacube-description-container">
    <div class="datacube-description-column">
      <template v-if="metadata.parameters">
        <h5>Input Descriptions</h5>
        <div
          v-for="param in inputParameters"
          :key="param.id"
        >
          <b>{{param.display_name}} </b>
          <span v-if="param.unit" v-tooltip="param.unit_description"> ({{param.unit}})</span>
          <span v-if="param.description">: {{ param.description }}</span>
          <p />
        </div>
      </template>
      <template v-if="metadata.outputs">
        <h5>Output Descriptions</h5>
        <div
          v-for="output in metadata.outputs"
          :key="output.id"
        >
          <b>{{output.display_name}} </b>
          <span v-if="output.unit" v-tooltip="output.unit_description"> ({{output.unit}})</span>
          <span v-if="output.description">: {{ output.description }}</span>
        </div>
      </template>
    </div>
    <div class="datacube-description-column"
         v-if="metadata.name" >
      <h5>Datacube Details</h5>
      <div
        v-if="metadata.geography.country"
        class="metadata-row"
      >
        <b>Country: </b> {{ metadata.geography.country[0] }}
      </div>
      <div class="metadata-row">
        <b>Dataset/Model: </b> {{ metadata.name }}
        <div v-if="metadata.description !== null">
        {{ metadata.description }}</div>
      </div>
      <div
        v-if="metadata.maintainer"
        class="metadata-row"
      >
        <b>Maintainer: </b> {{ metadata.maintainer.name }} ({{metadata.maintainer.email}}),
        {{metadata.maintainer.organization}}
      </div>
      <div class="metadata-row" v-if="isSourceValidUrl"><strong>Source: </strong>
        <a
          :href="metadata.maintainer.website"
          target="_blank"
          rel="noopener noreferrer">
          {{ metadata.maintainer.website }}
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import API from '@/api/api';
import { defineComponent, ref } from 'vue';
import stringUtil from '@/utils/string-util';

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
  setup(props) {
    const metadata = ref<any>({});
    async function fetchMetadata() {
      const response = await API.get(`/maas/new-datacubes/${props.selectedModelId}`, {
        params: {
        }
      });
      metadata.value = response.data;
    }
    fetchMetadata();
    return {
      metadata
    };
  },
  computed: {
    isSourceValidUrl(): boolean {
      return stringUtil.isValidUrl(this.metadata.maintainer.website);
    },
    inputParameters(): Array<any> {
      return this.metadata.parameters.filter((p: any) => !p.is_drilldown);
    }
  }
});
</script>


<style lang="scss" scoped>
@import "~styles/variables";

.datacube-description-container {
  flex-wrap: initial;
  width: 100%;
  display: flex;
  flex-direction: row;
}

.datacube-description-column {
  flex: 1;
  flex-basis: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 10px;

  h5 {
    @include header-secondary;
  }
}

.metadata-row {
  margin-bottom: 5px;

  &--top-margin {
    margin-top: 25px;
  }
}

</style>
