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
              {{ suggestion.doc.variableName }}
            </div>
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

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import DropdownControl from '@/components/dropdown-control';
import HighlightText from '@/components/widgets/highlight-text';
import RadioButtonGroup from '../widgets/radio-button-group.vue';
import projectService from '@/services/project-service';
import datacubeService from '@/services/new-datacube-service';

const CONCEPT_SUGGESTION_COUNT = 10;

export default {
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
  data: () => ({
    userInput: '',
    conceptSuggestions: [],
    datacubeSuggestions: [],
    focusedSuggestionIndex: 0,

    mouseOverIndex: -1,
    dropdownLeftOffset: 0,
    dropdownTopOffset: 4, // prevent overlap with input box
    activeTab: 'concepts'
  }),
  computed: {
    ...mapGetters({
      ontologyConcepts: 'app/ontologyConcepts',
      project: 'app/project'
    }),
    currentSuggestion() {
      if (this.conceptSuggestions.length && this.focusedSuggestionIndex > -1) {
        return this.conceptSuggestions[this.focusedSuggestionIndex];
      }
      return null;
    }
  },
  mounted() {
    this.calculateDropdownOffset();
  },
  watch: {
    userInput() {
      this.getConceptSuggestions();
      this.getDatacubeSuggestions();
    },
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
    shiftFocus(delta) {
      let newFocusIndex = this.focusedSuggestionIndex + delta;
      if (newFocusIndex < 0) {
        newFocusIndex = this.conceptSuggestions.length - 1;
      } else if (newFocusIndex >= this.conceptSuggestions.length) {
        newFocusIndex = 0;
      }
      this.focusedSuggestionIndex = newFocusIndex;
    },
    onKeyDown(event) {
      switch (event.key) {
        case 'Enter':
          this.onEnterPressed(event);
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
    mouseEnter(index) {
      this.mouseOverIndex = index;
      this.focusedSuggestionIndex = index;
    },
    mouseLeave(index) {
      if (this.mouseOverIndex === index) {
        this.mouseOverIndex = -1;
      }
    },
    onEnterPressed() {
      if (this.conceptSuggestions.length === 0) return;
      const suggestion = this.conceptSuggestions[this.focusedSuggestionIndex];
      this.selectSuggestion(suggestion);
    },
    selectSuggestion(suggestion) {
      this.$emit('suggestion-selected', {
        concept: suggestion.doc.key,
        label: this.ontologyFormatter(suggestion.doc.key),
        shortName: '', // FIXME unused
        hasEvidence: false // FIXME unused
      });
      this.userInput = '';
    },
    focusInput() {
      this.$refs.input.focus();
    },
    conceptNotInCag(concept) {
      return this.conceptsInCag.indexOf(concept.concept) === -1;
    },
    calculateDropdownOffset() {
      // calculate if dropdown will collide with edge of screen and then translate if required
      const inputBoundingBox = this.$refs.newNodeTop.getBoundingClientRect();
      const cagContainerBoundingBox = this.$refs.newNodeContainer.parentNode.getBoundingClientRect();

      const dropdownWidth = 0.45 * window.innerWidth; // convert vw to px
      const dropdownHeight = 290; // Match CSS

      if (inputBoundingBox.left + dropdownWidth > cagContainerBoundingBox.right) {
        this.dropdownLeftOffset = -dropdownWidth + inputBoundingBox.width;
      }
      if (inputBoundingBox.bottom + dropdownHeight > cagContainerBoundingBox.bottom) {
        this.dropdownTopOffset = -dropdownHeight - (inputBoundingBox.height + 4); // +4 to prevent overlap with input box
      }
    },
    getConceptSuggestions: _.throttle(async function() {
      if (_.isEmpty(this.userInput)) {
        this.conceptSuggestions = [];
      } else {
        const conceptSuggestions = await projectService.getConceptSuggestions(this.project, this.userInput);
        this.conceptSuggestions = conceptSuggestions.splice(0, CONCEPT_SUGGESTION_COUNT);
      }
    }, 500, { trailing: true, leading: false }),
    getDatacubeSuggestions: _.throttle(async function() {
      if (_.isEmpty(this.userInput)) {
        this.datacubeSuggestions = [];
      } else {
        const datacubeSuggestions = await datacubeService.getDatacubeSuggestions(this.userInput);
        this.datacubeSuggestions = datacubeSuggestions.splice(0, 5);
      }
    }, 500, { trailing: true, leading: false }),
    setActive(tab) {
      this.activeTab = tab;
    }
  }
};

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
  margin: 5px;
}

.left-column {
  min-width: 280px;
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
