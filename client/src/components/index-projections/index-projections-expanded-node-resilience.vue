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
import {
  ProjectionTimeseries,
  TimeseriesPoint,
  TimeseriesPointProjected,
} from '@/types/Timeseries';
import { ForecastMethod } from '@/utils/forecast';
import { createProjectionRunner, getTimestampCovertFunctions } from '@/utils/projection-util';

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

const getNextTimestamp = (timestamp: number, steps: number, temporalResOption: TempResOption) => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(temporalResOption);
  return toTimestamp(fromTimestamp(timestamp) + steps);
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

const calculateGreatestAbsoluteHistoricalChange = (
  points: TimeseriesPoint[],
  projectedPoints: TimeseriesPointProjected[],
  temporalResOption: TempResOption
) => {
  const { fromTimestamp } = getTimestampCovertFunctions(temporalResOption);
  let greatestAbsoluteChange = 0;
  // Detect time step size (number of months or years between two historical points depending on the temporalResOption).
  let minStride = Infinity;
  const firstHistoricalDate = points[0].timestamp;
  const lastHistoricalDate = points[points.length - 1].timestamp;
  for (let index = 0; index < points.length - 1; index++) {
    const pointA = points[index];
    const pointB = points[index + 1];
    minStride = Math.min(
      minStride,
      fromTimestamp(pointB.timestamp) - fromTimestamp(pointA.timestamp)
    );
  }
  // projectedPoints.findIndex(p => p.timestamp === firstHistoricalDate || )
  const projectedPointsWithinHistoricalRange = projectedPoints.filter(
    (p) => p.timestamp >= firstHistoricalDate && p.timestamp <= lastHistoricalDate
  );
  console.log(projectedPointsWithinHistoricalRange);
  for (
    let index = 0;
    index < projectedPointsWithinHistoricalRange.length - minStride;
    index += minStride
  ) {
    const pointA = projectedPointsWithinHistoricalRange[index];
    const pointB = projectedPointsWithinHistoricalRange[index + minStride];
    const change = Math.abs(pointB.value - pointA.value);
    console.log(pointA, pointB);
    console.log(change);
    greatestAbsoluteChange = Math.max(change, greatestAbsoluteChange);
  }
  const lastPoint =
    projectedPointsWithinHistoricalRange[projectedPointsWithinHistoricalRange.length - 1];
  return { minStride, greatestAbsoluteChange, lastPoint };
};

const wrapByNodeId = (data: TimeseriesPoint[] | ProjectionConstraint[]) => {
  return { [props.nodeData.id]: data };
};

const chartData = computed(() => {
  const renderItems = props.projectionTimeseries.map((item) => {
    const historicalData = getHistoricalData(item.projectionId);
    const lastHistoricalPoint = historicalData[historicalData.length - 1];
    const constraintsBeforeLastHistoricalPoint = getConstraints(item.projectionId).filter(
      (c) => c.timestamp <= lastHistoricalPoint.timestamp
    );
    // const clampedHistoricalData = applyConstraints(historicalData, constraintsBeforeLastHistoricalPoint);
    // const lastPoint = clampedHistoricalData[clampedHistoricalData.length - 1];
    // const { minStride, greatestAbsoluteChange } = calculateGreatestAbsoluteHistoricalChange(
    //   clampedHistoricalData,
    //   props.projectionTemporalResolutionOption
    // );
    const { minStride, greatestAbsoluteChange, lastPoint } =
      calculateGreatestAbsoluteHistoricalChange(
        historicalData,
        item.points,
        props.projectionTemporalResolutionOption
      );
    console.log(minStride, greatestAbsoluteChange);

    const topConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      {
        timestamp: getNextTimestamp(
          lastPoint.timestamp,
          minStride,
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
          minStride,
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
          minStride,
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
