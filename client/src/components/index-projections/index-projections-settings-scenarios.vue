<template>
  <div class="index-projection-settings-scenarios-container">
    <p>Scenarios</p>
    <p class="un-font-small subdued">
      Place constraints on one or more concepts to see how projections change under those
      conditions.
    </p>
    <ul class="scenario-list">
      <li class="scenario-item" v-for="scenario in scenarios" :key="scenario.id">
        <div class="flex action-group">
          <div class="color-box" :style="{ 'background-color': scenario.color }"></div>
          <div class="flex-grow scenario-name">{{ scenario.name }}</div>
          <Button
            text
            :icon="scenario.isVisible ? 'fa fa-eye' : 'fa fa-eye-slash'"
            severity="secondary"
            @click="(e) => handleScenarioVisibleClick(e, scenario.id)"
          />
          <OptionsButton
            v-if="!scenario.isDefault"
            :dropdown-below="true"
            :wider-dropdown-options="true"
            @click.stop=""
          >
            <template #content>
              <div
                v-for="item in scenarioOptionsButtonMenu"
                class="dropdown-option"
                :class="{
                  disabled:
                    item.type === ScenarioOptionButtonMenu.Duplicate &&
                    maxScenarios === scenarios.length,
                }"
                :key="item.type"
                @click="handleScenarioOptionButtonClick(scenario.id, item.type)"
              >
                <i class="fa fa-fw" :class="item.icon" />
                {{ item.text }}
              </div>
            </template>
          </OptionsButton>
          <div v-else class="options-button-spacer" />
        </div>
        <div class="metadata">
          <p class="un-font-small subdued description" v-if="scenario.description.length > 0">
            {{ scenario.description }}
          </p>
          <div v-if="scenarioHasConstraints(scenario)" class="node-constraint-list">
            <div class="constraint-title">
              <ConstraintIcon />
              <p class="un-font-small">&nbsp;Constraints</p>
            </div>
            <p class="un-font-small subdued">{{ constrainedNodeListString(scenario) }}</p>
          </div>
        </div>
      </li>
    </ul>
    <Button
      icon="fa fa-plus"
      label="Create new scenario"
      severity="secondary"
      class="w-100"
      :disabled="maxScenarios === scenarios.length"
      @click="emit('create')"
    />
  </div>
</template>
<script setup lang="ts">
import OptionsButton from '@/components/widgets/options-button.vue';
import { IndexProjectionScenario } from '@/types/Index';
import useIndexTree from '@/composables/useIndexTree';
import useIndexWorkBench from '@/composables/useIndexWorkBench';
import ConstraintIcon from '../widgets/constraint-icon.vue';
import Button from 'primevue/button';

const indexTree = useIndexTree();
const indexWorkBench = useIndexWorkBench();
enum ScenarioOptionButtonMenu {
  Edit = 'Edit',
  Duplicate = 'Duplicate',
  Delete = 'Delete',
}

const MENU_OPTION_EDIT = {
  type: ScenarioOptionButtonMenu.Edit,
  text: 'Edit',
  icon: 'fa-pencil',
};

const MENU_OPTION_DUPLICATE = {
  type: ScenarioOptionButtonMenu.Duplicate,
  text: 'Duplicate',
  icon: 'fa-copy',
};

const MENU_OPTION_DELETE = {
  type: ScenarioOptionButtonMenu.Delete,
  text: 'Delete',
  icon: 'fa-trash',
};

const scenarioOptionsButtonMenu = [MENU_OPTION_EDIT, MENU_OPTION_DUPLICATE, MENU_OPTION_DELETE];

defineProps<{
  scenarios: IndexProjectionScenario[];
  maxScenarios: number;
}>();

const constrainedNodeListString = (scenario: IndexProjectionScenario) => {
  const nodeList = constrainedNodeNames(Object.keys(scenario.constraints));
  return nodeList.toString().replaceAll(',', ', ');
};
const scenarioHasConstraints = (scenario: IndexProjectionScenario) => {
  if (Object.keys(scenario.constraints).length > 0) {
    return true;
  }
  return false;
};
const constrainedNodeNames = (nodeIds: string[]) => {
  const names: string[] = [];
  nodeIds.forEach((nodeId: string) => {
    let results = indexTree.findNode(nodeId);
    if (!results) {
      results = indexWorkBench.findNode(nodeId);
    }

    if (results && results.found) {
      names.push(results.found.name);
    }
  });
  return [...names.sort()];
};

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'duplicate', scenarioId: string): void;
  (e: 'edit', scenarioId: string): void;
  (e: 'delete', scenarioId: string): void;
  (e: 'toggle-visible', scenarioId: string): void;
}>();

const handleScenarioOptionButtonClick = (
  scenarioId: string,
  optionButtonType: ScenarioOptionButtonMenu
) => {
  switch (optionButtonType) {
    case ScenarioOptionButtonMenu.Duplicate:
      return emit('duplicate', scenarioId);
    case ScenarioOptionButtonMenu.Edit:
      return emit('edit', scenarioId);
    case ScenarioOptionButtonMenu.Delete:
      return emit('delete', scenarioId);
  }
};
const handleScenarioVisibleClick = (e: Event, scenarioId: string) => {
  // Prevent default behaviour that button is focused on click
  e.preventDefault();
  emit('toggle-visible', scenarioId);
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
.index-projection-settings-scenarios-container {
  --scenario-color-width: 10px;

  .scenario-list {
    list-style: none;
    padding-left: 0;
    margin-top: 10px;
  }
  .scenario-item {
    margin-bottom: 10px;
    border: 1px solid var(--p-surface-200);
    border-radius: 3px;

    .scenario-name {
      padding: 5px 0;
    }
  }
  .scenario-item .action-group {
    align-items: center;
    padding: 2px;
    padding-left: 10px;
    & > *:not(.scenario-name) {
      flex-shrink: 0;
    }
  }
  .scenario-item .metadata:has(*) {
    background: var(--p-surface-50);
    padding: 5px 10px;
  }
  .scenario-item .btn,
  .scenario-item .options-button-container {
    width: 26px;
    height: 26px;
  }
  .scenario-item .btn {
    padding: 2px;
  }
  .scenario-item .color-box {
    width: var(--scenario-color-width);
    height: var(--scenario-color-width);
    border-radius: 200%;
    margin-right: 10px;
  }
  .node-constraint-list {
    margin-top: 10px;
  }
  .constraint-title {
    display: flex;
    align-items: baseline;
    gap: 2px;

    & > div {
      width: auto;
    }
  }
  .options-button-spacer {
    width: 26px;
  }
}
</style>
