<template>
  <ul class="unstyled-list model-options-container">
    <!-- CAG rename/delete/duplicate dropdown -->
    <model-options
      :cag-name="cagNameToDisplay"
      :view-after-deletion="'overview'"
      @rename="openRenameModal"
      @duplicate="openDuplicateModal"
    />
    <rename-modal
      v-if="showRenameModal"
      :current-name="cagNameToDisplay"
      @confirm="onRenameModalConfirm"
      @cancel="closeRenameModal"
    />
    <duplicate-modal
      v-if="showDuplicateModal"
      :current-name="cagNameToDisplay"
      :id-to-duplicate="currentCAG"
      @success="onDuplicateSuccess"
      @fail="closeDuplicateModal"
      @cancel="closeDuplicateModal"
    />
  </ul>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, computed } from 'vue';
import { useStore } from 'vuex';
import modelService from '@/services/model-service';
import DuplicateModal from '@/components/action-bar/duplicate-modal.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import ModelOptions from '@/components/action-bar/model-options.vue';
import { CAG } from '@/utils/messages-util';
import useToaster from '@/services/composables/useToaster';
import { ProjectType } from '@/types/Enums';

export default defineComponent({
  name: 'QuantitativeModelOptions',
  components: {
    RenameModal,
    ModelOptions,
    DuplicateModal
  },
  setup() {
    const store = useStore();
    const showRenameModal = ref(false);
    const showDuplicateModal = ref(false);
    const cagName = ref('');
    const newCagName = ref('');

    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const cagNameToDisplay = computed(() => !_.isEmpty(newCagName.value) ? newCagName.value : cagName.value);
    const project = computed(() => store.getters['app/project']);

    return {
      showDuplicateModal,
      showRenameModal,
      cagName,
      newCagName,
      currentCAG,
      cagNameToDisplay,
      project,

      toaster: useToaster()
    };
  },
  async mounted() {
    // Initialize name
    const data = await modelService.getComponents(this.currentCAG);
    this.cagName = data.name;
  },
  methods: {
    onRenameModalConfirm(newCagNameInput: string) {
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
    onDuplicateSuccess(name: string, id: string) {
      this.newCagName = name;
      this.closeDuplicateModal();
      this.$router.push({
        name: 'quantitative',
        params: {
          project: this.project,
          currentCAG: id,
          projectType: ProjectType.Analysis
        }
      });
    },
    openDuplicateModal() {
      this.showDuplicateModal = true;
    },
    closeDuplicateModal() {
      this.showDuplicateModal = false;
    },
    openRenameModal() {
      this.showRenameModal = true;
    },
    closeRenameModal() {
      this.showRenameModal = false;
    }
  }
});
</script>

<style lang="scss" scoped>

.model-options-container {
  margin-left: 5px;
}

</style>
