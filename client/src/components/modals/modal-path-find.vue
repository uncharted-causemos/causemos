<template>
  <modal
    :use-green-header="true"
    @close="close()">
    <template #header>
      <h4> Path suggestions </h4>
    </template>
    <template #body>
      <p>
        There is no evidence to support the edge <strong>{{ ontologyFormatter(source) }}</strong>
        to <strong>{{ ontologyFormatter(target) }}</strong>. You can still use it
        <span v-if="suggestions.length === 1">.</span>
        <span v-else>, or select from the indirect paths listed below.</span>
      </p>
      <div>
        <div v-if="suggestions.length === 0">
          <div>Loading suggestions...</div>
        </div>
        <div
          v-for="(suggestion, idx) in suggestions"
          :key="idx"
          @click="toggleSelection(suggestion)">
          <i
            class="fa fa-fw fa-check-square-o"
            :class="{'fa-square-o': suggestion.selected === false, 'fa-check-square-o': suggestion.selected === true}"
          />
          {{ suggestion.path.map(d => ontologyFormatter(d)).join(" > ") }}
          <hr v-if="idx === 0">
        </div>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :disabled="!hasSelection"
          @click.stop="addSuggestedPaths()">Add
        </button>
      </ul>
    </template>
  </modal>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import Modal from '@/components/modals/modal';
import suggestionService from '@/services/suggestion-service';

export default {
  name: 'ModalPathFind',
  components: {
    Modal
  },
  props: {
    source: {
      type: String,
      required: true
    },
    target: {
      type: String,
      required: true
    },
    sources: {
      type: Array,
      required: true
    },
    targets: {
      type: Array,
      required: true
    }
  },
  emits: [
    'add-paths', 'close'
  ],
  data: () => ({
    suggestions: []
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    }),
    hasSelection() {
      return this.suggestions.reduce((a, s) => {
        return a || s.selected === true;
      }, false);
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      suggestionService.getGroupPathSuggestions(this.project, this.sources, this.targets).then(paths => {
        const sortedPaths = _.orderBy(paths, p => p.length);
        this.suggestions = [[this.source, this.target], ..._.take(sortedPaths, 5)].map(path => {
          return {
            // suggestions for grouped nodes may have source or target that are component concepts
            // this normalizes those source and target concepts to the main concepts such that
            // component concepts are not readded to the cag
            path: path.map((concept, i) => {
              if (i === 0) {
                return this.source;
              } else if (i === path.length - 1) {
                return this.target;
              } else {
                return concept;
              }
            }),
            selected: false
          };
        });
        if (this.suggestions.length === 1) {
          this.suggestions[0].selected = true;
        }
      });
    },
    close() {
      this.$emit('close', null);
    },
    addSuggestedPaths() {
      const selectedPathsRaw = this.suggestions.filter(s => s.selected === true);
      const selectedPaths = [];
      for (let i = 0; i < selectedPathsRaw.length; i++) {
        const pathRaw = selectedPathsRaw[i].path;
        const path = [];

        for (let j = 0; j < pathRaw.length - 1; j++) {
          path.push({
            source: pathRaw[j],
            target: pathRaw[j + 1]
          });
        }
        selectedPaths.push(path);
      }
      this.$emit('add-paths', selectedPaths);
    },
    toggleSelection(path) {
      path.selected = !path.selected;
      this.suggestions = _.clone(this.suggestions);
    }
  }
};
</script>

<style scoped lang="scss">
.first-button {
  margin-right: 10px;
}
</style>
