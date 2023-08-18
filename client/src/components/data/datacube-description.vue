<template>
  <div class="datacube-description-container">
    <div class="datacube-description-column tour-datacube-desc">
      <template v-if="isModel(metadata) && metadata.parameters">
        <h5>Input Descriptions</h5>
        <div v-for="param in inputParameters" :key="param.id">
          <b>{{ param.display_name }} </b>
          <span v-if="param.unit" v-tooltip="param.unit_description"> ({{ param.unit }})</span>
          <span v-if="param.description"
            >: <multiline-description :text="param.description"
          /></span>
          <p />
        </div>
      </template>
      <template v-if="metadata && metadata.outputs">
        <h5>Output Descriptions</h5>
        <div v-for="output in metadata.outputs" :key="output.name">
          <b>{{ output.display_name }} </b>
          <span v-if="output.unit" v-tooltip="output.unit_description"> ({{ output.unit }})</span>
          <span v-if="output.description"
            >: <multiline-description :text="output.description" />
          </span>
        </div>
      </template>
      <template v-if="metadata && displayedQualifiers.length > 0">
        <h5>Qualifier Descriptions</h5>
        <div v-for="qualifier in displayedQualifiers" :key="qualifier.name">
          <b>{{ qualifier.display_name }} </b>
          <span v-if="qualifier.unit" v-tooltip="qualifier.unit_description">
            ({{ qualifier.unit }})</span
          >
          <span v-if="qualifier.description"
            >: <multiline-description :text="qualifier.description" />
          </span>
        </div>
      </template>
    </div>
    <div class="datacube-description-column" v-if="metadata && metadata.name">
      <h5>Datacube Details</h5>
      <div v-if="metadata.geography.country" class="metadata-row">
        <b>Country: </b> {{ metadata.geography.country.join(', ') }}
      </div>
      <div class="metadata-row">
        <b>Dataset/Model: </b> {{ metadata.name }}
        <div v-if="metadata.description !== null">
          <multiline-description :text="metadata.description" />
        </div>
      </div>
      <div v-if="metadata.maintainer" class="metadata-row">
        <b>Registered By: </b> {{ metadata.maintainer.name }} ({{ metadata.maintainer.email }})
      </div>
      <div class="metadata-row" v-if="metadata.maintainer.organization">
        <strong>Source: </strong>
        {{ metadata.maintainer.organization }}
        <a
          v-if="isSourceValidUrl"
          :href="metadata.maintainer.website"
          target="_blank"
          rel="noopener noreferrer"
        >
          ({{ metadata.maintainer.website }})
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import stringUtil from '@/utils/string-util';
import { FeatureQualifier, Indicator, Model } from '@/types/Datacube';
import { isModel } from '@/utils/datacube-util';
import MultilineDescription from '@/components/widgets/multiline-description.vue';
import { isBreakdownQualifier } from '@/utils/qualifier-util';

export default defineComponent({
  name: 'DatacubeDescription',
  setup() {
    return { isModel };
  },
  components: {
    MultilineDescription,
  },
  props: {
    metadata: {
      type: Object as PropType<Model | Indicator | null>,
      default: null,
    },
  },
  computed: {
    isSourceValidUrl(): boolean {
      return this.metadata ? stringUtil.isValidUrl(this.metadata.maintainer.website) : false;
    },
    inputParameters(): Array<any> {
      return this.metadata && isModel(this.metadata)
        ? this.metadata.parameters.filter((p: any) => !p.is_drilldown)
        : [];
    },
    displayedQualifiers(): Array<any> {
      return (
        this.metadata?.qualifier_outputs?.filter((q: FeatureQualifier) =>
          isBreakdownQualifier(q)
        ) ?? []
      );
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-description-container {
  flex-wrap: initial;
  width: 100%;
  display: flex;
  flex-direction: row;
  overflow: auto;
}

.datacube-description-column {
  flex: 1;
  flex-basis: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &:not(:first-child) {
    margin-left: 5px;
  }

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
