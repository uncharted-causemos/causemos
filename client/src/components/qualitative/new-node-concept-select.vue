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
      <button
        v-if="userInput.length < 1"
        class="mx-2"
        style="border: none; background-color: white;"
        @click="$emit('show-custom-concept')"
      >
        <span style="color: #255DCC; font-size: 1.5rem;">
          <i class="fa fa-plus-circle"></i>
        </span>
      </button>
    </div>
    <dropdown-control
      v-if="userInput !== ''"
      class="suggestion-dropdown" :style="{left: dropdownLeftOffset + 'px', top: dropdownTopOffset + 'px'}">
      <template #content>
        <div class="tab-row">
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
          v-if="activeTab === 'datacubes'"
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
            v-if="datacubeSuggestions.length"
            class="right-column">
            {{ currentSuggestion.doc.description }}
          </div>
        </div>

        <!-- concepts -->
        <div
          v-if="activeTab === 'concepts'"
          style="display: flex; flex-direction: row">
          <div class="left-column">
            <div
              v-for="(suggestion, index) in conceptSuggestions"
              :key="suggestion.doc.key"
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
            v-if="conceptSuggestions.length"
            class="right-column">
            <div>
              <div
                v-for="(member, idx) in currentSuggestion.doc.members"
                :key="idx">
                <strong>{{ ontologyFormatter(member.label) }} </strong>
                <br>
                <div v-if="member.definition !== ''">
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
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, watch, Ref, computed } from 'vue';
import { useStore } from 'vuex';
import API from '@/api/api';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import DropdownControl from '@/components/dropdown-control.vue';
import HighlightText from '@/components/widgets/highlight-text.vue';
import RadioButtonGroup from '../widgets/radio-button-group.vue';

import projectService from '@/services/project-service';
import datacubeService from '@/services/new-datacube-service';

const CONCEPT_SUGGESTION_COUNT = 10;

const getRunId = async (id: string) => {
  const runs = await datacubeService.getModelRunMetadata(id);
  const defaultRun = runs.find(d => d.is_default_run === true && d.status === 'READY');
  console.log(runs, defaultRun);
};

const getTimeseries = async (dataId: string, runId: string, feature: string) => {
  const result = await API.get('maas/output/timeseries', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature: feature,
      resolution: 'month',
      temporal_agg: 'mean',
      spatial_agg: 'mean',
      region_id: ''
    }
  });
  console.log('abc', result.data);
  return result.data;
};

export default defineComponent({
  name: 'NewNodeConceptSelect',
  components: {
    DropdownControl,
    HighlightText,
    RadioButtonGroup
  },
  props: {
    conceptsInCag: {
      type: Array,
      default: () => []
    },
    placement: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    }
  },
  emits: [
    'suggestion-selected',
    'show-custom-concept'
  ],
  setup() {
    const store = useStore();
    const userInput = ref('');
    const focusedSuggestionIndex = ref(0);
    const mouseOverIndex = ref(-1);
    const activeTab = ref('concepts');
    const conceptSuggestions = ref([]) as Ref<any[]>;
    const datacubeSuggestions = ref([]) as Ref<any[]>;
    const dropdownLeftOffset = ref(0);
    const dropdownTopOffset = ref(4); // prevent overlap with input box

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

    watch(userInput, _.debounce(async () => {
      if (_.isEmpty(userInput.value)) {
        conceptSuggestions.value = [];
        datacubeSuggestions.value = [];
      } else {
        let results: any = null;
        results = await projectService.getConceptSuggestions(project.value, userInput.value);
        conceptSuggestions.value = results.splice(0, CONCEPT_SUGGESTION_COUNT);

        results = await datacubeService.getDatacubeSuggestions(userInput.value);
        datacubeSuggestions.value = results.splice(0, 5);
      }
    }, 300));

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
      datacubeSuggestions,
      dropdownLeftOffset,
      dropdownTopOffset,

      // Computed
      currentSuggestion,
      ontologyConcepts,
      project,

      ontologyFormatter: useOntologyFormatter()
    };
  },
  mounted() {
    this.calculateDropdownOffset();
    this.focusInput();

    // Test
    this.test();
  },
  watch: {
    conceptSuggestions(n, o) {
      if (!_.isEqual(n, o)) {
        this.focusedSuggestionIndex = 0;
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
      if (this.conceptSuggestions.length === 0) return;
      const suggestion = this.conceptSuggestions[this.focusedSuggestionIndex];
      this.selectSuggestion(suggestion);
    },
    selectSuggestion(suggestion: any) {
      this.$emit('suggestion-selected', {
        concept: suggestion.doc.key,
        label: this.ontologyFormatter(suggestion.doc.key),
        shortName: '', // FIXME unused
        hasEvidence: false // FIXME unused
      });
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
        const inputBoundingBox = this.newNodeTop.getBoundingClientRect();
        const cagContainerBoundingBox = (this.newNodeContainer.parentNode as HTMLElement).getBoundingClientRect();

        const dropdownWidth = 0.45 * window.innerWidth; // convert vw to px
        const dropdownHeight = 290; // Match CSS

        if (inputBoundingBox.left + dropdownWidth > cagContainerBoundingBox.right) {
          this.dropdownLeftOffset = -dropdownWidth + inputBoundingBox.width;
        }
        if (inputBoundingBox.bottom + dropdownHeight > cagContainerBoundingBox.bottom) {
          this.dropdownTopOffset = -dropdownHeight - (inputBoundingBox.height + 4); // +4 to prevent overlap with input box
        }
      }
    },
    getConceptSuggestions() {
      console.log('hihi');
      const fetch = async () => {
        if (_.isEmpty(this.userInput)) {
          this.conceptSuggestions = [];
        } else {
          const conceptSuggestions = await projectService.getConceptSuggestions(this.project, this.userInput);
          this.conceptSuggestions = conceptSuggestions.splice(0, CONCEPT_SUGGESTION_COUNT);
        }
      };
      fetch();
    },
    getDatacubeSuggestions() {
      const fetch = async () => {
        if (_.isEmpty(this.userInput)) {
          this.datacubeSuggestions = [];
        } else {
          const datacubeSuggestions = await datacubeService.getDatacubeSuggestions(this.userInput);
          this.datacubeSuggestions = datacubeSuggestions.splice(0, 5);
        }
      };
      return fetch();
    },
    setActive(tab: string) {
      this.activeTab = tab;
    },
    async test() {
      // const runs = await datacubeService.getModelRunMetadata('ad44420e-8168-438e-9ff9-0ae1b658fdb7');
      // console.log('runs are', runs);

      // http://localhost:8080/api/maas/output/timeseries?data_id=2ddd2cbe-364b-4520-a28e-a5691227db39&run_id=cd140452-7519-42bf-bbe7-cee5af7e4603&feature=Q&resolution=month&temporal_agg=mean&spatial_agg=mean

      const dataId = 'ad44420e-8168-438e-9ff9-0ae1b658fdb7';
      const feature = 'Oceanic Nino Index (total)';
      await getTimeseries(dataId, 'indicator', feature);
      await getRunId('ceedd3b0-f48f-43d2-b279-d74be695ed1c');
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
  width: 45vw;
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

    // Blue bar along the left edge
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

</style>
