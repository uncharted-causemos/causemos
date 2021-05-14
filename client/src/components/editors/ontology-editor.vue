<template>
  <div class="ontology-editor-container">
    <dropdown-control>
      <template
        #content
        class="dropdown">

        <div class="dropdown-title">
          <h5>Select a Different Concept
            <span v-if="selectedOption === 'pick'">
              - Search All Concepts
            </span>
            <span v-if="selectedOption === 'new'">
              - Add New Concept
            </span>
          </h5>
        </div>
        <close-button @click="close()" />
        <div v-if="selectedOption === 'suggestions'">
          <div
            v-for="(suggestion, idx) in suggestions"
            :key="idx"
            class="dropdown-option"
            @click="select(suggestion.name)">
            <div class="flex">
              <i
                class="fa fa-check"
                :style="suggestionStyle(suggestion.name)" />
              <div class="suggestion-score"> {{ precisionFormatter(suggestion.score) }} </div>
              <concept-display :item="suggestion.name" />
            </div>
          </div>
        </div>

        <div v-if="selectedOption === 'pick'">
          <div class="back-to-suggestion-container">
            <small-text-button
              :label="'Back'"
              @click="backToSuggestions"
            />
          </div>
          <auto-complete
            :search-fn="searchConcept"
            :display-type="'ConceptDisplay'"
            :placeholder-message="'Search concepts...'"
            @item-selected="select" />
        </div>

        <div v-if="selectedOption === 'new'">
          <div>
            <small-text-button
              :label="'Back'"
              @click="backToSuggestions"
            />
          </div>
          <div class="padded-row">
            <label>New concept name</label>
            <input
              v-model="newNodeName"
              v-focus
              type="text"
              class="form-control"
              placeholder="Enter name">
            <div
              v-if="showErrorMessage"
              class="empty-new-node-message"
            >
              {{ errorMessage }}
            </div>
          </div>
          <div class="padded-row">
            <label>Add examples (optional)</label>
            <input
              v-model="examples"
              type="text"
              class="form-control"
              placeholder="Separate examples with commas">
          </div>
          <div>
            <label class="padded-row">Select parent of new concept</label>
            <auto-complete
              :search-fn="searchConcept"
              :display-type="'ConceptDisplay'"
              :placeholder-message="'Search for an existing concept'"
              @item-selected="setParentGrounding" />
          </div>
          <div>
            <button
              type="button"
              class="btn btn-primary"
              @click="createNewConcept()">
              Create
            </button>
          </div>
        </div>
      </template>

      <template
        v-if="selectedOption === 'suggestions'"
        #footer
        class="ontology-options">
        <div class="ontology-footer-options-container">
          <small-text-button
            :label="'Search All Concepts'"
            @click="selectOption('pick')"
          />
          <small-text-button
            :label="'Add New Concept'"
            :disabled="true"
            @click="selectOption('new')"
          />
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';

import API from '@/api/api';

import DropdownControl from '@/components/dropdown-control';
import AutoComplete from '@/components/widgets/autocomplete/autocomplete';
import ConceptDisplay from '@/components/widgets/autocomplete/concept-display';
import CloseButton from '@/components/widgets/close-button';
import { UNKNOWN } from '@/utils/concept-util';
import SmallTextButton from '@/components/widgets/small-text-button';
import precisionFormatter from '@/formatters/precision-formatter';

function _matchedConcepts(target, str) {
  return target.toLowerCase().replace(/_/g, ' ').includes(
    str.toLowerCase().replace(/_/g, ' ')
  );
}

const ERROR_NAME_REQUIRED = 'Please enter a name for the new node';
const ERROR_PARENT_REQUIRED = 'Please select the new node\'s parent';

/**
 * Concept picker, pick from either:
 * - An item from a list of concept suggestions that is scored
 * - An item from all ontological concepts
 */
export default {
  name: 'OntologyEditor',
  components: {
    AutoComplete,
    ConceptDisplay,
    DropdownControl,
    CloseButton,
    SmallTextButton
  },
  props: {
    concept: {
      type: String,
      default: ''
    },
    suggestions: {
      type: Array,
      default: () => ([])
    }
  },
  emits: [
    'select', 'close'
  ],
  data: () => ({
    selectedOption: 'suggestions',
    newNodeName: '',
    errorMessage: '',
    examples: ''
  }),
  computed: {
    ...mapGetters({
      ontologyConcepts: 'app/ontologyConcepts'
      // collection: 'app/collection' // FIXME: required for add-ontology-concept
    }),
    showErrorMessage() {
      return !_.isEmpty(this.errorMessage);
    },
    croppedOntologyConcepts: function() {
      let croppedOntologyConcepts = this.ontologyConcepts.filter(concept => concept !== UNKNOWN);
      croppedOntologyConcepts = croppedOntologyConcepts.map(concept => {
        let splitted = concept.split('/');
        splitted = splitted.slice(0, splitted.length - 1).join('/');
        return splitted;
      });
      return _.uniq(croppedOntologyConcepts);
    }
  },
  methods: {
    ...mapActions({
      setOntologyConcepts: 'app/setOntologyConcepts'
    }),
    precisionFormatter,
    async searchConcept(searchTerm) {
      const suggestions = this.ontologyConcepts.filter(item => _matchedConcepts(item, searchTerm));
      return suggestions;
    },
    select(suggestion) {
      if (!_.isEmpty(suggestion) && (this.concept !== suggestion)) {
        this.$emit('select', suggestion);
      }
    },
    close() {
      this.$emit('close');
    },
    suggestionStyle(concept) {
      if (this.concept === concept) {
        return {
          opacity: 1
        };
      } else {
        return {
          opacity: 0.1
        };
      }
    },
    selectOption(option) {
      this.selectedOption = option;
    },
    backToSuggestions() {
      this.selectedOption = 'suggestions';
    },
    setParentGrounding(parentGrounding) {
      this.parentGrounding = parentGrounding;
    },
    createNewConcept() {
      if (_.isEmpty(this.newNodeName)) {
        this.errorMessage = ERROR_NAME_REQUIRED;
      } else if (_.isEmpty(this.parentGrounding)) {
        this.errorMessage = ERROR_PARENT_REQUIRED;
      } else {
        this.errorMessage = '';
        const newOntologyNode = this.parentGrounding + '/' + this.newNodeName;
        const examplesArray = this.examples.split(',');
        API.post(`collections/${this.collection}/new-ontology-concept`, { name: newOntologyNode, examples: examplesArray }).then(() => {
          this.toaster(`Created ${newOntologyNode}`, 'success', false);
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.ontology-editor-container {
  position: absolute;
  top: 0%;
  right: 93%;
  width: 30vw;

  .dropdown-title h5 {
    @include header-secondary;
    font-size: $font-size-medium;
  }

  .suggestion-score {
    margin-right: 5px;
  }
  .ontology-options {
    display:inline-block;
  }
  .autocomplete-results {
    position: relative;
  }
  .empty-new-node-message {
    color: $negative;
  }
  .padded-row {
    padding: 0 10px;
    margin-top: 15px;
  }
  .btn-primary {
    margin: 10px;
  }
  .back-to-suggestion-container {
    margin: 10px 10px 5px 10px;
  }
  .ontology-footer-options-container {
    margin: 10px;
    margin-top: 20px;
    button {
      margin-right: 8px;
    }
  }
}
</style>
