import _ from 'lodash';
import { Ref, computed, ref, watch } from 'vue';
import { applyConstraints, createProjectionRunner } from '@/utils/projection-util';
import { ConceptNode, IndexProjection, IndexProjectionScenario } from '@/types/Index';
import { TimeseriesPoint } from '@/types/Timeseries';
import { ProjectionPointType, TemporalResolutionOption } from '@/types/Enums';

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
    const { id, color, name, result } = existingProjectionData;
    const updatedProjection: IndexProjection = {
      id,
      color,
      name,
      result: { ...result },
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

  const projectionData = ref<IndexProjection[]>([]);
  const visibleScenarioProjectionData = computed(() => {
    const visibleScenarios = scenarios.value.filter((scenario) => scenario.isVisible);
    // Note that projection id === scenario id
    return projectionData.value.filter((p) => !!visibleScenarios.find((s) => s.id === p.id));
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
    historicalData: Map<string, TimeseriesPoint[]>,
    targetPeriod: { start: number; end: number },
    dataResOption: TemporalResolutionOption,
    scenarios: IndexProjectionScenario[]
  ) => {
    projectionData.value = scenarios.map((scenario) => {
      const result = createProjectionRunner(
        conceptTree,
        Object.fromEntries(historicalData),
        targetPeriod,
        dataResOption
      )
        .setConstraints(scenario.constraints)
        .runProjection()
        .getResults();

      return {
        // Set projection id equal to the scenario id
        id: scenario.id,
        color: scenario.color,
        name: scenario.name,
        result,
      };
    });
  };
  return {
    visibleScenarioProjectionData,
    projectionForScenarioBeingEdited,
    runScenarioProjections,
  };
}
