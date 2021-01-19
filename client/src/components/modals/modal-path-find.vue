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
          v-for="(path, idx) in paths"
          :key="idx">
          <i class="fa fa-fw fa-square-o" /> {{ path.map(conceptShortName).join(" > ") }}
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
        ref="confirm"
        type="button"
        class="btn btn-primary btn-call-for-action"
        @click.stop="confirm()">Add
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
    paths: []
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
        this.paths = _.take(paths, 5);
      });
    },
    close() {
      this.$emit('close', null);
    },
    confirm() {
      this.$emit('confirm', null);
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
