<template>
  <div>
    <nav class="secondary-navbar action-bar">
      <ul class="nav navbar-nav">
        <!-- CAG rename/delete/duplicate dropdown -->
        <model-options
          :cag-name="cagNameToDisplay"
          :view-after-deletion="'quantitativeStart'"
          @rename="openRenameModal"
        />
      </ul>
    </nav>
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

import modelService from '@/services/model-service';
import RenameModal from '@/components/action-bar/rename-modal';
import ModelOptions from '@/components/action-bar/model-options';
import { CAG } from '@/utils/messages-util';
export default {
  name: 'QuantitativeModelOptions',
  components: {
    RenameModal,
    ModelOptions
  },
  data: () => ({
    showRenameModal: false,
    cagName: '',
    newCagName: ''
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG'
    }),
    cagNameToDisplay() {
      return !_.isEmpty(this.newCagName) ? this.newCagName : this.cagName;
    }
  },
  async mounted() {
    // Initialize name
    const data = await modelService.getComponents(this.currentCAG);
    this.cagName = data.name;
  },
  methods: {
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
    }
  }
};
</script>

<style lang="scss" scoped>

.action-bar {
  background-color: transparent;
  .nav-item {
    margin-left: 5px;
  }
}

</style>
