import _ from 'lodash';
import { Ref, computed, ref, watch } from 'vue';
import { applyConstraints, createProjectionRunner } from '@/utils/projection-util';
import {
  ConceptNode,
  IndexProjection,
  IndexProjectionNodeDataWarning,
  IndexProjectionScenario,
} from '@/types/Index';
import { TimeseriesPoint } from '@/types/Timeseries';
import { ProjectionPointType, TemporalResolutionOption } from '@/types/Enums';
import { checkProjectionWarnings } from '@/utils/index-projection-util';

export default function useScenarioProjections(
  scenarios: Ref<IndexProjectionScenario[]>,
  scenarioBeingEdited: Ref<IndexProjectionScenario | null>
) {
  const projectionForScenarioBeingEdited = ref<IndexProjection | null>(null);
  const constraintsForScenarioBeingEdited = computed(() =>
    !scenarioBeingEdited.value ? null : scenarioBeingEdited.value.constraints
  );

  // Watch for change in constraints and update the projection data for the scenario being edited
  watch(constraintsForScenarioBeingEdited, () => {
    // Create a copy of existing projection data for this scenario
    const existingProjectionData = projectionData.value.find(
      (p) => p.id === scenarioBeingEdited.value?.id
    );
    if (
      !constraintsForScenarioBeingEdited.value ||
      !scenarioBeingEdited.value ||
      existingProjectionData === undefined
    ) {
      projectionForScenarioBeingEdited.value = null;
      return;
    }
    const { id, color, name, result, runInfo } = existingProjectionData;
    const updatedProjection: IndexProjection = {
      id,
      color,
      name,
      result: { ...result },
      runInfo: { ...runInfo },
    };
    // Apply constraints
    // TODO: instead of just applying constraints to the projection data, re-run projection for the scenario
    // to show projected result as clamps are being edited
    for (const [nodeId, constraints] of Object.entries(constraintsForScenarioBeingEdited.value)) {
      // remove existing constraints before applying
      const data = result[nodeId].filter(
        (d) => d.projectionType !== ProjectionPointType.Constraint
      );
      updatedProjection.result[nodeId] = applyConstraints(data, constraints);
    }
    projectionForScenarioBeingEdited.value = updatedProjection;
  });

  const visibleScenarios = computed(() => {
    return scenarios.value.filter((scenario) => scenario.isVisible);
  });

  const projectionData = ref<IndexProjection[]>([]);
  const visibleScenarioProjectionData = computed(() => {
    // Note that projection id === scenario id
    return projectionData.value.filter((p) => !!visibleScenarios.value.find((s) => s.id === p.id));
  });

  const dataWarnings = ref<{ [nodeId: string]: IndexProjectionNodeDataWarning[] }>({});
  const visibleScenarioDataWarnings = computed<{
    [nodeId: string]: IndexProjectionNodeDataWarning[];
  }>(() => {
    const filteredWarnings = _.flatten(Object.values(dataWarnings.value)).filter(
      (w) => !!visibleScenarios.value.find((s) => s.id === w.projectionId)
    );
    return _.groupBy(filteredWarnings, 'nodeId');
  });

  /**
   * Run projections for the tree with historical data with given scenarios
   * @param conceptTree
   * @param historicalData
   * @param targetPeriod
   * @param dataResOption
   * @param scenarios
   */
  const runScenarioProjections = (
    conceptTree: ConceptNode,
    historicalData: { [nodeId: string]: TimeseriesPoint[] },
    targetPeriod: { start: number; end: number },
    dataResOption: TemporalResolutionOption,
    scenarios: IndexProjectionScenario[]
  ) => {
    projectionData.value = scenarios.map((scenario) => {
      const runner = createProjectionRunner(
        conceptTree,
        historicalData,
        targetPeriod,
        dataResOption
      )
        .setConstraints(scenario.constraints)
        .runProjection();
      const result = runner.getResults();
      const runInfo = runner.getRunInfo();

      return {
        // Set projection id equal to the scenario id
        id: scenario.id,
        color: scenario.color,
        name: scenario.name,
        result,
        runInfo,
      };
    });
    dataWarnings.value = checkProjectionWarnings(
      projectionData.value,
      Object.fromEntries(projectionData.value.map((p) => [p.id, historicalData])),
      targetPeriod
    );
  };
  return {
    visibleScenarioProjectionData,
    projectionForScenarioBeingEdited,
    visibleScenarioDataWarnings,
    runScenarioProjections,
  };
}
