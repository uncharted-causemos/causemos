import { Ref, computed, ref } from 'vue';
import { IndexProjectionScenario, IndexProjectionSettings } from '@/types/Index';
import { createNewScenario, getAvailableTimeseriesColor } from '@/utils/index-projection-util';
import _ from 'lodash';

export default function useScenarios(
  indexProjectionSettings: Ref<IndexProjectionSettings>,
  updateIndexProjectionSettings: (settings: Partial<IndexProjectionSettings>) => void
) {
  const scenarios = computed(() => indexProjectionSettings.value.scenarios);
  const scenarioBeingEdited = ref<IndexProjectionScenario | null>(null);
  const updateScenarios = (scenarios: IndexProjectionScenario[]) => {
    updateIndexProjectionSettings({ scenarios });
  };
  const getAvailableScenarioColor = () => {
    const usedColors = scenarios.value.map((scenario) => scenario.color);
    return getAvailableTimeseriesColor(usedColors);
  };

  const createScenario = () => {
    const color = getAvailableScenarioColor();
    if (!color) return;
    updateScenarios([...scenarios.value, createNewScenario(undefined, '', color)]);
  };

  const duplicateScenario = (scenarioId: string) => {
    const target = scenarios.value.find((v) => v.id === scenarioId);
    const color = getAvailableScenarioColor();
    if (!target || !color) return;
    updateScenarios([
      ...scenarios.value,
      createNewScenario(target.name, target.description, color, _.cloneDeep(target.constraints)),
    ]);
  };

  const toggleScenarioVisibility = (scenarioId: string) => {
    const updatedScenarios = scenarios.value.map((scenario) =>
      scenario.id === scenarioId ? { ...scenario, isVisible: !scenario.isVisible } : scenario
    );
    updateScenarios(updatedScenarios);
  };

  const deleteScenario = (scenarioId: string) => {
    updateScenarios(scenarios.value.filter((item) => item.id !== scenarioId));
  };

  const enableEditingScenario = (scenarioId: string) => {
    const target = scenarios.value.find((v) => v.id === scenarioId);
    if (!target) return;
    scenarioBeingEdited.value = _.cloneDeep(target);
  };

  const cancelEditingScenario = () => {
    scenarioBeingEdited.value = null;
  };

  const finishEditingScenario = () => {
    const updatedScenarios = scenarios.value.map((scenario) =>
      scenario.id === scenarioBeingEdited.value?.id ? scenarioBeingEdited.value : scenario
    );
    updateScenarios(updatedScenarios);
    scenarioBeingEdited.value = null;
  };

  const updateScenarioConstraints = (
    nodeId: string,
    constraint: { timestamp: number; value: number }
  ) => {
    // Only allow updating scenario when editing scenario is enabled
    if (!scenarioBeingEdited.value || !nodeId) return;
    const constraints = scenarioBeingEdited.value.constraints[nodeId] || [];

    // If exact same constraint already exists, remove. Otherwise replace existing at same timestamp or add new.
    const existingConstraint = constraints.find((c) => _.isEqual(c, constraint));
    const newConstraints = constraints.filter((c) => c.timestamp !== constraint.timestamp);
    if (!existingConstraint) {
      newConstraints.push(constraint);
    }
    scenarioBeingEdited.value.constraints = {
      ...scenarioBeingEdited.value.constraints,
      [nodeId]: newConstraints,
    };
  };

  return {
    scenarios,
    scenarioBeingEdited,
    createScenario,
    duplicateScenario,
    toggleScenarioVisibility,
    deleteScenario,
    enableEditingScenario,
    cancelEditingScenario,
    finishEditingScenario,
    updateScenarioConstraints,
  };
}
