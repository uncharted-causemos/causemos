<template>
  <div class="index-projections-expanded-node-resilience-container">
    <div v-for="(item, index) in chartData" :key="index">
      <IndexProjectionsExpandedNodeTimeseries
        class="timeseries add-horizontal-margin"
        :class="{
          'outside-norm-viewable': true,
        }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="item"
        :show-data-outside-norm="true"
        :is-weighted-sum-node="false"
        :is-inverted="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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

const getNextTimestamp = (
  timestamp: number,
  interval: number,
  temporalResOption: TempResOption
) => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(temporalResOption);
  return toTimestamp(fromTimestamp(timestamp) + interval);
};

// const calculateGreatestAbsoluteHistoricalChange = (
//   points: TimeseriesPoint[],
//   temporalResOption: TempResOption
// ) => {
//   const { fromTimestamp } = getTimestampCovertFunctions(temporalResOption);
//   let minStride = Infinity; // time step length
//   let greatestAbsoluteChange = 0;
//   if (points.length < 2) return { minStride: 1, greatestAbsoluteChange: 0 };
//   for (let index = 0; index < points.length - 1; index++) {
//     const pointA = points[index];
//     const pointB = points[index + 1];
//     const change = Math.abs(pointB.value - pointA.value);
//     const stride = fromTimestamp(pointB.timestamp) - fromTimestamp(pointA.timestamp);
//     // Make sure we only update the change only if the time step length is minimal
//     // (min step length is likely 1 for monthly or yearly data and 12 for annual data represented in month resolution assuming there are no constraints).
//     // For example, if distance between pointA and pointB is more than minimal (or single) time step length, ignore.
//     if (stride <= minStride) {
//       minStride = stride;
//       greatestAbsoluteChange = Math.max(change, greatestAbsoluteChange);
//     }
//   }
//   return { minStride, greatestAbsoluteChange };
// };

// const getTimeIntervalTerm = (steps: number, temporalResolutionOption: TempResOption) => {
//   if (temporalResolutionOption === TemporalResolutionOption.Month) {
//     if (steps === 1) return 'monthly'
//     if (steps === 3) return 'quarterly'
//     if (steps === 12) return 'annual'
//     return `${steps} months`
//   } else if (temporalResolutionOption === TemporalResolutionOption.Year) {
//     if (steps === 1) return 'annual'
//     if (steps === 2) return 'biennial'
//     return `${steps} years`
//   }
//   return '';
// }

const calculateGreatestAbsoluteHistoricalChange = (
  points: TimeseriesPoint[],
  constraints: ProjectionConstraint[],
  temporalResOption: TempResOption
) => {
  if (points.length < 2)
    return {
      interval: 1,
      greatestAbsoluteChange: 0,
      lastPoint: points[points.length - 1],
    };

  // Get the number of time interval between two closest historical points in temporalResOption resolution
  const interval = calculateMinTimeInterval(points, temporalResOption);
  let greatestAbsoluteChange = 0;

  const { fromTimestamp } = getTimestampCovertFunctions(temporalResOption);
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

const wrapByNodeId = (data: TimeseriesPoint[] | ProjectionConstraint[]) => {
  return { [props.nodeData.id]: data };
};

const chartData = computed(() => {
  const renderItems = props.projectionTimeseries.map((item) => {
    const historicalData = getHistoricalData(item.projectionId);
    if (historicalData.length === 0) return [];

    const lastHistoricalPoint = historicalData[historicalData.length - 1];
    const constraintsBeforeLastHistoricalPoint = getConstraints(item.projectionId).filter(
      (c) => c.timestamp <= lastHistoricalPoint.timestamp
    );
    const { interval, greatestAbsoluteChange, lastPoint } =
      calculateGreatestAbsoluteHistoricalChange(
        historicalData,
        item.points,
        props.projectionTemporalResolutionOption
      );
    console.log(interval, greatestAbsoluteChange);

    const topConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      {
        timestamp: getNextTimestamp(
          lastPoint.timestamp,
          interval,
          props.projectionTemporalResolutionOption
        ),
        value: lastPoint.value + greatestAbsoluteChange,
      },
    ];
    const midConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      {
        timestamp: getNextTimestamp(
          lastPoint.timestamp,
          interval,
          props.projectionTemporalResolutionOption
        ),
        value: lastPoint.value,
      },
    ];
    const bottomConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      {
        timestamp: getNextTimestamp(
          lastPoint.timestamp,
          interval,
          props.projectionTemporalResolutionOption
        ),
        value: lastPoint.value - greatestAbsoluteChange,
      },
    ];

    const topResult = createProjectionRunner(
      props.nodeData,
      wrapByNodeId(historicalData),
      targetPeriod.value,
      props.projectionTemporalResolutionOption
    )
      .setConstraints(wrapByNodeId(topConstraints))
      .projectDatasetNode(props.nodeData.id, { method: ForecastMethod.Holt })
      .getResults()
      [props.nodeData.id].filter((point) => point.timestamp >= lastHistoricalPoint.timestamp);
    const midResult = createProjectionRunner(
      props.nodeData,
      wrapByNodeId(historicalData),
      targetPeriod.value,
      props.projectionTemporalResolutionOption
    )
      .setConstraints(wrapByNodeId(midConstraints))
      .projectDatasetNode(props.nodeData.id, { method: ForecastMethod.Holt })
      .getResults()
      [props.nodeData.id].filter((point) => point.timestamp >= lastHistoricalPoint.timestamp);
    const bottomResult = createProjectionRunner(
      props.nodeData,
      wrapByNodeId(historicalData),
      targetPeriod.value,
      props.projectionTemporalResolutionOption
    )
      .setConstraints(wrapByNodeId(bottomConstraints))
      .projectDatasetNode(props.nodeData.id, { method: ForecastMethod.Holt })
      .getResults()
      [props.nodeData.id].filter((point) => point.timestamp >= lastHistoricalPoint.timestamp);
    // Render items for this projection Id
    const projectionTimeseries: ProjectionTimeseries[] = [
      {
        projectionId: `${item.projectionId}_top`,
        color: d3.color(item.color)?.copy({ opacity: 0.5 }).toString() as string,
        name: item.name,
        points: topResult,
      },
      {
        projectionId: `${item.projectionId}_mid`,
        color: d3.color(item.color)?.copy({ opacity: 0.5 }).toString() as string,
        name: item.name,
        points: midResult,
      },
      {
        projectionId: `${item.projectionId}_bottom`,
        color: d3.color(item.color)?.copy({ opacity: 0.5 }).toString() as string,
        name: item.name,
        points: bottomResult,
      },
    ];

    projectionTimeseries.push({
      projectionId: `${item.projectionId}_actual`,
      color: item.color,
      name: item.name,
      points: item.points,
    });
    return projectionTimeseries;
  });
  return renderItems;
});
</script>

<style lang="scss" scoped>
.index-projections-expanded-node-resilience-container {
  margin-right: 30px;
  margin-left: 10px;
}
</style>
