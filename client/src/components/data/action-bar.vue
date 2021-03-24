<template>
  <div>
    <nav class="secondary-navbar action-bar">
      <!-- Analysis rename/delete/duplicate dropdown -->
      <div class="nav-item">
        <button
          type="button"
          class="btn btn-new-analysis"
          @click="onShowDropdown"
        ><span>{{ analysisName }}</span>
          <i class="fa fa-fw fa-angle-down" />
        </button>
        <dropdown-control
          v-if="showDropdown"
          class="analysis-operations-dropdown">
          <template #content>
            <div
              class="dropdown-option"
              @click="onRename">
              Rename
            </div>
            <div
              class="dropdown-option disabled">
              Duplicate
            </div>
            <div
              class="dropdown-option"
              @click="onDelete">
              Delete
            </div>
          </template>
        </dropdown-control>
      </div>

      <!-- Actions -->
      <div class="nav-item">
        <button
          v-tooltip.top-center="'Search Data Cubes'"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click="openDataExplorer"
        > <i class="fa fa-fw fa-search" />Search Data Cubes</button>
      </div>

      <div
        class="nav-item time-sync"
        :class="{ 'disabled': emptyDataAnalysis }"
      >
        <label @click="setTimeSelectionSyncing(!timeSelectionSyncing)">
          <i
            class="fa fa-lg fa-fw"
            :class="{ 'fa-check-square-o': timeSelectionSyncing, 'fa-square-o': !timeSelectionSyncing }"
          />
          Sync time selection
        </label>
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
            :class="{'fa-commenting': description !== '', 'fa-commenting-o': description === ''}"
          />
        </button>
        <text-area-card
          v-if="isCommentOpen"
          class="comment-box"
          :title="'Comments'"
          :initial-text="description"
          @close="isCommentOpen = false"
          @saveText="updateComments"
        />
      </div>
      <rename-modal
        v-if="showRenameModal"
        :modal-title="'Rename Analysis'"
        :current-name="analysisName"
        @confirm="onRenameModalConfirm"
        @cancel="onRenameModalClose"
      />
    </nav>
  </div>

</template>

<script>

import { mapActions, mapGetters } from 'vuex';

import { getAnalysis, updateAnalysis, deleteAnalysis } from '@/services/analysis-service';
import { ANALYSIS, EXPORT_MESSAGES } from '@/utils/messages-util';

import RenameModal from '@/components/action-bar/rename-modal';
import DropdownControl from '@/components/dropdown-control';
import TextAreaCard from '@/components/cards/text-area-card';

export default {
  name: 'ActionBar',
  components: {
    RenameModal,
    DropdownControl,
    TextAreaCard
  },
  data: () => ({
    showDropdown: false,
    showRenameModal: false,
    analysisName: '',
    description: '',
    isCommentOpen: false
  }),
  computed: {
    ...mapGetters({
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing',
      analysisId: 'dataAnalysis/analysisId',
      analysisItems: 'dataAnalysis/analysisItems',
      project: 'app/project'
    }),
    emptyDataAnalysis() {
      return this.analysisItems.length === 0;
    }
  },
  async mounted() {
    const result = await getAnalysis(this.analysisId);
    this.analysisName = result.title;
    this.description = result.description;
    // if no data cube unset time syncing
    if (this.emptyDataAnalysis) {
      this.setTimeSelectionSyncing(false);
    }
  },
  methods: {
    ...mapActions({
      setTimeSelectionSyncing: 'dataAnalysis/setTimeSelectionSyncing'
    }),
    openDataExplorer() {
      this.$router.push({ name: 'dataExplorer', query: { analysisName: this.analysisName } });
    },
    onShowDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    async onDelete() {
      try {
        await deleteAnalysis(this.analysisId);
        this.toaster(ANALYSIS.SUCCESSFUL_DELETION, 'success', false);
        // We need to wait for a short delay here before navigating back to the
        //  start page, since ES can take some time to refresh its indices after
        //  the delete operation, meaning the deleted analysis would still show
        //  up in the start page list.
        await new Promise((resolve) => {
          setTimeout(() => { resolve(); }, 500);
        });
        // Back to DataStart page
        this.$router.push({
          name: 'dataStart',
          params: {
            project: this.project
          }
        });
      } catch (e) {
        console.error('Error occurred when deleting analysis:', e);
        this.toaster(ANALYSIS.ERRONEOUS_DELETION, 'error', true);
      }
    },
    onRename() {
      this.showRenameModal = true;
      this.showDropdown = false;
    },
    async onRenameModalConfirm(newName) {
      if (this.analysisName !== newName) {
        try {
          await updateAnalysis(this.analysisId, { title: newName });
          this.analysisName = newName;
          this.toaster(ANALYSIS.SUCCESSFUL_RENAME, 'success', false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
        }
      }
      this.onRenameModalClose();
    },
    onRenameModalClose() {
      this.showRenameModal = false;
    },
    toggleComments() {
      this.isCommentOpen = !this.isCommentOpen;
    },
    async updateComments(commentsText) {
      this.description = commentsText;
      try {
        await updateAnalysis(this.analysisId, { description: commentsText });
      } catch (e) {
        this.toaster(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/custom";

$width-name: 10vw;

.action-bar {
  background-color: $background-light-3;
  padding: 0 10px;
  position: relative;

  .nav-item:not(:first-child) {
    margin-left: 20px;
  }
  button {
    i {
      margin-right: 5px;
    }
  }
  .comment-btn {
    position: absolute;
    right: 5px;

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
  .btn-new-analysis {
    min-width: $width-name;
    text-align: left;
    background-color: transparent;
    i {
      margin-left: 10px;
    }
  }

  .analysis-operations-dropdown {
    position: absolute;
    margin-top: 8px;
    width: $width-name;
  }

  .time-sync {
    label {
      font-weight: normal;
      cursor: pointer;
      margin: 0;
    }
  }
}

</style>
