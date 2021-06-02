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

<script lang="ts">
import { useStore } from 'vuex';
import { defineComponent, ref, computed } from 'vue';
import StartScreen from '@/components/start-screen.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import { CAG } from '@/utils/messages-util';
import dateFormatter from '@/formatters/date-formatter';
import modelService from '@/services/model-service';
import useToaster from '@/services/composables/useToaster';

interface RecentCard {
  id: string;
  previewImageSrc: string | null;
  title: string;
  subtitle: string;
}


export default defineComponent({
  name: 'QuantitativeStart',
  components: {
    StartScreen,
    RenameModal,
    EmptyStateInstructions
  },
  setup() {
    const store = useStore();
    const recentCards = ref([] as RecentCard[]);
    const selectedCard = ref({} as RecentCard);
    const showRenameModal = ref(false);

    const project = computed(() => store.getters['app/project']);
    const showEmptyStateInstructions = computed(() => {
      return recentCards.value.length === 0;
    });

    return {
      recentCards,
      selectedCard,
      showRenameModal,

      project,
      showEmptyStateInstructions,

      toaster: useToaster()
    };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      const result = await modelService.getProjectModels(this.project);
      this.recentCards = result.models.map(model => ({
        id: model.id,
        previewImageSrc: model.thumbnail_source || null,
        title: model.name,
        subtitle: dateFormatter(new Date(model.modified_at), 'MMM DD, YYYY')
      }));
    },
    onRecent(recentCard: RecentCard) {
      this.$router.push({
        name: 'quantitative',
        params: {
          project: this.project,
          currentCAG: recentCard.id
        }
      });
    },
    onRename(recentCard: RecentCard) {
      this.selectedCard = recentCard;
      this.openRenameModal();
    },
    onDuplicate(recentCard: RecentCard) {
      modelService.duplicateModel(recentCard.id).then(() => {
        this.toaster(CAG.SUCCESSFUL_DUPLICATE, 'success', false);
        this.refresh();
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DUPLICATE, 'error', true);
      });
    },
    onDelete(recentCard: RecentCard) {
      modelService.removeModel(recentCard.id).then(() => {
        this.toaster(CAG.SUCCESSFUL_DELETION, 'success', false);
        this.refresh();
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DELETION, 'error', true);
      });
    },
    openRenameModal() {
      this.showRenameModal = true;
    },
    closeRenameModal() {
      this.showRenameModal = false;
    },
    onRenameModalConfirm(newName: string) {
      if (newName !== null && newName !== this.selectedCard.title) {
        modelService.updateModelMetadata(this.selectedCard.id, { name: newName }).then(() => {
          this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
          this.refresh();
        });
      }
      this.closeRenameModal();
    }
  }
});
</script>

<style lang="scss" scoped>
.quantitative-start-container {
  position: relative;
}
</style>
