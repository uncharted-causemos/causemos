<template>
  <div class="model-publishing-experiment-container">
    <div class="model-publishing-experiment-header">
      <button class="accordion">
        Publish
        <i
          class="fa fa-fw"
          :class="{ 'fa-angle-down': !openPublishAccordion, 'fa-angle-up': openPublishAccordion }"
        />
      </button>
      <div class="accordion-panel">
        <model-publishing-checklist
          :publishingSteps="publishingSteps"
          :currentPublishingStep="currentPublishingStep"
          @navigate-to-publishing-step="showPublishingStep"
        />
      </div>
      <div
        v-if="openNewBookmarkPane"
        class="new-insight-popup">
        <new-insight-popup @close-insight-popup="onCloseInsightPopup" />
      </div>
    </div>
    <main>
    <!-- TODO: whether a card is actually expanded or not will
    be dynamic later -->
    <datacube-card
      :class="{ 'datacube-expanded': true }"
      :isExpanded="false"
      :selected-admin-level="selectedAdminLevel"
      :selected-model-id="selectedModelId"
      :all-scenario-ids="allScenarioIds"
      :selected-scenario-ids="selectedScenarioIds"
      :selected-timestamp="selectedTimestamp"
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="setSelectedTimestamp"
      @set-drilldown-data="setDrilldownDimensions"
      @check-model-metadata-validity="checkModelMetadataValidity"
    >
      <template v-slot:datacube-scenario-header>
        <datacube-model-header
          class="scenario-header"
          :selected-model-id="selectedModelId"
        />
      </template>
      <template v-slot:datacube-description>
        <model-description
          :selected-model-id="selectedModelId"
        />
      </template>
      <template v-slot:temporal-aggregation-config>
        <div class="temporal-aggregation">
          <button
            type="button"
            class="btn dropdown-btn"
            @click="isTemporalAggregationDropdownOpen = !isTemporalAggregationDropdownOpen"
          >
            <div class="button-text">
              Temporal aggregation: {{ selectedTemporalAggregation }}
            </div>
            <i
              class="fa fa-fw fa-angle-down"
            />
          </button>
          <dropdown-control
            v-if="isTemporalAggregationDropdownOpen"
            class="dropdown-control">
            <template #content>
              <div
                v-for="tempAgg in temporalAggregations"
                :key="tempAgg"
                class="dropdown-option"
                :class="{ 'dropdown-option-selected': selectedTemporalAggregation === tempAgg }"
                @click="handleTemporalAggregationSelection(tempAgg)"
              >
                {{ tempAgg }}
              </div>
            </template>
          </dropdown-control>
        </div>
      </template>
    </datacube-card>
    <drilldown-panel
        class="drilldown"
        :is-open="activeDrilldownTab !== null"
        :tabs="drilldownTabs"
        :active-tab-id="activeDrilldownTab"
      >
        <template #content>
          <breakdown-pane
            v-if="activeDrilldownTab ==='breakdown'"
            :selected-admin-level="selectedAdminLevel"
            :type-breakdown-data="typeBreakdownData"
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :selected-timestamp="selectedTimestamp"
            @set-selected-admin-level="setSelectedAdminLevel"
          />
        </template>
    </drilldown-panel>
    </main>
  </div>
</template>

<script lang="ts">
import DatacubeCard from '@/components/data/datacube-card.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import DSSAT_PRODUCTION_DATA from '@/assets/DSSAT-production.js';
import { defineComponent, ref } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import { ModelPublishingStep } from '@/types/UseCase';
import DropdownControl from '@/components/dropdown-control.vue';
import NewInsightPopup from '@/components/bookmark-panel/new-insight-popup.vue';
import { DimensionInfo } from '@/types/Model';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'ModelPublishingExperiment',
  components: {
    DatacubeCard,
    DrilldownPanel,
    BreakdownPane,
    DatacubeModelHeader,
    ModelPublishingChecklist,
    ModelDescription,
    DropdownControl,
    NewInsightPopup
  },
  emits: [
    'check-model-metadata-validity'
  ],
  data: () => ({
    publishingSteps: [] as ModelPublishingStep[],
    currentPublishingStep: 0,
    temporalAggregations: [] as string[],
    selectedTemporalAggregation: '',
    isTemporalAggregationDropdownOpen: false,
    openNewBookmarkPane: false
  }),
  setup() {
    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData: any[] = [];

    const allScenarioIds = DSSAT_PRODUCTION_DATA.scenarioIds;
    const selectedScenarioIds = ref([] as string[]);
    function setSelectedScenarioIds(newIds: string[]) {
      selectedScenarioIds.value = newIds;
    }

    const selectedTimestamp = ref(0);
    function setSelectedTimestamp(value: number) {
      selectedTimestamp.value = value;
    }

    const openPublishAccordion = ref(false);

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedAdminLevel,
      setSelectedAdminLevel,
      selectedModelId: DSSAT_PRODUCTION_DATA.modelId,
      allScenarioIds,
      selectedScenarioIds,
      setSelectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      setSelectedTimestamp,
      openPublishAccordion
    };
  },
  mounted(): void {
    this.setupAccordion();
    this.initPublishingSteps();
    this.fetchAvailableAggregations();

    // TODO: add support for saving multiple insight to track switching between them
  },
  methods: {
    fetchAvailableAggregations() {
      // TODO: add spatial aggregation
      // TODO: add temporal resolution
      // TODO: fetch actual available aggregations based on the pipeline support
      // sum, avg, mean
      // res: month, year
      this.temporalAggregations.push('mean');
      this.temporalAggregations.push('sum');
      this.temporalAggregations.push('mean');
    },
    initPublishingSteps() {
      // add the checklist content here and the initial state of each
      this.publishingSteps.push({
        id: '0',
        text: 'Enrich your description',
        completed: false
      });
      this.publishingSteps.push({
        id: '1',
        text: 'Tweak the visualization',
        completed: false
      });
      this.publishingSteps.push({
        id: '2',
        text: 'Capture model insight',
        completed: false
      });
    },
    updatePublishingStep(completed: boolean) {
      this.publishingSteps[this.currentPublishingStep].completed = completed;
    },
    showPublishingStep(publishStepInfo: any) {
      this.currentPublishingStep = publishStepInfo.publishStepIndex;
      // FIXME: use enums instead of magic numbers
      // BUG HERE: if step one is selected by default,
      //  and temporal aggregation is changed (by clicking on the data tab) then step completed will be 1 instead of 2
      if (this.currentPublishingStep === 2) {
        this.openNewBookmarkPane = true;
      } else {
        if (this.allScenarioIds.length > 0) {
          const selectedIds = this.currentPublishingStep !== 0 ? [this.allScenarioIds[0]] : [];
          this.setSelectedScenarioIds(selectedIds);
        }
      }
    },
    handleTemporalAggregationSelection(tempAgg: string) {
      this.selectedTemporalAggregation = tempAgg;
      this.isTemporalAggregationDropdownOpen = !this.isTemporalAggregationDropdownOpen;
      this.updatePublishingStep(true);
    },
    setDrilldownDimensions(e: { drilldownDimensions: Array<DimensionInfo> }) {
      const getRandom = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };
      this.typeBreakdownData.length = 0;
      e.drilldownDimensions.forEach(dd => {
        const drillDownChildren: Array<{name: string; value: number}> = [];
        const choices = dd.choices as Array<string>;
        choices.forEach((c) => {
          drillDownChildren.push({
            name: c,
            value: getRandom(0, 5000) // FIXME: pickup the actual breakdown aggregation from data
          });
        });
        const breakdown = {
          name: dd.name,
          data: {
            name: 'ALL',
            value: drillDownChildren.map(c => c.value).reduce((a, b) => a + b, 0), // sum all children values
            children: drillDownChildren
          }
        };
        this.typeBreakdownData.push(breakdown);
      });
    },
    checkModelMetadataValidity(info: any) {
      this.updatePublishingStep(info.valid);
    },
    onCloseInsightPopup(evnt: any) {
      this.openNewBookmarkPane = false;
      if (evnt.saved) {
        // TODO: save insight
        // mark this step as complete
        this.updatePublishingStep(true);
      }
    },
    setupAccordion() {
      const acc = document.getElementsByClassName('accordion');
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const that = this;
      for (let i = 0; i < acc.length; i++) {
        acc[i].addEventListener('click', function(this: HTMLElement) {
          that.openPublishAccordion = !that.openPublishAccordion;
          this.classList.toggle('active');
          const panel = this.nextElementSibling as HTMLElement;
          if (panel) {
            if (panel.style.display === 'block') {
              panel.style.display = 'none';
            } else {
              panel.style.display = 'block';
            }
          }
        });
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.model-publishing-experiment-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.temporal-aggregation {
  flex: 1;
  min-width: 0;
  padding-top: 5px;

  .dropdown-control {
    position: absolute;
    max-height: 400px;
    overflow-y: auto;
  }
  .dropdown-option-selected {
    color: $selected-dark;
  }
  .dropdown-btn {
    max-width: 100%;
    display: flex;
    align-items: center;
    font-weight: normal;

    .button-text {
      flex: 1;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
}

.new-insight-popup {
  display: block;
  background-color: rgb(236, 236, 236);
  position: absolute;
  margin: auto;
  display: flex;
  flex-direction: column;
  padding: 15px;
  box-shadow: 0px 5px 4px 2px rgba(0, 0, 0, 0.05),
              0px 3px 2px 1px rgba(0, 0, 0, 0.05);
  z-index: 2;
  width: 30vw;
}

main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 10px;
  margin-top: 0;
}

.search-button {
  align-self: center;
  margin: 10px 0;
}

.model-publishing-experiment-header {
  flex-direction: row;
  margin: auto;
}

/* Style the buttons that are used to open and close the accordion panel */
  .accordion {
    background-color: #eee;
    color: #444;
    cursor: pointer;
    margin: 10px 5px;
    text-align: left;
    border: none;
    outline: none;
    transition: 0.4s;
  }

  /* Add a background color to the button if it is clicked on (add the .active class with JS), and when you move the mouse over it (hover) */
  .active, .accordion:hover {
    background-color: #ccc;
  }

  /* Style the accordion panel. Note: hidden by default */
  .accordion-panel {
    padding: 0 18px;
    background-color: white;
    display: none;
    overflow: hidden;
  }
</style>
