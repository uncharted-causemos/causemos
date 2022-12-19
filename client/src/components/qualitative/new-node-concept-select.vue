<template>
  <div class="new-node-container" ref="newNodeContainer" :style="{left: placement.x + 'px', top: placement.y + 'px' }">
    <div class="new-node-top" ref="newNodeTop">
      <input
        ref="input"
        v-model="userInput"
        type="text"
        placeholder="Type a concept"
        style="height: 2.5rem;"
        @keydown="onKeyDown"
      >
    </div>
    <dropdown-control
      class="suggestion-dropdown" :style="{left: dropdownLeftOffset + 'px', top: dropdownTopOffset + 'px'}">
      <template #content>
        <div class="tab-row" v-if="userInput.length > 0">
          <div>
            Filter by: &nbsp;
          </div>
          <radio-button-group
            :buttons="[
              { label: 'Concepts', value: 'concepts' },
              { label: 'Datacubes', value: 'datacubes' }
            ]"
            :selected-button-value="activeTab"
            @button-clicked="setActive"
          />
        </div>


        <!-- datacubes -->
        <div
          v-if="activeTab === 'datacubes' && datacubeSuggestions.length > 0"
          style="display: flex; flex-direction: row">
          <div class="left-column">
            <div
              v-for="(suggestion, index) in datacubeSuggestions"
              :key="suggestion.doc.variableName"
              class="dropdown-option"
              :class="{'focused': index === focusedSuggestionIndex}"
              @click="selectSuggestion(suggestion)"
              @mouseenter="mouseEnter(index)"
              @mouseleave="mouseLeave(index)"
            >
              {{ suggestion.doc.display_name }}
            </div>
          </div>
          <div
            v-if="focusedSuggestionIndex >= 0 && datacubeSuggestions.length"
            class="right-column">
            <div style="font-weight: 600">{{ currentSuggestion.doc.display_name }}</div>
            <div style="color: #888">{{ currentSuggestion.doc.name }}</div>
            <div>&nbsp;</div>
            <div v-if="currentSuggestion.doc.period">
              {{ dateFormatter(currentSuggestion.doc.period.gte, temporalResolution === TemporalResolutionOption.Year ? 'YYYY' : 'MMMM YYYY') }} to {{ dateFormatter(currentSuggestion.doc.period.lte, temporalResolution === TemporalResolutionOption.Year ? 'YYYY' : 'MMMM YYYY') }}
            </div>
            <sparkline
              :data="sparklineData"
              :size="[220, 90]"
            />
            <div>{{ currentSuggestion.doc.description }}</div>
          </div>
        </div>

        <!-- concepts -->
        <div
          v-if="(activeTab === 'concepts' && userInput.length > 0)"
          style="display: flex; flex-direction: row">
          <div class="left-column">
            <div
              class="dropdown-option"
              @click="saveCustomConcept"
              :class="{'focused': focusedSuggestionIndex === -1}"
            >
              <div class="dropdown-option-label">
                <div class="dropdown-option-label-text">
                  Create a new concept for <b>{{ userInput }}</b>
                </div>
              </div>
            </div>
            <div
              v-for="(suggestion, index) in conceptSuggestions"
              :key="suggestion + index"
              class="dropdown-option"
              :class="{'focused': index === focusedSuggestionIndex, 'light': !suggestion.hasEvidence}"
              @click="selectSuggestion(suggestion)"
              @mouseenter="mouseEnter(index)"
              @mouseleave="mouseLeave(index)"
            >
              {{ ontologyFormatter(suggestion.doc.key) }}
            </div>
          </div>
          <div
            v-if="(focusedSuggestionIndex >= 0 && conceptSuggestions.length > 0)"
            class="right-column">
            <div>
              <div
                v-for="(member, idx) in currentSuggestion.doc.members"
                :key="idx">
                <strong>{{ ontologyFormatter(member.label) }} </strong>
                <br>
                <div>
                  <small>{{ member.label }}</small>
                </div>
                <div v-if="member.definition && member.definition !== ''">
                  <small>Definition: {{ member.definition }} </small>
                </div>
                <div v-if="member.examples">
                  <small>
                    Examples:
                    <highlight-text
                      :text="member.examples.join(', ')"
                      :highlights="member.highlight ? member.highlight.examples: []"
                    />
                  </small>
                </div>
                <br>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="activeTab === 'concepts' && conceptSuggestions.length > 0"
          class="tab-row" style="border-top: 1px solid #ddd; border-bottom: 0; margin: 2px; padding: 2px">
          Showing top {{ conceptSuggestions.length }} matches&nbsp;&nbsp;
          <button class="btn btn-primrary btn-xs" @click="openExplorer">
            Explore Knowledge Base
          </button>
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch } from 'vue';
import { useStore } from 'vuex';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import dateFormatter from '@/formatters/date-formatter';
import DropdownControl from '@/components/dropdown-control.vue';
import HighlightText from '@/components/widgets/highlight-text.vue';
import RadioButtonGroup from '../widgets/radio-button-group.vue';
import Sparkline from '@/components/widgets/charts/sparkline.vue';

import { ModelRun } from '@/types/ModelRun';
import { TimeseriesPoint } from '@/types/Timeseries';

import projectService from '@/services/project-service';
import datacubeService from '@/services/new-datacube-service';
import numberFormatter from '@/formatters/number-formatter';

import { AggregationOption, TemporalResolution, TemporalResolutionOption, TimeScale } from '@/types/Enums';
import { correctIncompleteTimeseries } from '@/utils/incomplete-data-detection';
import { logHistoryEntry } from '@/services/model-service';
import { getTimeseries } from '@/services/outputdata-service';
import filtersUtil from '@/utils/filters-util';
import { cleanConceptString } from '@/utils/concept-util';

const CONCEPT_SUGGESTION_COUNT = 30;

const getRunId = async (id: string): Promise<ModelRun> => {
  const run = await datacubeService.getDefaultModelRunMetadata(id);
  return run;
};

export default defineComponent({
  name: 'NewNodeConceptSelect',
  components: {
    DropdownControl,
    HighlightText,
    RadioButtonGroup,
    Sparkline
  },
  props: {
    conceptsInCag: {
      type: Array,
      default: () => []
    },
    placement: {
      type: Object as PropType<{ x: number; y: number }>,
      default: () => ({ x: 0, y: 0 })
    },
    selectedTimeScale: {
      type: String as PropType<TimeScale>,
      required: true
    }
  },
  emits: [
    'suggestion-selected',
    'datacube-selected',
    'save-custom-concept'
  ],
  setup(props, { emit }) {
    const { selectedTimeScale } = toRefs(props);

    const store = useStore();
    const userInput = ref('');
    const focusedSuggestionIndex = ref(-1);
    const mouseOverIndex = ref(-1);
    const activeTab = ref('concepts');
    const conceptSuggestions = ref([]) as Ref<any[]>;
    const conceptEstimatedHits = ref(0);
    const datacubeSuggestions = ref([]) as Ref<any[]>;
    const dropdownLeftOffset = ref(0);
    const dropdownTopOffset = ref(4); // prevent overlap with input box

    const timeseries = ref([]) as Ref<TimeseriesPoint[]>;
    const sparklineData = ref([]) as Ref<any[]>;

    const input = ref(null) as Ref<HTMLInputElement | null>;
    const newNodeTop = ref(null) as Ref<HTMLDivElement | null>;
    const newNodeContainer = ref(null) as Ref<HTMLDivElement | null>;

    const currentSuggestion = computed(() => {
      const idx = focusedSuggestionIndex.value;
      if (activeTab.value === 'concepts' && conceptSuggestions.value.length && idx > -1) {
        return conceptSuggestions.value[idx];
      }
      if (activeTab.value === 'datacubes' && datacubeSuggestions.value.length && idx > -1) {
        return datacubeSuggestions.value[idx];
      }
      return null;
    });

    const ontologyConcepts = computed(() => store.getters['app/ontologyConcepts']);
    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const ontologySet = computed(() => store.getters['app/ontologySet']);
    const updateOntologyCache = (userInput: string) => {
      store.dispatch('app/updateOntologyCache', userInput);
    };

    const customGrounding = () => {
      return {
        theme: cleanConceptString(userInput.value),
        theme_property: cleanConceptString(''),
        process: cleanConceptString(''),
        process_property: cleanConceptString('')
      };
    };

    const saveCustomConcept = () => {
      // Update ontology
      if (ontologySet.value.has(userInput) === false) {
        projectService.addNewConceptToOntology(project.value, userInput.value, [], '');
        updateOntologyCache(userInput.value);
        emit('save-custom-concept', customGrounding());
      } else {
        console.error(`Trying to add existing concept ${userInput.value}, ignoring...`);
      }
    };

    watch(userInput, _.debounce(async () => {
      if (_.isEmpty(userInput.value)) {
        conceptSuggestions.value = [];
        datacubeSuggestions.value = [];
      } else {
        let results: any = null;
        results = await projectService.getConceptSuggestions(project.value, userInput.value, true);
        conceptSuggestions.value = results.result.splice(0, CONCEPT_SUGGESTION_COUNT);
        conceptEstimatedHits.value = results.estimate;

        results = await datacubeService.getDatacubeSuggestions(userInput.value);
        datacubeSuggestions.value = results.splice(0, 5);

        logHistoryEntry(currentCAG.value, 'search', userInput.value);
      }
    }, 300));

    const temporalResolution = ref(TemporalResolutionOption.Month);

    watch(currentSuggestion, async () => {
      if (currentSuggestion.value && activeTab.value === 'datacubes') {
        const doc = currentSuggestion.value.doc;

        // Figure out datacube or indicator
        let runId = 'indicator';
        if (doc.type !== 'indicator') {
          runId = (await getRunId(doc.data_id)).id;
        }

        //
        // Get the timeseries data
        //

        // convert time-scale value to TemporalResolutionOption
        if (selectedTimeScale.value === TimeScale.Months) {
          temporalResolution.value = TemporalResolutionOption.Month;
        }
        if (selectedTimeScale.value === TimeScale.Years) {
          temporalResolution.value = TemporalResolutionOption.Year;
        }
        const rawResolution = doc.raw_temporal_resolution ?? TemporalResolution.Other;
        const periodEndDate = new Date(doc.period?.lte ?? 0);
        const agg = AggregationOption.Mean;

        const result = (await getTimeseries({
          modelId: doc.data_id,
          runId,
          outputVariable: doc.feature,
          temporalResolution: temporalResolution.value,
          temporalAggregation: agg,
          spatialAggregation: agg,
          regionId: ''
        })).data as TimeseriesPoint[];

        const { points } = correctIncompleteTimeseries(result, rawResolution, temporalResolution.value, agg, periodEndDate);

        timeseries.value = points;
        sparklineData.value = [
          {
            name: 'test',
            series: result.map(d => d.value)
          }
        ];
      }
    });

    return {
      // element refs
      input,
      newNodeTop,
      newNodeContainer,

      // Reactive
      userInput,
      focusedSuggestionIndex,
      mouseOverIndex,
      activeTab,
      conceptSuggestions,
      conceptEstimatedHits,
      datacubeSuggestions,
      dropdownLeftOffset,
      dropdownTopOffset,
      timeseries,
      sparklineData,
      temporalResolution,

      // Computed
      currentCAG,
      currentSuggestion,
      ontologyConcepts,
      project,
      ontologySet,

      saveCustomConcept,
      dateFormatter,
      ontologyFormatter: useOntologyFormatter(),
      TemporalResolutionOption,

      // Fn
      numberFormatter
    };
  },
  mounted() {
    this.calculateDropdownOffset();
    this.focusInput();
  },
  watch: {
    conceptSuggestions(n, o) {
      if (!_.isEqual(n, o)) {
        this.focusedSuggestionIndex = -1;
      }
    },
    activeTab(n, o) {
      if (!_.isEqual(n, o)) {
        this.focusedSuggestionIndex = 0;
      }
    }
  },
  methods: {
    // `delta` is 1 if moving down the list, -1 if moving up the list
    shiftFocus(delta: number) {
      let newFocusIndex = this.focusedSuggestionIndex + delta;
      if (newFocusIndex < 0) {
        newFocusIndex = this.conceptSuggestions.length - 1;
      } else if (newFocusIndex >= this.conceptSuggestions.length) {
        newFocusIndex = 0;
      }
      this.focusedSuggestionIndex = newFocusIndex;
    },
    onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Enter':
          this.onEnterPressed();
          break;
        case 'ArrowUp':
          this.shiftFocus(-1);
          event.preventDefault();
          break;
        case 'ArrowDown':
          this.shiftFocus(1);
          event.preventDefault();
          break;
      }
    },
    mouseEnter(index: number) {
      this.mouseOverIndex = index;
      this.focusedSuggestionIndex = index;
    },
    mouseLeave(index: number) {
      if (this.mouseOverIndex === index) {
        this.mouseOverIndex = -1;
      }
    },
    onEnterPressed() {
      if (this.conceptSuggestions.length === 0) {
        if (this.userInput.length > 0) {
          this.saveCustomConcept();
        }
        return;
      }
      const suggestion = this.conceptSuggestions[this.focusedSuggestionIndex];
      this.selectSuggestion(suggestion);
    },
    selectSuggestion(suggestion: any) {
      if (this.activeTab === 'concepts') {
        this.$emit('suggestion-selected', {
          concept: suggestion.doc.key,
          label: this.ontologyFormatter(suggestion.doc.key),
          shortName: '', // FIXME unused
          hasEvidence: false // FIXME unused
        });
      } else {
        const doc = this.currentSuggestion.doc;
        // The parameter part of node-parameter
        // FIXME: Need to find out what exactly we need, id or data_id, name or display_name ...
        this.$emit('datacube-selected', {
          id: doc.id,
          data_id: doc.data_id,
          name: doc.display_name,
          unit: '',
          country: '',
          admin1: '',
          admin2: '',
          admin3: '',
          spatialAggregation: 'mean',
          temporalAggregation: 'mean',
          temporalResolution: this.temporalResolution,
          period: this.temporalResolution === TemporalResolutionOption.Month ? 12 : 1,
          timeseries: this.timeseries,
          // Filled in by server
          min: null,
          max: null
        });
      }
      this.userInput = '';
    },
    focusInput() {
      if (this.input) {
        this.input.focus();
      }
    },
    calculateDropdownOffset() {
      // calculate if dropdown will collide with edge of screen and then translate if required
      if (this.newNodeTop && this.newNodeContainer) {
        const buffer = 100; // Discourage flipped orientation by allow bottom-boundary to exceed by buffer amount
        const inputBoundingBox = this.newNodeTop.getBoundingClientRect();
        const cagContainerBoundingBox = (this.newNodeContainer.parentNode as HTMLElement).getBoundingClientRect();

        const dropdownWidth = 0.45 * window.innerWidth; // convert vw to px
        const dropdownHeight = 330; // Match CSS

        if (inputBoundingBox.left + dropdownWidth > cagContainerBoundingBox.right) {
          this.dropdownLeftOffset = -dropdownWidth + inputBoundingBox.width;
        }
        if (inputBoundingBox.bottom + dropdownHeight > cagContainerBoundingBox.bottom + buffer) {
          this.dropdownTopOffset = -dropdownHeight - (inputBoundingBox.height + 4); // +4 to prevent overlap with input box
        }
      }
    },
    setActive(tab: string) {
      this.activeTab = tab;
    },
    openExplorer() {
      const filters = filtersUtil.newFilters();
      filtersUtil.setClause(filters, 'keyword', [this.userInput], 'or', false);
      this.$router.push({
        name: 'kbExplorer',
        query: { cag: this.currentCAG, view: 'statements', filters: filters as any }
      });
    }
  }
});

</script>

<style lang="scss" scoped>
@import "~styles/variables.scss";

.new-node-container {
  position: absolute;
  top: 20px;
  left: 20px;
  display: inline-block;
  width: 15rem;
  height: 3rem;
  border: 2px solid $selected;
  border-radius: 4px;

  input {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 4px;
  }
}

.new-node-top {
  display: flex;
  flex-direction: row;
}

.suggestion-dropdown {
  width: 50vw;
}

.dropdown-option {
  position: relative;

  // Lighten default hover bg to emphasize focused item
  &:hover {
    background: #F8F8F8;
  }

  &.light {
    color: #6E6E6E;
  }

  &.focused {
    background: #EAEBEC; // `dropdown-control` hover colour

    // Bar along the left edge
    &::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 4px;
      background: $selected;
    }
  }
}

.tab-row {
  margin-left: 5px;
  margin-top: 5px;
  padding-bottom: 5px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #DDD;
}

.left-column {
  min-width: 280px;
  max-width: 280px;
  height: 290px;
  overflow-y: scroll;
}
.right-column {
  flex-grow: 1;
  padding: 8px;
  border-left: 1px solid #DDD;
  height: 290px;
  overflow-y: scroll;
}

.new-concept-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 290px;
  font-size: 1.5rem;

  button {
    margin-top: 10px;
  }
}

</style>
