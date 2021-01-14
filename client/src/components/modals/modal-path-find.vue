<template>
  <modal
    :use-green-header="true"
    @close="close()">
    <h4 slot="header">
      Add paths
    </h4>
    <div slot="body">
      There are no backing evidence supporting the edge <strong>{{ conceptShortName(source) }}</strong>
      to <strong>{{ conceptShortName(target) }}</strong>
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
        @click.stop="confirm()">Confirm
      </button>
    </ul>
  </modal>
</template>

<script>
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
      suggestionService.getPathSuggestions(this.project, this.source, this.target).then(path => {
        console.log('!!!', path);
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
