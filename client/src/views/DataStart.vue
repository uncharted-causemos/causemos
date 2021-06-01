<template>
  <div>
    <start-screen
      create-section-header="Create new Analysis"
      open-section-header="Recent Analyses"
      :recent-cards="recentCards"
      @create="onCreate"
      @open-recent="onRecent"
      @rename="onRename"
      @duplicate="onDuplicate"
      @delete="onDelete"
    />
    <rename-modal
      v-if="showRenameModal"
      :modal-title="'Rename Analysis'"
      :current-name="selectedCardToRename.title"
      @confirm="onRenameModalConfirm"
      @cancel="onRenameModalClose"
    />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { getAnalysesByProjectId, createAnalysis, duplicateAnalysis, deleteAnalysis, updateAnalysis } from '@/services/analysis-service';
import dateFormatter from '@/formatters/date-formatter';
import { ANALYSIS } from '@/utils/messages-util';
import RenameModal from '@/components/action-bar/rename-modal';
import StartScreen from '@/components/start-screen';
import MAXHOP from '@/assets/MAXHOP.js';

const toCardData = analysis => ({
  analysisId: analysis.id,
  previewImageSrc: analysis.thumbnail_source || null,
  title: analysis.title,
  subtitle: dateFormatter(analysis.modified_at, 'MMM DD, YYYY')
});
export default {
  name: 'DataStart',
  components: {
    StartScreen,
    RenameModal
  },
  data: () => ({
    recentCards: [],
    showRenameModal: false,
    selectedCardToRename: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  mounted() {
    this.fetchRecentCards();
  },
  methods: {
    ...mapActions({
      updateAnalysisItemsNew: 'dataAnalysis/updateAnalysisItemsNew'
    }),
    async fetchRecentCards() {
      this.recentCards = (await getAnalysesByProjectId(this.project)).map(toCardData);
    },
    async onCreate() {
      const analysis = await createAnalysis({
        title: `untitled at ${dateFormatter(Date.now())}`,
        projectId: this.project
      });
      // save the "selected" datacube (model or indicator) id in the store as an analysis item
      // @HACK: this function not only saves the analysisItem
      //  but also mark the state with the current analysisId so that immediate state updates by the route are ignored
      await this.updateAnalysisItemsNew({ currentAnalysisId: analysis.id, datacubeIDs: [MAXHOP.modelId] });
      this.$router.push({
        name: 'data',
        params: {
          collection: this.project,
          analysisID: analysis.id
        }
      });
    },
    onRecent(recentCard) {
      this.$router.push({
        name: 'data',
        params: {
          collection: this.project,
          analysisID: recentCard.analysisId
        }
      });
    },
    onRename(recentCard) {
      this.showRenameModal = true;
      this.selectedCardToRename = recentCard;
    },
    async onRenameModalConfirm(newName) {
      const analysisId = this.selectedCardToRename && this.selectedCardToRename.analysisId;
      const oldName = this.selectedCardToRename && this.selectedCardToRename.title;
      if (analysisId && oldName !== newName) {
        try {
          const updated = await updateAnalysis(analysisId, { title: newName });
          Object.assign(this.selectedCardToRename, toCardData(updated));
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
    async onDuplicate(recentCard) {
      try {
        const copy = await duplicateAnalysis(recentCard.analysisId);
        this.recentCards.unshift(toCardData(copy));
        this.toaster(ANALYSIS.SUCCESSFUL_DUPLICATE, 'success', false);
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_DUPLICATE, 'error', true);
      }
    },
    async onDelete(recentCard) {
      try {
        await deleteAnalysis(recentCard.analysisId);
        this.recentCards = this.recentCards.filter(item => item.analysisId !== recentCard.analysisId);
        this.toaster(ANALYSIS.SUCCESSFUL_DELETION, 'success', false);
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_DELETION, 'error', true);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
