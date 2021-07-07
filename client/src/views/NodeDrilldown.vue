<template>
  <div class="node-drilldown-container">
    <main>
      <header>
        <h4>{{ nodeConceptName }}</h4>
        <!-- TODO: toggles go here -->
        <div class="toggle-container">
          (toggles go here)
        </div>

        <button
          v-tooltip="'Collapse node'"
          class="btn btn-default"
          @click="collapseNode"
        >
          <i class="fa fa-fw fa-compress" />
        </button>
      </header>
      <div class="nodes-container">
        <div class="drivers">
          <h5>Top Drivers</h5>
          <neighbor-node
            v-for="driver in drivers"
            :key="driver.edge.id"
            :node="driver.node"
            :edge="driver.edge"
            :is-driver="true"
            class="neighbor-node"
          />
        </div>
        <div class="selected-node">
          <h6>No scenarios selected.</h6>
          <div class="expanded-node">
            <div class="expanded-node-header">
              {{ nodeConceptName }}
              <div class="button-group">
                (buttons go here)
                <!-- TODO: New scenario button -->
                <!-- TODO: Set goal button -->
              </div>
            </div>
          </div>
          <p>
            <i class="fa fa-fw fa-info-circle" />To create a scenario, set some
            values by clicking on the chart. To remove a point, click on it
            again.
          </p>
        </div>
        <div class="impacts">
          <h5>Top Impacts</h5>
          <neighbor-node
            v-for="impact in impacts"
            :key="impact.edge.id"
            :node="impact.node"
            :edge="impact.edge"
            :is-driver="false"
            class="neighbor-node"
          />
        </div>
      </div>
    </main>
    <drilldown-panel
      class="drilldown-panel"
      :tabs="drilldownPanelTabs"
      :active-tab-id="'only-tab'"
    >
      <template #content>
        (Panes go here)
        <!-- TODO: Panes go here -->
        <!-- <indicator-summary
          v-if="activeDrilldownTab === PANE_ID.INDICATOR && selectedNode && isDrilldownOpen"
          :node="selectedNode"
          :model-summary="modelSummary"
          @function-selected="onFunctionSelected"
          @edit-indicator="editIndicator"
          @remove-indicator="removeIndicator"
        /> -->
      </template>
    </drilldown-panel>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from 'vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import NeighborNode from '@/components/node-drilldown/neighbor-node.vue';
import router from '@/router';
import { useStore } from 'vuex';
import { ProjectType } from '@/types/Enums';
import modelService from '@/services/model-service';
import { CAGGraph, CAGModelSummary, Scenario } from '@/types/CAG';

export default defineComponent({
  name: 'NodeDrilldown',
  components: {
    DrilldownPanel,
    NeighborNode
  },
  setup() {
    // Get CAG and selected node from route
    const store = useStore();
    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const nodeId = computed(() => store.getters['app/nodeId']);

    const modelSummary = ref<CAGModelSummary | null>(null);
    const modelComponents = ref<CAGGraph | null>(null);
    const currentEngine = computed(
      () => modelSummary.value?.parameter?.engine ?? null
    );

    watchEffect(onInvalidate => {
      // Fetch model summary and components
      if (currentCAG.value === null) return;
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      modelService.getSummary(currentCAG.value).then(_modelSummary => {
        if (isCancelled) return;
        modelSummary.value = _modelSummary;
      });
      modelService.getComponents(currentCAG.value).then(_modelComponents => {
        if (isCancelled) return;
        modelComponents.value = _modelComponents;
      });
    });

    const scenarios = ref<Scenario[]>([]);

    watchEffect(async onInvalidate => {
      // Fetch scenarios
      if (currentCAG.value === null || currentEngine.value === null) return;
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      const _scenarios = await modelService.getScenarios(
        currentCAG.value,
        currentEngine.value
      );
      if (isCancelled) return;
      scenarios.value = _scenarios;
    });

    const selectedNode = computed(() => {
      if (nodeId.value === undefined || modelComponents.value === null) {
        return null;
      }
      return (
        modelComponents.value.nodes.find(node => node.id === nodeId.value) ??
        null
      );
    });
    const nodeConceptName = computed(() => selectedNode.value?.label);


    // TODO: Filter top drivers and top impacts
    //  CLARIFICATION REQUIRED:
    //    is this taken from the sensitivity analysis?
    //    do we want a maximum number of drivers/impacts? or add a scrollbar?
    const drivers = computed(() => {
      if (modelComponents.value === null || selectedNode.value === null) {
        return [];
      }
      const selectedConcept = selectedNode.value.concept;
      const { edges, nodes } = modelComponents.value;
      return edges
        .filter(edge => edge.target === selectedConcept)
        .map(edge => ({
          node: nodes.find(node => node.concept === edge.source),
          edge
        }));
    });
    const impacts = computed(() => {
      if (modelComponents.value === null || selectedNode.value === null) {
        return [];
      }
      const selectedConcept = selectedNode.value.concept;
      const { edges, nodes } = modelComponents.value;
      return edges
        .filter(edge => edge.source === selectedConcept)
        .map(edge => ({
          node: nodes.find(node => node.concept === edge.target),
          edge
        }));
    });
    const drilldownPanelTabs = computed(() => [
      {
        name: `Data to quantify ${nodeConceptName.value}`,
        id: 'only-tab'
      }
    ]);
    const collapseNode = () => {
      router.push({
        name: 'quantitative',
        params: {
          project: project.value,
          currentCAG: currentCAG.value,
          projectType: ProjectType.Analysis
        }
      });
    };
    return {
      nodeConceptName,
      drilldownPanelTabs,
      drivers,
      impacts,
      collapseNode,
      modelComponents,
      scenarios
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.node-drilldown-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;
}

main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: white;
  margin: 10px;
  padding: 0 10px;
}

header {
  padding: 10px 0;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h4 {
  margin: 0;
}

.nodes-container {
  display: flex;
  flex: 1;
  min-height: 0;
  margin-bottom: 10px;
}

.selected-node {
  flex: 1;
  min-width: 0;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  margin: 0 15px;
}

h6 {
  margin: 0;
  font-size: $font-size-medium;
  color: $text-color-light;
  font-weight: normal;
}

.expanded-node {
  flex: 1;
  min-height: 0;
  border: 1px solid black;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
}

.expanded-node-header {
  background: #eee;
  display: flex;
  justify-content: space-between;
  padding: 10px;
}

.neighbor-node {
  margin-top: 10px;
}

h5 {
  margin: 0;
  @include header-secondary;
}
</style>
