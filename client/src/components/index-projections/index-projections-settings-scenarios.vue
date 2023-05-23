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
          <button class="btn btn-sm">
            <i class="fa fa-eye" />
          </button>
          <button class="btn btn-sm color-box">
            <div :style="{ 'background-color': scenario.color }"></div>
          </button>
          <div class="flex-grow">{{ scenario.name }}</div>
          <OptionsButton :dropdown-below="true" :wider-dropdown-options="true" @click.stop="">
            <template #content>
              <div
                v-for="item in scenarioOptionsButtonMenu"
                class="dropdown-option"
                :key="item.type"
                @click="handleScenarioOptionButtonClick(scenario.id, item.type)"
              >
                <i class="fa fa-fw" :class="item.icon" />
                {{ item.text }}
              </div>
            </template>
          </OptionsButton>
        </div>
        <p class="un-font-small subdued">
          {{ scenario.description }}
        </p>
      </li>
    </ul>
    <button class="btn btn-sm" @click="emit('create')">
      <i class="fa fa-fw fa-plus" />Create new scenario
    </button>
  </div>
</template>
<script setup lang="ts">
import OptionsButton from '@/components/widgets/options-button.vue';
import { IndexProjectionScenario } from '@/types/Index';

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
}>();

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'duplicate', scenarioId: string): void;
  (e: 'edit', scenarioId: string): void;
  (e: 'delete', scenarioId: string): void;
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
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
.index-projection-settings-scenarios-container {
  .scenario-list {
    list-style: none;
    padding-left: 0;
  }
  .scenario-item .action-group {
    gap: 2px;
  }
  .scenario-item .btn,
  .scenario-item .options-button-container {
    width: 26px;
    height: 26px;
  }
  .scenario-item .btn {
    padding: 2px;
  }
  .scenario-item .color-box div {
    width: 100%;
    height: 100%;
  }
}
</style>
