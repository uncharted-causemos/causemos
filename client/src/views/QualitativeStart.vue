<template>
  <div>
    <start-screen
      create-section-header="Create Causal Analysis Graph (CAG)"
      open-section-header="Recent Causal Analysis Graphs"
      :recent-cards="recentCards"
      @create="onCreateCAG"
      @open-recent="onRecent"
      @rename="onRename"
      @duplicate="onDuplicate"
      @delete="onDelete"
    />
    <rename-modal
      v-if="showRenameModal"
      :current-name="cardToRename.title"
      @confirm="onRenameModalConfirm"
      @cancel="onRenameModalClose"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';

import StartScreen from '@/components/start-screen';
import RenameModal from '@/components/action-bar/rename-modal';
import { CAG } from '@/utils/messages-util';
import dateFormatter from '@/formatters/date-formatter';
import modelService from '@/services/model-service';

export default {
  name: 'QualitativeStart',
  components: {
    StartScreen,
    RenameModal
  },
  data: () => ({
    cardToRename: {},
    recentCards: [],
    showRenameModal: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      updateToken: 'app/updateToken'
    })
  },
  watch: {
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setUpdateToken: 'app/setUpdateToken'
    }),
    async refresh() {
      const result = await modelService.getProjectModels(this.project);
      this.recentCards = result.models.map(cag => ({
        id: cag.id,
        previewImageSrc: cag.thumbnail_source || null,
        title: cag.name,
        subtitle: dateFormatter(cag.modified_at, 'MMM DD, YYYY')
      }));
    },
    onCreateCAG() {
      modelService.newModel(this.project, 'untitled').then(result => {
        this.$router.push({
          name: 'qualitative',
          params: {
            project: this.project,
            currentCAG: result.id
          }
        });
      });
    },
    onRecent(recentCard) {
      this.$router.push({
        name: 'qualitative',
        params: {
          project: this.project,
          currentCAG: recentCard.id
        }
      });
    },
    onRename(recentCard) {
      this.showRenameModal = true;
      this.cardToRename = recentCard;
    },
    onRenameModalConfirm(newCagNameInput) {
      if (newCagNameInput !== null && newCagNameInput !== this.cardToRename.title) {
        modelService.updateModelMetadata(this.cardToRename.id, { name: newCagNameInput }).then(r => {
          this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
          this.setUpdateToken(r.updateToken);
        });
      }
      this.onRenameModalClose();
    },
    onRenameModalClose() {
      this.showRenameModal = false;
    },
    onDuplicate(recentCard) {
      modelService.duplicateModel(recentCard.id).then(result => {
        this.toaster(CAG.SUCCESSFUL_DUPLICATE, 'success', false);
        this.setUpdateToken(result.updateToken);
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DUPLICATE, 'error', true);
      });
    },
    onDelete(recentCard) {
      modelService.removeModel(recentCard.id).then(result => {
        this.toaster(CAG.SUCCESSFUL_DELETION, 'success', false);
        this.setUpdateToken(result.updateToken);
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DELETION, 'error', true);
      });
    }
  }
};
</script>

<style lang="scss">
</style>
