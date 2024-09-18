<template>
  <div class="index-results-bar-chart-column-container flex-col">
    <header class="flex-col">
      <label class="toggle-key-datasets">
        <Checkbox
          binary
          :model-value="isShowingKeyDatasets"
          @update:model-value="emit('toggle-is-showing-key-datasets')"
        />
        Show explanations
      </label>
      <div class="table-header">
        <div class="index-result-table-output-value-column flex">
          <p class="index-result-table-dataset-region-column">Region</p>
          <p v-if="!isShowingKeyDatasets">{{ props.selectedNodeName }}</p>
        </div>
        <div
          v-if="isShowingKeyDatasets"
          class="key-datasets-labels index-result-table-key-datasets-column"
        >
          <p
            class="index-result-table-dataset-name-column"
            v-tooltip="`Sorted by the dataset's weight times this country's value.`"
          >
            Key datasets
          </p>
          <p
            class="index-result-table-dataset-weight-column"
            v-tooltip="`How much this dataset impacts ${props.selectedNodeName}.`"
          >
            Dataset weight
          </p>
          <p
            class="index-result-table-dataset-value-column"
            v-tooltip="`The country's value in the dataset, scaled to the range 0 to 1.`"
          >
            Value
          </p>
        </div>
      </div>
    </header>
    <div class="flex-col results-rows">
      <IndexResultsBarChartRow
        v-for="(data, index) of indexResultsData"
        :key="index"
        :rank="index + 1"
        :row-data="data"
        :color="colorConfig.scaleFn(data.value || 0)"
        :is-expanded="isShowingKeyDatasets"
      />
    </div>
    <div v-if="removedRegions.length > 0" class="removed-countries subdued">
      <p>
        {{ removedRegions.length }}
        {{ removedRegions.length === 1 ? 'region' : 'regions' }} are hidden because they are not
        covered by one or more datasets.
      </p>
      <Button class="review-hidden-button" outlined severity="secondary" @click="showReview = true">
        Review hidden {{ removedRegions.length === 1 ? 'region' : 'regions' }}
      </Button>
    </div>
    <modal-removed-country-review
      class="country-review"
      v-if="showReview"
      :removed-regions="removedRegions"
      @close="showReview = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import IndexResultsBarChartRow from '@/components/index-results/index-results-bar-chart-row.vue';
import { IndexResultsData, IndexResultsSettings } from '@/types/Index';
import { getIndexResultsColorConfig } from '@/utils/index-results-util';
import ModalRemovedCountryReview from '@/components/modals/modal-removed-country-review.vue';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';

const props = defineProps<{
  isShowingKeyDatasets: boolean;
  indexResultsData: IndexResultsData[];
  indexResultsSettings: IndexResultsSettings;
  selectedNodeName: string;
  removedRegions: { regionId: string; removedFrom: string[] }[];
}>();

const showReview = ref<boolean>(false);

const emit = defineEmits<{
  (e: 'toggle-is-showing-key-datasets'): void;
}>();

const colorConfig = computed(() =>
  getIndexResultsColorConfig(props.indexResultsData, props.indexResultsSettings)
);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-results';
.index-results-bar-chart-column-container {
  gap: 10px;
}

.toggle-key-datasets {
  display: flex;
  align-items: center;
  gap: 10px;
}

header {
  gap: 5px;
}

.results-rows {
  overflow-y: auto;
  flex: 1;
  min-height: 0;

  & > * {
    padding-block: 10px;
  }

  & > *:not(:first-child) {
    border-top: 1px solid var(--p-content-border-color);
  }
}
.table-header {
  display: flex;
  align-items: flex-end;
  gap: $index-result-table-column-gap;
  border-bottom: 1px solid $un-color-black-10;
  color: var(--p-text-muted-color);
  background: var(--p-surface-50);
  padding: 5px 0;
  scrollbar-gutter: stable;
  overflow: hidden;
  .key-datasets-labels {
    display: flex;
    gap: $index-result-table-key-datasets-column-gap;
    align-items: flex-end;
  }
}

.removed-countries {
  .review-hidden-button {
    margin-top: 5px;
  }
}
</style>
