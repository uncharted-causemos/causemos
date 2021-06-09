<template>
  <nav class="action-bar-container">
    <ul class="unstyled-list">
      <!-- CAG rename/delete/duplicate dropdown -->
      <model-options
        :cag-name="cagNameToDisplay"
        :view-after-deletion="'qualitativeStart'"
        @rename="openRenameModal"
      />

      <!-- Actions -->
      <li class="nav-item">
        <button
          v-tooltip.top-center="'Search Knowledge Base'"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click="openKBExplorer"
        > <i class="fa fa-fw fa-search" />Search Knowledge Base</button>
      </li>
      <li class="nav-item">
        <button
          v-tooltip.top-center="'Add a new concept'"
          type="button"
          class="btn btn-primary"
          @click="addConcept"
        ><i class="fa fa-fw fa-plus" />Add Concept</button>
      </li>
      <li class="nav-item">
        <button
          v-tooltip.top-center="'Import existing CAG'"
          type="button"
          class="btn btn-primary"
          @click="importCAG"
        ><i class="fa fa-fw fa-connectdevelop" />Import CAG</button>
      </li>
      <li class="nav-item">
        <button
          v-tooltip.top-center="'reset CAG positioning'"
          type="button"
          class="btn btn-primary"
          @click="resetCAG"
        >Reset Layout</button>
      </li>

    </ul>

    <div class="run-model">
      <arrow-button
        :disabled="isRunningModel || numEdges === 0"
        :text="`Run${isRunningModel ? 'ning' : ''} Model`"
        :isPointingLeft="false"
        :icon="'fa-connectdevelop'"
        @click="onRunModel"
      />
    </div>
    <div class="comment-btn">
      <button
        v-tooltip.top-center="'Comments'"
        type="button"
        class="btn btn-primary"
        @click="toggleComments"
      >
        <i
          class="fa fa-fw"
          :class="{'fa-commenting': comment !== '', 'fa-commenting-o': comment === ''}"
        />
      </button>
      <text-area-card
        v-if="isCommentOpen"
        class="comment-box"
        :title="'Comments'"
        :initial-text="comment"
        @close="isCommentOpen = false"
        @saveText="updateComments"
      />
    </div>
    <rename-modal
      v-if="showRenameModal"
      :current-name="cagNameToDisplay"
      @confirm="onRenameModalConfirm"
      @cancel="closeRenameModal"
    />
  </nav>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';

import modelService from '@/services/model-service';
import RenameModal from '@/components/action-bar/rename-modal';
import ModelOptions from '@/components/action-bar/model-options';
import TextAreaCard from '../cards/text-area-card';
import { CAG, EXPORT_MESSAGES } from '@/utils/messages-util';
import ArrowButton from '@/components/widgets/arrow-button.vue';
export default {
  name: 'ActionBar',
  components: {
    RenameModal,
    ModelOptions,
    TextAreaCard,
    ArrowButton
  },
  props: {
    modelSummary: {
      type: Object,
      default: null
    },
    modelComponents: {
      type: Object,
      required: true
    }
  },
  emits: [
    'add-concept', 'import-cag', 'reset-cag'
  ],
  data: () => ({
    showRenameModal: false,
    newCagName: '',
    isRunningModel: false,
    savedComment: null,
    isCommentOpen: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG'
    }),
    cagNameToDisplay() {
      return !_.isEmpty(this.newCagName) ? this.newCagName : _.get(this.modelSummary, 'name');
    },
    comment() {
      return this.savedComment === null ? _.get(this.modelSummary, 'description', null) : this.savedComment;
    },
    numEdges() {
      return _.get(this.modelComponents, 'edges', []).length;
    }
  },
  mounted() {
    this.savedComment = _.get(this.modelSummary, 'description', null);
  },
  methods: {
    openKBExplorer() {
      this.$router.push({ name: 'kbExplorer', query: { cag: this.currentCAG } });
    },
    addConcept() {
      this.$emit('add-concept');
    },
    importCAG() {
      this.$emit('import-cag');
    },
    resetCAG() {
      this.$emit('reset-cag');
    },
    onRenameModalConfirm(newCagNameInput) {
      // Optimistically set new name
      this.newCagName = newCagNameInput;
      this.saveNewCagName();
      this.closeRenameModal();
    },
    async saveNewCagName() {
      modelService.updateModelMetadata(this.currentCAG, { name: this.newCagName }).then(() => {
        this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
      }).catch(() => {
        this.newCagName = '';
        this.toaster(CAG.ERRONEOUS_RENAME, 'error', true);
      });
    },
    openRenameModal() {
      this.showRenameModal = true;
    },
    closeRenameModal() {
      this.showRenameModal = false;
    },
    toggleComments() {
      this.isCommentOpen = !this.isCommentOpen;
    },
    async updateComments(commentsText) {
      this.savedComment = commentsText;
      modelService.updateModelMetadata(this.currentCAG, { description: commentsText }).catch(() => {
        this.toaster(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      });
    },
    async onRunModel() {
      this.isRunningModel = true;
      // Quantify the model on the back end
      try {
        await modelService.quantifyModelNodes(this.currentCAG);
        // Navigate to the Quantitative View
        this.$router.push({
          name: 'quantitative',
          params: {
            project: this.project,
            currentCAG: this.currentCAG
          }
        });
      } catch {
        this.toaster(CAG.ERRONEOUS_MODEL_RUN, 'error', true);
        return;
      } finally {
        this.isRunningModel = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.action-bar-container {
  height: $navbar-outer-height;
  display: flex;
  align-items: center;
  background: $background-light-3;
  .run-model {
    margin-right: 20px;
    display: flex;
    flex-grow: 1;
    justify-content: flex-end;
    box-sizing: border-box;
  }
  .comment-btn {
    margin-right: 5px;
    margin-left: 10px;
    display: flex;
    align-items: flex-end;
    position: relative;

    i {
      margin-right: 0;
    }

    .comment-box {
      position: absolute;
      right: 0;
      top: calc(100% + 3px);
      width: 25vw;
    }
  }
  .nav-item {
    margin-left: 5px;
  }
  button {
    i {
      margin-right: 5px;
    }
  }
}

</style>
