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
          <graph-node
            v-for="driver in drivers"
            :key="driver"
            :name="driver"
            class="graph-node"
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
          <p><i class="fa fa-fw fa-info-circle"/>To create a scenario, set some values by clicking on the chart. To remove a point, click on it again.</p>
        </div>
        <div class="impacts">
          <h5>Top Impacts</h5>
          <graph-node
            v-for="impact in impacts"
            :key="impact"
            :name="impact"
            class="graph-node"
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
import { computed, defineComponent } from 'vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import GraphNode from '@/components/node-drilldown/graph-node.vue';
import router from '@/router';
import { useStore } from 'vuex';
import { ProjectType } from '@/types/Enums';

export default defineComponent({
  name: 'NodeDrilldown',
  components: {
    DrilldownPanel,
    GraphNode
  },
  setup() {
    // Get CAG and selected node from route
    const store = useStore();
    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const nodeId = computed(() => store.getters['app/nodeId']);
    // TODO: remove console.log once we're using nodeId
    console.log('Selected node\'s ID:', nodeId.value);
    // TODO: fetch top drivers and top impacts (as well as edge colours/weights)
    //  CLARIFICATION REQUIRED:
    //    is this taken from the sensitivity analysis?
    //    do we want a maximum number of drivers/impacts? or add a scrollbar?
    // TODO: fetch historical/projection data for each driver/impact and selected node.
    // TODO: fetch node's concept name
    const nodeConceptName = 'COVID Virus';
    const drivers = ['precipitation', 'rainfall', 'sky water'];
    const impacts = ['crop production', 'flooding'];
    const drilldownPanelTabs = computed(() => [
      {
        name: `Data to quantify ${nodeConceptName}`,
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
      collapseNode
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
  padding: 10px;
  margin-bottom: 10px;
}

.selected-node {
  flex: 1;
  min-width: 0;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  margin: 0 10px;
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

.graph-node {
  margin-top: 10px;
}

h5 {
  margin: 0;
  @include header-secondary;
}
</style>
