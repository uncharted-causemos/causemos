<template>
  <div class="index-projections-expanded-node-resilience-container">
    <p>What if there's a sudden change in the next year?</p>
    <p class="subdued un-font-small">
      See how projections are affected if the greatest annual change in the historical data were to
      happen again.
    </p>

    <div class="chart-container" v-for="(item, index) in chartData" :key="index">
      <p>
        <i class="fa fa-fw fa-minus" :style="{ color: item.color }"></i>
        {{ item.name }}
      </p>
      <p class="change-text subdued un-font-small">
        {{ getGreatestChangeString(item.interval, projectionTemporalResolutionOption) }}:
        {{ item.greatestChange.toFixed(2) }}
      </p>

      <IndexProjectionsExpandedNodeTimeseries
        class="timeseries"
        :class="{
          'outside-norm-viewable': true,
        }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="item.timeseries"
        :show-data-outside-norm="true"
        :is-weighted-sum-node="false"
        :is-inverted="nodeData.dataset.isInverted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import * as d3 from 'd3';

import {
  IndexWeightingBehaviour,
  ProjectionAlgorithm,
  TemporalResolutionOption,
} from '@/types/Enums';
import { ConceptNodeWithDatasetAttached, ProjectionConstraint } from '@/types/Index';
import { ProjectionTimeseries, TimeseriesPoint } from '@/types/Timeseries';
import {
  createProjectionRunner,
  calculateGreatestAbsoluteHistoricalChange,
} from '@/utils/projection-util';

import IndexProjectionsExpandedNodeTimeseries from './index-projections-expanded-node-timeseries.vue';
import { calculateNextTimestamp, getFormattedTimeInterval } from '@/utils/date-util';

type ScenariosProjectionItem = {
  name: string;
  color: string;
  greatestChange: number;
  interval: number;
  timeseries: ProjectionTimeseries[];
};

const props = defineProps<{
  nodeData: ConceptNodeWithDatasetAttached;
  historicalData: { countryName: string; points: TimeseriesPoint[] }[];
  constraints: { scenarioId: string; constraints: ProjectionConstraint[] }[];
  projectionTemporalResolutionOption:
    | TemporalResolutionOption.Month
    | TemporalResolutionOption.Year;
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projectionTimeseries: ProjectionTimeseries[];
  weightingBehaviour: IndexWeightingBehaviour;
}>();

const targetPeriod = computed(() => ({
  start: props.projectionStartTimestamp,
  end: props.projectionEndTimestamp,
}));

const getHistoricalData = (proejctionId: string) => {
  // In multiple country mode, projection id is country name. If the historical data is not found with projectionId,
  // we can assume that projectionId is scenario Id and we only have single historical data.
  const historicalData =
    props.historicalData.find((d) => d.countryName === proejctionId) || props.historicalData[0];
  return historicalData.points;
};

const getConstraints = (projectionId: string) => {
  const constraints = props.constraints.find((c) => c.scenarioId === projectionId)?.constraints;
  return constraints ?? [];
};

const wrapByNodeId = (data: TimeseriesPoint[] | ProjectionConstraint[]) => {
  return { [props.nodeData.id]: data };
};

/**
 * For given projection timeseries, generates new projection results including three different scenarios
 * Each scenario contains one constraint after last historical data point, selected based on the greatest annual change.
 * @param projectionItem projection timeseries item
 */
const runScenariosProjection = (projectionItem: ProjectionTimeseries): ScenariosProjectionItem => {
  const historicalData = getHistoricalData(projectionItem.projectionId);
  if (historicalData.length === 0)
    return {
      name: projectionItem.name,
      color: projectionItem.color,
      greatestChange: 0,
      interval: 0,
      timeseries: [],
    };

  const lastHistoricalPoint = historicalData[historicalData.length - 1];
  const constraintsBeforeLastHistoricalPoint = getConstraints(projectionItem.projectionId).filter(
    (c) => c.timestamp <= lastHistoricalPoint.timestamp
  );
  const { interval, greatestAbsoluteChange, lastPoint } = calculateGreatestAbsoluteHistoricalChange(
    historicalData,
    constraintsBeforeLastHistoricalPoint,
    props.projectionTemporalResolutionOption
  );

  const scenarios = [
    { name: 'top', change: greatestAbsoluteChange },
    { name: 'unchanged', change: 0 },
    { name: 'bottom', change: -greatestAbsoluteChange },
  ];

  const projectionResults = scenarios.map((scenario) => {
    const constraints = [
      ...constraintsBeforeLastHistoricalPoint,
      {
        timestamp: calculateNextTimestamp(
          lastPoint.timestamp,
          interval,
          props.projectionTemporalResolutionOption
        ),
        value: lastPoint.value + scenario.change,
      },
    ];
    const result = createProjectionRunner(
      props.nodeData,
      wrapByNodeId(historicalData),
      targetPeriod.value,
      props.projectionTemporalResolutionOption,
      props.weightingBehaviour
    )
      .setConstraints(wrapByNodeId(constraints))
      .projectDatasetNode(props.nodeData.id, { method: ProjectionAlgorithm.Holt })
      .getResults()
      [props.nodeData.id].filter((point) => point.timestamp >= lastHistoricalPoint.timestamp);

    return {
      projectionId: `${projectionItem.projectionId}_${scenario.name}`,
      color: d3.color(projectionItem.color)?.copy({ opacity: 0.5 }).toString() as string,
      name: projectionItem.name,
      points: result,
    };
  });
  // Add actual projection data points
  projectionResults.push({
    projectionId: `${projectionItem.projectionId}_actual`,
    color: projectionItem.color,
    name: projectionItem.name,
    points: projectionItem.points,
  });
  return {
    name: projectionItem.name,
    color: projectionItem.color,
    greatestChange: greatestAbsoluteChange,
    interval,
    timeseries: projectionResults,
  };
};

// Watch for main projection data changes and run scenarios projection for each projection.
const chartData = ref<ScenariosProjectionItem[]>([]);
watch(
  () => props.projectionTimeseries,
  () => {
    chartData.value = props.projectionTimeseries.map(runScenariosProjection);
  },
  { immediate: true }
);

const getGreatestChangeString = (steps: number, temporalResolution: TemporalResolutionOption) => {
  const formattedInterval = getFormattedTimeInterval(steps, temporalResolution);
  if (formattedInterval.includes('months') || formattedInterval.includes('years')) {
    // e.g. "Greatest change over 11 months"
    return `Greatest change over ${formattedInterval}`;
  }
  // e.g. "Greatest annual change"
  return `Greatest ${formattedInterval} change`;
};
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.index-projections-expanded-node-resilience-container {
  margin-top: 10px;
  margin-bottom: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--p-surface-200);
  .change-text {
    padding-left: 20px;
  }
  .chart-container {
    margin-top: 20px;
  }
}
</style>
