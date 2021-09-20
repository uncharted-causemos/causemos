import {
  CAGModelSummary,
  ConceptProjectionConstraints,
  NodeParameter,
  ProjectionConstraint,
  Scenario
} from '@/types/CAG';
import _ from 'lodash';
import { computed, Ref, ref } from 'vue';
import { useStore } from 'vuex';

const DRAFT_SCENARIO_ID = 'draft';
const DEFAULT_ENGINE = 'dyse';

export default function useDraftScenario(
  selectedNode: Ref<NodeParameter | null>,
  scenarios: Ref<Scenario[]>,
  constraints: Ref<ProjectionConstraint[]>,
  currentEngine: Ref<string | null>,
  modelSummary: Ref<CAGModelSummary | null>,
  currentCAG: Ref<string>
) {
  const store = useStore();
  const draftScenario = computed<Scenario | null>(
    () => store.getters['model/draftScenario']
  );

  const selectedScenarioId = computed<string | null>(() => {
    const scenarioId = store.getters['model/selectedScenarioId'];
    if (scenarios.value.filter(d => d.id === scenarioId).length === 0) {
      const baselineScenario = scenarios.value.find(d => d.is_baseline);
      return baselineScenario?.id ?? null;
    }
    return scenarioId;
  });

  const setSelectedScenarioId =
    (newId: string) => store.dispatch('model/setSelectedScenarioId', newId);

  const updateDraftScenarioConstraints = (
    newConstraints: ConceptProjectionConstraints
  ) => {
    return store.dispatch(
      'model/updateDraftScenarioConstraints',
      newConstraints
    );
  };
  const setDraftScenario = (scenario: Scenario | null) =>
    store.dispatch('model/setDraftScenario', scenario);
  const previousScenarioId = ref<string | null>(null);
  // TODO: add "revert draft scenario" function that uses previousScenarioId

  const saveDraft = async () => {
    const concept = selectedNode.value?.concept;
    const values = constraints.value;
    if (concept === undefined) {
      console.error(
        "Selected node's concept is undefined.",
        selectedNode.value
      );
      return;
    }
    // 1. If no draft scenario exists, create one
    const _modelSummary = modelSummary.value;
    if (_.isNil(draftScenario.value) && _modelSummary !== null) {
      const selectedScenario = scenarios.value.find(
        s => s.id === selectedScenarioId.value
      );
      const draft: Scenario = {
        id: DRAFT_SCENARIO_ID,
        name: 'Draft',
        model_id: currentCAG.value,
        description: '',
        is_valid: true,
        is_baseline: false,
        parameter: {
          constraints: _.cloneDeep(
            selectedScenario?.parameter?.constraints ?? []
          ),
          num_steps: _modelSummary.parameter?.num_steps ?? 1,
          indicator_time_series_range:
            _modelSummary.parameter.indicator_time_series_range,
          projection_start: _modelSummary.parameter.projection_start
        },
        engine: currentEngine.value ?? DEFAULT_ENGINE,
        modified_at: Date.now() // TODO: is this correct?
      };
      await setDraftScenario(draft);
    }
    if (draftScenario.value === null) {
      console.error(
        'Draft scenario is null after it should have been initialized.'
      );
      return;
    }

    // Switch to draft
    if (selectedScenarioId.value !== DRAFT_SCENARIO_ID) {
      previousScenarioId.value = selectedScenarioId.value;
    }
    await setSelectedScenarioId(DRAFT_SCENARIO_ID);

    // 2. Update
    await updateDraftScenarioConstraints({ concept, values });

    // Cycle the scenarios to force reactivity to trigger
    scenarios.value = [
      ...scenarios.value.filter(s => s.id !== DRAFT_SCENARIO_ID),
      draftScenario.value
    ];
  };

  return {
    draftScenario,
    saveDraft
  };
}
