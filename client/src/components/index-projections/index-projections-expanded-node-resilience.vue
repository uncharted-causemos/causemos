<template>
  <div class="index-projections-expanded-node-resilience-container">
    <!-- {{ historicalData }} -->
    <!-- {{ constraints }}
    {{ projectionTimeseries }} -->
    <br />
    {{ constraints }}
    <div style="color: red">
      {{ chartData }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { TemporalResolutionOption } from '@/types/Enums';
import { ConceptNode, ProjectionConstraint } from '@/types/Index';
import { ProjectionTimeseries, TimeseriesPoint } from '@/types/Timeseries';
import { ForecastMethod } from '@/utils/forecast';
import { createProjectionRunner, getTimestampCovertFunctions } from '@/utils/projection-util';
import { computed } from 'vue';

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

const getNextTimestamp = (timestamp: number, temporalResOption: TempResOption) => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(temporalResOption);
  return toTimestamp(fromTimestamp(timestamp) + 1);
};

const calculateGreatestAbsoluteHistoricalChange = (
  points: TimeseriesPoint[],
  temporalResOption: TempResOption
) => {
  const { fromTimestamp } = getTimestampCovertFunctions(temporalResOption);
  let minSteps = Infinity;
  let maxAbsoluteChange = 0;
  if (points.length < 2) return 0;
  for (let index = 0; index < points.length - 1; index++) {
    const pointA = points[index];
    const pointB = points[index + 1];
    const change = Math.abs(pointB.value - pointA.value);
    const steps = fromTimestamp(pointB.timestamp) - fromTimestamp(pointA.timestamp);
    // Make sure we only update the change only if the time step is minimal (or single step).
    // For example, if distance between pointA and pointB is more than minimal (or single) time step, ignore.
    if (steps <= minSteps) {
      minSteps = steps;
      maxAbsoluteChange = Math.max(change, maxAbsoluteChange);
    }
  }
  return maxAbsoluteChange;
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
    const nextTimestamp = getNextTimestamp(
      lastHistoricalPoint.timestamp,
      props.projectionTemporalResolutionOption
    );
    const greatestAbsoluteChange = calculateGreatestAbsoluteHistoricalChange(
      historicalData,
      props.projectionTemporalResolutionOption
    );

    const topConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      { timestamp: nextTimestamp, value: lastHistoricalPoint.value + greatestAbsoluteChange },
    ];
    const midConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      { timestamp: nextTimestamp, value: lastHistoricalPoint.value },
    ];
    const bottomConstraints = [
      ...constraintsBeforeLastHistoricalPoint,
      { timestamp: nextTimestamp, value: lastHistoricalPoint.value - greatestAbsoluteChange },
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
      [props.nodeData.id].filter((item) => item.timestamp >= lastHistoricalPoint.timestamp);
    const midResult = createProjectionRunner(
      props.nodeData,
      wrapByNodeId(historicalData),
      targetPeriod.value,
      props.projectionTemporalResolutionOption
    )
      .setConstraints(wrapByNodeId(midConstraints))
      .projectDatasetNode(props.nodeData.id, { method: ForecastMethod.Holt })
      .getResults()
      [props.nodeData.id].filter((item) => item.timestamp >= lastHistoricalPoint.timestamp);
    const bottomResult = createProjectionRunner(
      props.nodeData,
      wrapByNodeId(historicalData),
      targetPeriod.value,
      props.projectionTemporalResolutionOption
    )
      .setConstraints(wrapByNodeId(bottomConstraints))
      .projectDatasetNode(props.nodeData.id, { method: ForecastMethod.Holt })
      .getResults()
      [props.nodeData.id].filter((item) => item.timestamp >= lastHistoricalPoint.timestamp);
    // Render items for this projection Id
    const projectionTimeseries: ProjectionTimeseries[] = [
      {
        projectionId: `${item.projectionId}_top`,
        color: item.color,
        name: item.name,
        points: topResult,
      },
      {
        projectionId: `${item.projectionId}_mid`,
        color: item.color,
        name: item.name,
        points: midResult,
      },
      {
        projectionId: `${item.projectionId}_bottom`,
        color: item.color,
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
}
</style>
