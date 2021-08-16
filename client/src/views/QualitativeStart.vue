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
      :current-name="selectedCard.title"
      @confirm="onRenameModalConfirm"
      @cancel="onRenameModalClose"
    />
    <duplicate-modal
      v-if="showDuplicateModal"
      :current-name="selectedCard.title"
      :id-to-duplicate="selectedCard.id"
      @success="onDuplicateSuccess"
      @fail="closeDuplicateModal"
      @cancel="closeDuplicateModal"
    />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import { defineComponent, ref } from 'vue';

import StartScreen from '@/components/start-screen.vue';
import DuplicateModal from '@/components/action-bar/duplicate-modal.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import { CAG } from '@/utils/messages-util';
import dateFormatter from '@/formatters/date-formatter';
import modelService from '@/services/model-service';
import useToaster from '@/services/composables/useToaster';
import { ProjectType } from '@/types/Enums';

interface RecentCard {
  id: string;
  previewImageSrc: string | null;
  title: string;
  subtitle: string;
}

export default defineComponent({
  name: 'QualitativeStart',
  components: {
    StartScreen,
    RenameModal,
    DuplicateModal
  },
  setup() {
    const recentCards = ref([] as RecentCard[]);
    const selectedCard = ref({} as RecentCard);
    const showRenameModal = ref(false);
    const showDuplicateModal = ref(false);

    return {
      recentCards,
      selectedCard,
      showRenameModal,
      showDuplicateModal,

      toaster: useToaster()
    };
  },
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
        previewImageSrc: cag.thumbnail_source ?? null,
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
            currentCAG: result.id,
            projectType: ProjectType.Analysis
          }
        });
      });
    },
    onRecent(recentCard: RecentCard) {
      this.$router.push({
        name: 'qualitative',
        params: {
          project: this.project,
          currentCAG: recentCard.id,
          projectType: ProjectType.Analysis
        }
      });
    },
    onRename(recentCard: RecentCard) {
      this.showRenameModal = true;
      this.selectedCard = recentCard;
    },
    onRenameModalConfirm(newCagNameInput: string) {
      if (newCagNameInput !== null && newCagNameInput !== this.selectedCard.title) {
        modelService.updateModelMetadata(this.selectedCard.id, { name: newCagNameInput }).then(r => {
          this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
          this.setUpdateToken(r.updateToken);
        });
      }
      this.onRenameModalClose();
    },
    onRenameModalClose() {
      this.showRenameModal = false;
    },
    onDuplicate(recentCard: RecentCard) {
      this.selectedCard = recentCard;
      this.openDuplicateModal();
    },
    onDelete(recentCard: RecentCard) {
      modelService.removeModel(recentCard.id).then(result => {
        this.toaster(CAG.SUCCESSFUL_DELETION, 'success', false);
        this.setUpdateToken(result.updateToken);
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DELETION, 'error', true);
      });
    },
    onDuplicateSuccess() {
      this.refresh();
      this.closeDuplicateModal();
    },
    openDuplicateModal() {
      this.showDuplicateModal = true;
    },
    closeDuplicateModal() {
      this.showDuplicateModal = false;
    }
  }
});
</script>

<style lang="scss">
</style>
