<template>
  <div class="datacube-description-container">
    <div class="datacube-description-column"
         v-if="metadata.parameters" >
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
      <h5>Output Descriptions</h5>
      <div
        v-for="output in metadata.outputs"
        :key="output.id"
      >
        <b>{{output.display_name}} </b>
        <span v-if="output.unit" v-tooltip="output.unit_description"> ({{output.unit}})</span>
        <span v-if="output.description">: {{ output.description }}</span>
      </div>
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
      <div class="metadata-row" v-if="metadata.maintainer.website"><strong>Source: </strong>
        <a
          v-if="isSourceValidUrl"
          :href="metadata.source"
          target="_blank"
          rel="noopener noreferrer"
        >{{ metadata.maintainer.website }}</a>
        <span v-else>{{ metadata.maintainer.website }}</span>
      </div>
      <!--<div
        v-if="isKnownAdmin(selectedParameterOptions.admin1)"
        class="metadata-row"
      >
        <b>Admin L1: </b> {{ selectedParameterOptions.admin1 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin2)"
        class="metadata-row"
      >
        <b>Admin L2: </b> {{ selectedParameterOptions.admin2 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin3)"
        class="metadata-row"
      >
        <b>Admin L3: </b> {{ selectedParameterOptions.admin3 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin4)"
        class="metadata-row"
      >
        <b>Admin L4: </b> {{ selectedParameterOptions.admin4 }}
      </div>
      <div
        v-if="isKnownAdmin(selectedParameterOptions.admin5)"
        class="metadata-row"
      >
        <b>Admin L5: </b> {{ selectedParameterOptions.admin5 }}
      </div> -->
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
      const response = await API.get('fetch-demo-data', {
        params: {
          modelId: props.selectedModelId,
          type: 'metadata'
        }
      });
      metadata.value = JSON.parse(response.data);
    }
    fetchMetadata();
    return {
      metadata
    };
  },
  computed: {
    isSourceValidUrl(): boolean {
      return stringUtil.isValidUrl(this.metadata.source);
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
