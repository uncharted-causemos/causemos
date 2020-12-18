<template>
  <div class="quantitative-start-container">
    <start-screen
      open-section-header="Recent Models"
      :show-create-section="false"
      :recent-cards="recentCards"
      @open-recent="onRecent"
      @rename="onRename"
      @duplicate="onDuplicate"
      @delete="onDelete"
    />
    <empty-state-instructions v-if="showEmptyStateInstructions" />
    <rename-modal
      v-if="showRenameModal"
      :current-name="selectedCard.title"
      @confirm="onRenameModalConfirm"
      @cancel="closeRenameModal"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import API from '@/api/api';

import StartScreen from '@/components/start-screen';
import RenameModal from '@/components/action-bar/rename-modal';
import EmptyStateInstructions from '@/components/empty-state-instructions';
import { CAG } from '@/utils/messages-util';
import dateFormatter from '@/filters/date-formatter';

export default {
  name: 'QuantitativeStart',
  components: {
    StartScreen,
    RenameModal,
    EmptyStateInstructions
  },
  data: () => ({
    showRenameModal: false,
    selectedCard: null,
    recentCards: []
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    }),
    showEmptyStateInstructions() {
      return this.recentCards.length === 0;
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      API.get('models', {
        params: {
          project_id: this.project
        }
      }).then(result => {
        this.recentCards = result.data.map(model => ({
          id: model.id,
          previewImageSrc: model.thumbnail_source || null,
          title: model.name,
          subtitle: dateFormatter(new Date(model.modified_at), 'MMM DD, YYYY')
        }));
      });
    },
    onRecent(recentCard) {
      this.$router.push({
        name: 'quantitative',
        params: {
          project: this.project,
          currentCAG: recentCard.id
        }
      });
    },
    onRename(recentCard) {
      this.selectedCard = recentCard;
      this.openRenameModal();
    },
    onDuplicate(recentCard) {
      API.post(`cags/${recentCard.id}/`).then(() => this.refresh());
    },
    onDelete(recentCard) {
      API.delete(`cags/${recentCard.id}/`).then(result => {
        if (result.status === 200) {
          this.toaster(CAG.SUCCESSFUL_DELETION, 'success', false);
        } else {
          this.toaster(CAG.ERRONEOUS_DELETION, 'error', true);
        }
        this.refresh();
      });
    },
    openRenameModal() {
      this.showRenameModal = true;
    },
    closeRenameModal() {
      this.selectedCard = null;
      this.showRenameModal = false;
    },
    onRenameModalConfirm(newName) {
      if (newName !== null && newName !== this.selectedCard.title) {
        API.put(`cags/${this.selectedCard.id}/`, {
          name: newName
        }).then((result) => {
          if (result.status === 200) {
            this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
          } else {
            this.toaster(CAG.ERRONEOUS_RENAME, 'error', true);
          }

          this.refresh();
        });
      }

      this.closeRenameModal();
    }
  }
};
</script>

<style lang="scss" scoped>
.quantitative-start-container {
  position: relative;
}
</style>
