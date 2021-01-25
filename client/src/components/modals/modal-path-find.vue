<template>
  <modal
    :use-green-header="true"
    @close="close()">
    <h4 slot="header">
      Path suggestions
    </h4>
    <div slot="body">
      <p>
        There are no backing evidence supporting the edge <strong>{{ conceptShortName(source) }}</strong>
        to <strong>{{ conceptShortName(target) }}</strong>. Choose from the list of indirect paths below, or
        click Cancel to use the unsupportd path anyway.
      </p>
      <div>
        <div
          v-for="(path, idx) in suggestions"
          :key="idx"
          @click="toggleSelection(path)">
          <i
            class="fa fa-fw fa-check-square-o"
            :class="{'fa-square-o': path.selected === false, 'fa-check-square-o': path.selected === true}"
          />
          {{ path.map(conceptShortName).join(" > ") }}
        </div>
      </div>
    </div>
    <ul
      slot="footer"
      class="unstyled-list">
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
  </modal>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import Modal from '@/components/modals/modal';
import suggestionService from '@/services/suggestion-service';
import { conceptShortName } from '@/utils/concept-util';

export default {
  name: 'ModalConfirm',
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
        this.suggestions = _.take(paths, 5);
        this.suggestions.forEach(s => {
          s.selected = false;
        });
      });
    },
    close() {
      this.$emit('close', null);
    },
    addSuggestedPaths() {
      this.$emit('add-paths', null);
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
