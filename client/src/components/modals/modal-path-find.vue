<template>
  <modal @close="close()">
    <template #header>
      <h4>Path suggestions</h4>
    </template>
    <template #body>
      <p v-if="isLoadingSuggestions">
        <i class="fa fa-fw fa-spin fa-spinner" />
        Loading suggestions...
      </p>
      <p v-else-if="suggestions.length === 0">
        No indirect paths from
        <strong>{{ ontologyFormatter(source.concept) }}</strong>
        to
        <strong>{{ ontologyFormatter(target.concept) }}</strong>
        were found.
      </p>
      <p v-else>Select one or more indirect paths to add to your CAG:</p>
      <div
        v-for="(suggestion, idx) in suggestions"
        style="display: flex; align-items: center"
        :key="idx"
        @click="toggleSelection(suggestion)"
      >
        <i
          style="margin-right: 5px"
          class="fa fa-fw"
          :class="{
            'fa-square-o': suggestion.selected === false,
            'fa-check-square-o': suggestion.selected === true,
          }"
        />
        <span v-for="(concept, index) of suggestion.path" :key="concept">
          <span v-if="index !== 0">
            &nbsp;
            <i class="fa fa-fw fa-long-arrow-right" />
          </span>
          {{ ontologyFormatter(concept) }}
        </span>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button type="button" class="btn first-button" @click.stop="close()">Cancel</button>
        <button
          type="button"
          class="btn btn-call-to-action"
          :disabled="!hasSelection"
          @click.stop="addSuggestedPaths()"
        >
          Add to CAG
        </button>
      </ul>
    </template>
  </modal>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import Modal from '@/components/modals/modal.vue';
import suggestionService from '@/services/suggestion-service';

export default {
  name: 'ModalPathFind',
  components: {
    Modal,
  },
  props: {
    source: {
      type: Object,
      required: true,
    },
    target: {
      type: Object,
      required: true,
    },
  },
  emits: ['add-paths', 'close'],
  data: () => ({
    isLoadingSuggestions: false,
    suggestions: [],
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
    }),
    hasSelection() {
      return this.suggestions.reduce((a, s) => {
        return a || s.selected === true;
      }, false);
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.isLoadingSuggestions = true;
      suggestionService
        .getGroupPathSuggestions(this.project, this.source.components, this.target.components)
        .then((paths) => {
          // Remove direct edge if it exists
          const indirectPaths = paths.filter((path) => path.length !== 2);
          const sortedPaths = _.orderBy(indirectPaths, (p) => p.length);
          this.suggestions = _.take(sortedPaths, 5).map((path) => {
            return {
              // suggestions for grouped nodes may have source or target that are component concepts
              // this normalizes those source and target concepts to the main concepts such that
              // component concepts are not readded to the cag
              path: path.map((concept, i) => {
                if (i === 0) {
                  return this.source.concept;
                } else if (i === path.length - 1) {
                  return this.target.concept;
                } else {
                  return concept;
                }
              }),
              selected: false,
            };
          });
        })
        .finally(() => {
          this.isLoadingSuggestions = false;
        });
    },
    close() {
      this.$emit('close', null);
    },
    addSuggestedPaths() {
      const selectedPathsRaw = this.suggestions.filter((s) => s.selected === true);
      const selectedPaths = [];
      for (let i = 0; i < selectedPathsRaw.length; i++) {
        const pathRaw = selectedPathsRaw[i].path;
        const path = [];

        for (let j = 0; j < pathRaw.length - 1; j++) {
          path.push({
            source: pathRaw[j],
            target: pathRaw[j + 1],
          });
        }
        selectedPaths.push(path);
      }
      this.$emit('add-paths', selectedPaths);
    },
    toggleSelection(path) {
      path.selected = !path.selected;
      this.suggestions = _.clone(this.suggestions);
    },
  },
};
</script>

<style scoped lang="scss">
.first-button {
  margin-right: 10px;
}
</style>
