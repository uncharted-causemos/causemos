<template>
  <div>
    <nav class="secondary-navbar action-bar">
      <ul class="nav navbar-nav">
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

      </ul>

      <!-- Create a model. NOTE: This button is just navigational for now -->
      <div class="run-model">
        <button
          v-tooltip.top-center="'Run Model'"
          type="button"
          class="btn btn-call-for-action btn-arrow-right"
          :disabled="isRunningModel || numEdges === 0"
          @click="onRunModel"
        > <i class="fa fa-fw fa-connectdevelop" />Run{{ isRunningModel ? 'ning' : '' }} Model</button>
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
          /></button>
      </div>
    </nav>

    <text-area-card
      v-if="isCommentOpen"
      :title="'Comments'"
      :initial-text="comment"
      @close="isCommentOpen = false"
      @saveText="updateComments"
    />

    <rename-modal
      v-if="showRenameModal"
      :current-name="cagNameToDisplay"
      @confirm="onRenameModalConfirm"
      @cancel="closeRenameModal"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';

import API from '@/api/api';
import RenameModal from '@/components/action-bar/rename-modal';
import ModelOptions from '@/components/action-bar/model-options';
import TextAreaCard from '../cards/text-area-card';
import { CAG, EXPORT_MESSAGES } from '@/utils/messages-util';
export default {
  name: 'ActionBar',
  components: {
    RenameModal,
    ModelOptions,
    TextAreaCard
  },
  props: {
    modelSummary: {
      type: Object,
      required: true
    },
    modelComponents: {
      type: Object,
      required: true
    }
  },
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
      return !_.isEmpty(this.newCagName) ? this.newCagName : this.modelSummary.name;
    },
    comment() {
      return this.savedComment === null ? this.modelSummary.description : this.savedComment;
    },
    numEdges() {
      return _.get(this.modelComponents, 'edges', []).length;
    }
  },
  mounted() {
    this.savedComment = this.modelSummary.description;
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
    onRenameModalConfirm(newCagNameInput) {
      // Optimistically set new name
      this.newCagName = newCagNameInput;
      this.saveNewCagName();
      this.closeRenameModal();
    },
    async saveNewCagName() {
      const result = await API.put(`cags/${this.currentCAG}`, {
        name: this.newCagName
      });
      if (result.status === 200) {
        this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
      } else {
        // Revert displayed name to what it was before the rename operation
        this.newCagName = '';
        this.toaster(CAG.ERRONEOUS_RENAME, 'error', true);
      }
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
      const result = await API.put(`cags/${this.currentCAG}`, {
        description: commentsText
      });
      if (result.status !== 200) {
        this.toaster(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      }
    },
    async onRunModel() {
      this.isRunningModel = true;
      // Quantify the model on the back end
      const result = await API.post(`models/${this.currentCAG}`);
      this.isRunningModel = false;
      if (result.status !== 200) {
        this.toaster(CAG.ERRONEOUS_MODEL_RUN, 'error', true);
        return;
      }
      // Navigate to the Quantitative View
      this.$router.push({
        name: 'quantitative',
        params: {
          project: this.project,
          currentCAG: this.currentCAG
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import "~styles/variables";
@import "~styles/custom";

.action-bar {
  border: 1px solid $separator;
  background-color: transparent;
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
