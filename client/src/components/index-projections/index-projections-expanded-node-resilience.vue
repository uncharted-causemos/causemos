<template>
  <div class="index-projections-expanded-node-resilience-container">
    <p>Investigate resilience to sudden change</p>
    <p class="subdued un-font-small">
      Show three new scenarios to see how projections would change depending on the next observed
      value.
    </p>
    <p class="subdued un-font-small">
      Each scenario contains one constraint, selected based on the greatest annual change,
      historically.
    </p>

    <div class="chart-container" v-for="(item, index) in chartData" :key="index">
      <p>
        <i class="fa fa-fw fa-minus" :style="{ color: item.color }"></i>
        {{ item.name }}
      </p>
      <p class="change-text subdued un-font-small">
        Greatest
        {{ getFormattedTimeInterval(item.interval, projectionTemporalResolutionOption) }} change:
        {{ item.greatestChange }}
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
        :is-inverted="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import * as d3 from 'd3';

import { TemporalResolutionOption } from '@/types/Enums';
import { ConceptNode, ProjectionConstraint } from '@/types/Index';
import { ProjectionTimeseries, TimeseriesPoint } from '@/types/Timeseries';
import { ForecastMethod } from '@/utils/forecast';
import {
  createProjectionRunner,
  calculateMinTimeInterval,
  getTimestampCovertFunctions,
  applyConstraints,
  interpolateLinear,
} from '@/utils/projection-util';

import IndexProjectionsExpandedNodeTimeseries from './index-projections-expanded-node-timeseries.vue';

type TempResOption = TemporalResolutionOption.Month | TemporalResolutionOption.Year;
type ScenariosProjectionItem = {
  name: string;
  color: string;
  greatestChange: number;
  interval: number;
  timeseries: ProjectionTimeseries[];
};

// ===========
// Helper utility functions  (we may want to move these functions to one of the util files)

/**
 * Calculate the timestamp that is `interval` units of time ahead of the given `timestamp`
 * based on the specified temporal resolution.
 * @param timestamp - Starting timestamp.
 * @param interval - Number of units to advance by.
 * @param temporalResolution - Temporal resolution option: 'Month' or 'Year'.
 * @returns Timestamp that is `interval` units ahead of the input `timestamp`.
 */
const calculateNextTimestamp = (
  timestamp: number,
  interval: number,
  temporalResolution: TemporalResolutionOption.Month | TemporalResolutionOption.Year
) => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(temporalResolution);
  return toTimestamp(fromTimestamp(timestamp) + interval);
};

/**
 * Generates a human-readable label for a time interval based on the number of steps and temporal resolution.
 * @param steps - Number of steps in the interval.
 * @param temporalResolution - Temporal resolution option: 'Month' or 'Year'.
 * @returns String representation of the time interval, e.g., 'monthly', 'quarterly', 'annual', 'biennial', or 'X months/years'.
 */
const getFormattedTimeInterval = (steps: number, temporalResolution: TemporalResolutionOption) => {
  if (temporalResolution === TemporalResolutionOption.Month) {
    if (steps === 1) return 'monthly';
    if (steps === 3) return 'quarterly';
    if (steps === 12) return 'annual';
    return `${steps} months`;
  } else if (temporalResolution === TemporalResolutionOption.Year) {
    if (steps === 1) return 'annual';
    if (steps === 2) return 'biennial';
    return `${steps} years`;
  }
  return '';
};

/**
 * Calculates the greatest absolute change in value within specified intervals of historical data, subject to constraints.
 * @param points - Array of historical data points with timestamps and values.
 * @param constraints - Array of projection constraints.
 * @param temporalResolution - Temporal resolution option: 'Month' or 'Year'.
 * @returns Object containing information about the greatest absolute change, time interval, and the last point.
 */
const calculateGreatestAbsoluteHistoricalChange = (
  points: TimeseriesPoint[],
  constraints: ProjectionConstraint[],
  temporalResolution: TemporalResolutionOption.Month | TemporalResolutionOption.Year
) => {
  if (points.length < 2)
    return {
      interval: 1,
      greatestAbsoluteChange: 0,
      lastPoint: points[points.length - 1],
    };

  // Get the number of time interval between two closest historical points in temporalResOption resolution
  const interval = calculateMinTimeInterval(points, temporalResolution);
  let greatestAbsoluteChange = 0;

  const { fromTimestamp } = getTimestampCovertFunctions(temporalResolution);
  const firstHistoricalPointDate = points[0].timestamp;
  const lastHistoricalPointDate = points[points.length - 1].timestamp;
  // Preserve constraints within the historical data points range.
  // For the simplicity, ignore the constraints set before the first historical point.
  const historicalPointsWithConstraints = applyConstraints(points, constraints).filter(
    (p) => p.timestamp >= firstHistoricalPointDate && p.timestamp <= lastHistoricalPointDate
  );
  // Run interpolation to fill the gaps in the data.
  const interpolatedPoints = interpolateLinear(
    historicalPointsWithConstraints.map((p) => ({ x: fromTimestamp(p.timestamp), y: p.value }))
  );
  // Find the greatest change in value in an interval
  for (let index = 0; index < interpolatedPoints.length - interval; index += interval) {
    const pointA = interpolatedPoints[index].dataPoint;
    const pointB = interpolatedPoints[index + interval].dataPoint;
    const change = Math.abs(pointB.y - pointA.y);
    greatestAbsoluteChange = Math.max(change, greatestAbsoluteChange);
  }
  return {
    interval,
    greatestAbsoluteChange,
    lastPoint: historicalPointsWithConstraints[historicalPointsWithConstraints.length - 1],
  };
};
// ===========

const props = defineProps<{
  nodeData: ConceptNode;
  historicalData: { countryName: string; points: TimeseriesPoint[] }[];
  constraints: { scenarioId: string; constraints: ProjectionConstraint[] }[];
  projectionTemporalResolutionOption: TempResOption;
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projectionTimeseries: ProjectionTimeseries[];
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
 * For given projection timeseries item, generate new projection results including three different scenarios
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
    projectionItem.points,
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
      props.projectionTemporalResolutionOption
    )
      .setConstraints(wrapByNodeId(constraints))
      .projectDatasetNode(props.nodeData.id, { method: ForecastMethod.Holt })
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
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.index-projections-expanded-node-resilience-container {
  margin-top: 10px;
  margin-bottom: 10px;
  padding-top: 10px;
  border-top: 1px solid #e3e4e6;
  .change-text {
    padding-left: 20px;
  }
  .chart-container {
    margin-top: 5px;
  }
  .timeseries {
    margin-left: -20px;
    margin-right: 0px;
  }
}
</style>
