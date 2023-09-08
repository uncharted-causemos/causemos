<script setup lang="ts">
import VMinMaxTooltip from '@/components/min-max-tooltip.vue';
import { Extrema } from '@/types/Outputdata';
import InvertedDatasetLabel from '@/components/widgets/inverted-dataset-label.vue';
import { computed, ref } from 'vue';
import { getMonthFromTimestamp, getYearFromTimestamp, MONTHS_FULL } from '@/utils/date-util';
import * as d3 from 'd3';
import { AttachedDataset, OppositeEdgeCount } from '@/types';
import { getOutputExtrema } from '@/services/outputdata-service';
import { convertDataConfigToOutputSpec } from '@/utils/index-tree-util';

const props = withDefaults(
  defineProps<{
    message?: string | null;
    dataset: AttachedDataset | null;
    oppositeEdgeCount: OppositeEdgeCount;
  }>(),
  {
    message: null,
    dataset: null,
    oppositeEdgeCount: () => {
      return {
        count: 0,
        startNode: null,
        endNode: null,
      };
    },
  }
);

const extrema = ref<Extrema | null>(null);

const isInverted = computed(() => {
  if (props.dataset) {
    return props.dataset.isInverted;
  }
  return false;
});

const isEdgeInverted = computed(() => {
  if (props.oppositeEdgeCount) {
    return props.oppositeEdgeCount.count % 2 === 1;
  }
  return false;
});

const getExtrema = async () => {
  if (props.dataset) {
    extrema.value = await getOutputExtrema(convertDataConfigToOutputSpec(props.dataset.config));
  }
};

const countSummary = (data: any) => {
  let counts: any = [];
  data.forEach((item: any) => {
    const index = counts.findIndex((r: any) => r.region_id === item.region_id);
    if (index < 0) {
      counts = [...counts, { region_id: item.region_id, count: 1 }];
    } else {
      counts[index].count += 1;
    }
  });
  return [
    ...counts.sort((a: any, b: any) => {
      if (a.count < b.count) {
        return -1;
      } else if (a.count > b.count) {
        return 1;
      }
      return 0;
    }),
  ];
};

const summaryMessage = (values: any) => {
  if (!values || values.length === 0) {
    return 'No observations';
  } else if (values.length === 1) {
    const eValue = values[0];
    return `Observed in ${eValue.region_id} in ${
      eValue.timestamp >= 0 ? MONTHS_FULL[getMonthFromTimestamp(eValue.timestamp)] : 'unknown month'
    } ${getYearFromTimestamp(eValue.timestamp)}`;
  } else {
    const counts = countSummary(values);
    return `Observed ${counts[0].count} ${counts[0].count > 1 ? 'times' : 'time'} in ${
      counts[0].region_id
    } and ${values.length - 1} other ${values.length - 1 > 1 ? 'countries' : 'country'}`;
  }
};

const maxSummary = computed<string>(() => {
  if (extrema.value !== null) {
    return summaryMessage(extrema.value.max);
  }
  return '';
});

const minSummary = computed<string>(() => {
  if (extrema.value !== null) {
    return summaryMessage(extrema.value.min);
  }
  return '';
});

const maxValue = computed<string>(() => {
  if (extrema.value !== null && extrema.value.max.length > 0) {
    return `${d3.format(',.2f')(extrema.value.max[0].value)}`;
  }
  return '';
});

const minValue = computed<string>(() => {
  if (extrema.value !== null && extrema.value.min.length > 0) {
    return `${d3.format(',.2f')(extrema.value.min[0].value)}`;
  }
  return '';
});
</script>

<template>
  <div class="container un-font-small subdued">
    <div>{{ message }}</div>
    <VMinMaxTooltip>
      <div class="icon" @mouseover="getExtrema">
        <i class="fa fa-info" />
      </div>
      <template #popper>
        <div class="max-min-info un-font-small">
          <section v-if="!isInverted && !isEdgeInverted" class="un-font-small">
            <p>1 represents the maximum historical value:</p>
            <h2>{{ maxValue }}</h2>
            <p class="summary">{{ maxSummary }}</p>
            <p>0 represents the minimum historical value:</p>
            <h2>{{ minValue }}</h2>
            <p class="summary">{{ minSummary }}</p>
          </section>

          <section v-if="isInverted">
            <p>
              1 represents the
              <InvertedDatasetLabel :custom-message="'minimum'" :is-small="false" /> historical
              value:
            </p>
            <h2>{{ minValue }}</h2>
            <p class="summary">{{ minSummary }}</p>
            <p>
              0 represents the
              <InvertedDatasetLabel :custom-message="'maximum'" :is-small="false" /> historical
              value:
            </p>
            <h2>{{ maxValue }}</h2>
            <p class="summary">{{ maxSummary }}</p>
            <hr />
            <p class="inverted-notice">This dataset is <InvertedDatasetLabel :is-small="true" /></p>
          </section>

          <section v-if="isEdgeInverted">
            <p>1 represents the <span>minimum</span> historical value:</p>
            <h2>{{ minValue }}</h2>
            <p class="summary">{{ minSummary }}</p>
            <p>0 represents the <span>maximum</span> historical value:</p>
            <h2>{{ maxValue }}</h2>
            <p class="summary">{{ maxSummary }}</p>
            <hr />
            <p class="inverted-notice">
              There {{ oppositeEdgeCount.count > 1 ? 'are' : 'is' }}
              <span class="un-font-small"
                >{{ oppositeEdgeCount.count }} opposite polarity
                {{ oppositeEdgeCount.count > 1 ? 'edges' : 'edge' }}</span
              >
              between {{ oppositeEdgeCount.startNode }} and {{ oppositeEdgeCount.endNode }}.
            </p>
          </section>
        </div>
      </template>
    </VMinMaxTooltip>
  </div>
</template>

<style lang="scss">
@import '@/styles/uncharted-design-tokens';
.container {
  display: flex;
  gap: 5px;
  .icon {
    background-color: grey;
    border-radius: 2px;
    padding: 0 0.45rem;
    width: 1.2rem;
    font-size: 0.9rem;
    i {
      color: white;
    }
  }
}
// make changes to the extended Tooltip theme here.
.v-popper--theme-min-max-tooltip {
  .v-popper__inner {
    div.max-min-info {
      padding: 10px;
    }
    p.summary {
      @extend .un-font-small;
      @extend .subdued;
      margin-bottom: 10px;
    }
    p.inverted-notice {
      @extend .un-font-small;
      @extend .subdued;
      margin-top: 10px;
    }
    p span {
      color: $un-color-feedback-warning;
    }
    padding: 10px;
    box-shadow: 2px 2px 10px gray;
    background: white;
  }
  .v-popper__arrow-container {
    .v-popper__arrow-inner {
    }
    .v-popper__arrow-outer {
      border-color: white;
    }
  }
}
</style>
