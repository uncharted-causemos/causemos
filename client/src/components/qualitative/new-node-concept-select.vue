<template>
  <div class="new-node-container">
    <input
      ref="input"
      v-model="userInput"
      type="text"
      placeholder="Type a concept"
      @keydown="onKeyDown"
    >
    <dropdown-control class="suggestion-dropdown">
      <template #content>
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          v-tooltip.right="{
            content: 'No evidence found',
            show: !suggestion.hasEvidence && (index === focusedSuggestionIndex || index === mouseOverIndex),
            trigger: 'manual',
          }"
          class="dropdown-option"
          :class="{'focused': index === focusedSuggestionIndex, 'light': !suggestion.hasEvidence}"
          @click="selectSuggestion(suggestion)"
          @mouseenter="mouseEnter(index)"
          @mouseleave="mouseLeave(index)"
        >
          {{ suggestion.label }}
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import DropdownControl from '@/components/dropdown-control';
import modelService from '@/services/model-service';

const CONCEPT_SUGGESTION_COUNT = 8;

export default {
  name: 'NewNodeConceptSelect',
  components: {
    DropdownControl
  },
  props: {
    conceptsInCag: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'suggestion-selected'
  ],
  data: () => ({
    userInput: '',
    suggestions: [],
    focusedSuggestionIndex: 0,
    mouseOverIndex: -1
  }),
  computed: {
    ...mapGetters({
      ontologyConcepts: 'app/ontologyConcepts',
      project: 'app/project'
    })
  },
  watch: {
    userInput() {
      this.getSuggestions();
    },
    suggestions(n, o) {
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
        newFocusIndex = this.suggestions.length - 1;
      } else if (newFocusIndex >= this.suggestions.length) {
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
    },
    mouseLeave(index) {
      if (this.mouseOverIndex === index) {
        this.mouseOverIndex = -1;
      }
    },
    onEnterPressed() {
      if (this.suggestions.length === 0) return;
      const suggestion = this.suggestions[this.focusedSuggestionIndex];
      this.selectSuggestion(suggestion);
    },
    selectSuggestion(suggestion) {
      this.$emit('suggestion-selected', suggestion);
      this.userInput = '';
    },
    focusInput() {
      this.$refs.input.focus();
    },
    conceptNotInCag(concept) {
      return this.conceptsInCag.indexOf(concept.concept) === -1;
    },
    getSuggestions: _.throttle(async function() {
      if (_.isEmpty(this.userInput)) {
        this.suggestions = [];
      } else {
        const allSuggestions = await modelService.getConceptSuggestions(
          this.project, this.userInput, this.ontologyConcepts);
        this.suggestions = allSuggestions.filter(this.conceptNotInCag)
          .slice(0, CONCEPT_SUGGESTION_COUNT);

        this.suggestions.forEach(suggestion => {
          suggestion.label = this.ontologyFormatter(suggestion.concept);
        });
      }
    }, 500, { trailing: true, leading: false })
  }
};

</script>

<style lang="scss" scoped>
@import "~styles/_variables.scss";

.new-node-container {
  position: absolute;
  top: 20px;
  left: 20px;
  display: inline-block;
  width: 13rem;
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

.suggestion-dropdown {
  top: 3px; /* Don't overlap border */
  width: 25vw;
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

</style>
