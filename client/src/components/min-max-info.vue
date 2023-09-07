<script setup lang="ts">
import VMinMaxTooltip from '@/components/min-max-tooltip.vue';
import { Extrema } from '@/types/Outputdata';
import InvertedDatasetLabel from '@/components/widgets/inverted-dataset-label.vue';
import { computed, onMounted, ref } from 'vue';
import { getMonthFromTimestamp, getYearFromTimestamp, MONTHS_FULL } from '@/utils/date-util';
import * as d3 from 'd3';
import { AttachedDataset } from '@/types';
import { getOutputExtrema } from '@/services/outputdata-service';
import { convertDataConfigToOutputSpec } from '@/utils/index-tree-util';

const props = withDefaults(
  defineProps<{
    message?: string | null;
    extrema?: Extrema | null;
    isInverted: boolean;
    dataset?: AttachedDataset | null;
  }>(),
  {
    message: null,
    extrema: null,
    isInverted: false,
    dataset: null,
  }
);

const localExtrema = ref<Extrema | null>(null);

onMounted(async () => {
  if (!props.extrema) {
    localExtrema.value = await getOutputExtrema(
      convertDataConfigToOutputSpec(props.dataset.config)
    );
  } else {
    localExtrema.value = props.extrema;
  }
});

const countSummary = (data) => {
  let counts = [];
  data.forEach((item) => {
    const index = counts.findIndex((r) => r.region_id === item.region_id);
    if (index < 0) {
      counts = [...counts, { region_id: item.region_id, count: 1 }];
    } else {
      counts[index].count += 1;
    }
  });
  return [
    ...counts.sort((a, b) => {
      if (a.count < b.count) {
        return -1;
      } else if (a.count > b.count) {
        return 1;
      }
      return 0;
    }),
  ];
};

const summaryMessage = (values) => {
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
  if (localExtrema.value !== null) {
    return summaryMessage(localExtrema.value.max);
  }
  return '';
});

const minSummary = computed<string>(() => {
  if (localExtrema.value !== null) {
    return summaryMessage(localExtrema.value.min);
  }
  return '';
});

const maxValue = computed<string>(() => {
  if (localExtrema.value !== null && localExtrema.value.max.length > 0) {
    return `${d3.format(',.2f')(localExtrema.value.max[0].value)}`;
  }
  return '';
});

const minValue = computed<number>(() => {
  if (localExtrema.value !== null && localExtrema.value.min.length > 0) {
    return `${d3.format(',.2f')(localExtrema.value.min[0].value)}`;
  }
  return '';
});
</script>

<template>
  <div class="container un-font-small subdued">
    <div>{{ message }}</div>
    <VMinMaxTooltip>
      <div class="icon">
        <i class="fa fa-info" />
      </div>
      <template #popper>
        <div class="max-min-info un-font-small">
          <section v-if="!isInverted" class="un-font-small">
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
            <p class="inverted-notice">
              This dataset is <InvertedDatasetLabel :is-small="false" />
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
