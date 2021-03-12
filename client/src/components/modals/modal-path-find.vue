<template>
  <modal
    :use-green-header="true"
    @close="close()">
    <template #header>
      <h4> Path suggestions </h4>
    </template>
    <template #body>
      <p>
        There is no evidence to support the edge <strong>{{ conceptShortName(source) }}</strong>
        to <strong>{{ conceptShortName(target) }}</strong>. You can still use it, or select from the indirect paths listed below.
      </p>
      <div>
        <div v-if="suggestions.length === 0">
          <div>Loading suggestions...</div>
        </div>
        <div
          v-for="(path, idx) in suggestions"
          :key="idx"
          @click="toggleSelection(path)">
          <i
            class="fa fa-fw fa-check-square-o"
            :class="{'fa-square-o': path.selected === false, 'fa-check-square-o': path.selected === true}"
          />
          {{ path.map(conceptShortName).join(" > ") }}
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
import { conceptShortName } from '@/utils/concept-util';

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
    }
  },
  data: () => ({
    suggestions: []
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      suggestionService.getPathSuggestions(this.project, this.source, this.target).then(paths => {
        const sortedPaths = _.orderBy(paths, p => p.length);
        this.suggestions = [[this.source, this.target], ..._.take(sortedPaths, 5)];
        this.suggestions.forEach(s => {
          s.selected = false;
        });
      });
    },
    close() {
      this.$emit('close', null);
    },
    addSuggestedPaths() {
      const selectedPathsRaw = this.suggestions.filter(s => s.selected === true);
      const selectedPaths = [];
      for (let i = 0; i < selectedPathsRaw.length; i++) {
        const pathRaw = selectedPathsRaw[i];
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
    },
    conceptShortName
  }
};
</script>

<style scoped lang="scss">
.first-button {
  margin-right: 10px;
}
</style>
