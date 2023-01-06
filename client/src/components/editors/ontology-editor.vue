<template>
  <div class="ontology-editor-container">
    <dropdown-control>
      <template #content>
        <div class="dropdown-title">
          <h5>
            Select a Different Concept
            <span v-if="selectedOption === 'pick'"> - Search </span>
            <span v-if="selectedOption === 'new'"> - Add New Concept </span>
          </h5>
        </div>
        <close-button @click="close()" />
        <div v-if="selectedOption === 'suggestions'">
          <div
            v-for="(suggestion, idx) in suggestions"
            :key="idx"
            class="dropdown-option"
            @click="select(suggestion.name)"
          >
            <div class="flex">
              <i class="fa fa-check" :style="suggestionStyle(suggestion.name)" />
              <div class="suggestion-score">{{ precisionFormatter(suggestion.score) }}</div>
              <concept-display :item="suggestion.name" />
            </div>
          </div>
        </div>

        <div v-if="selectedOption === 'pick'">
          <div class="back-to-suggestion-container">
            <small-text-button :label="'Back'" @click="backToSuggestions" />
          </div>
          <auto-complete
            :search-fn="searchConcept"
            :display-type="'ConceptDisplay'"
            :placeholder-message="'Search concepts...'"
            @item-selected="select"
          />
        </div>
      </template>

      <template v-if="selectedOption === 'suggestions'" #footer class="ontology-options">
        <div class="ontology-footer-options-container">
          <small-text-button :label="'Search'" @click="selectOption('pick')" />
          <small-text-button :label="'Create Concept'" @click="showCustomConcept = true" />
        </div>
      </template>
    </dropdown-control>
    <modal-custom-concept
      v-if="showCustomConcept === true"
      @close="showCustomConcept = false"
      @save-custom-concept="saveCustomConcept"
    />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapGetters, useStore } from 'vuex';
import { defineComponent, ref, computed } from 'vue';

import DropdownControl from '@/components/dropdown-control.vue';
import AutoComplete from '@/components/widgets/autocomplete/autocomplete.vue';
import ConceptDisplay from '@/components/widgets/autocomplete/concept-display.vue';
import CloseButton from '@/components/widgets/close-button.vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import precisionFormatter from '@/formatters/precision-formatter';
import ModalCustomConcept from '@/components/modals/modal-custom-concept.vue';
import projectService from '@/services/project-service';

const CONCEPT_SUGGESTION_COUNT = 15;

/**
 * Concept picker, pick from either:
 * - An item from a list of concept suggestions that is scored
 * - An item from all ontological concepts
 */
export default defineComponent({
  name: 'OntologyEditor',
  components: {
    AutoComplete,
    ConceptDisplay,
    DropdownControl,
    CloseButton,
    SmallTextButton,
    ModalCustomConcept,
  },
  props: {
    concept: {
      type: String,
      default: '',
    },
    suggestions: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['select', 'close'],
  setup() {
    const store = useStore();
    const selectedOption = ref('suggestions');
    const ontologyConcepts = computed(() => store.getters['app/ontologyConcepts']);
    const showCustomConcept = ref(false);

    return {
      selectedOption,
      ontologyConcepts,
      showCustomConcept,
    };
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
    }),
  },
  methods: {
    precisionFormatter,
    async searchConcept(searchTerm: string) {
      if (_.isEmpty(searchTerm)) {
        return this.ontologyConcepts;
      }
      const suggestions = await projectService.getConceptSuggestions(this.project, searchTerm);
      return suggestions
        .slice(0, CONCEPT_SUGGESTION_COUNT)
        .map((suggestion: any) => suggestion.doc.key);
    },
    select(suggestion: string) {
      if (!_.isEmpty(suggestion) && this.concept !== suggestion) {
        this.$emit('select', suggestion);
      }
    },
    saveCustomConcept(v: { [key: string]: string }) {
      this.select(v.theme);
    },
    close() {
      this.$emit('close');
    },
    suggestionStyle(concept: string) {
      if (this.concept === concept) {
        return {
          opacity: 1,
        };
      } else {
        return {
          opacity: 0.1,
        };
      }
    },
    selectOption(option: string) {
      this.selectedOption = option;
    },
    backToSuggestions() {
      this.selectedOption = 'suggestions';
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

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
    display: inline-block;
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
