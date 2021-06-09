<template>
  <ul class="unstyled-list model-options-container">
    <!-- CAG rename/delete/duplicate dropdown -->
    <model-options
      :cag-name="cagNameToDisplay"
      :view-after-deletion="'quantitativeStart'"
      @rename="openRenameModal"
    />
    <rename-modal
      v-if="showRenameModal"
      :current-name="cagNameToDisplay"
      @confirm="onRenameModalConfirm"
      @cancel="closeRenameModal"
    />
  </ul>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, computed } from 'vue';
import { useStore } from 'vuex';
import modelService from '@/services/model-service';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import ModelOptions from '@/components/action-bar/model-options.vue';
import { CAG } from '@/utils/messages-util';
import useToaster from '@/services/composables/useToaster';

export default defineComponent({
  name: 'QuantitativeModelOptions',
  components: {
    RenameModal,
    ModelOptions
  },
  setup() {
    const store = useStore();
    const showRenameModal = ref(false);
    const cagName = ref('');
    const newCagName = ref('');

    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const cagNameToDisplay = computed(() => !_.isEmpty(newCagName.value) ? newCagName.value : cagName.value);

    return {
      showRenameModal,
      cagName,
      newCagName,
      currentCAG,
      cagNameToDisplay,

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
