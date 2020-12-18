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

import API from '@/api/api';
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
    const data = (await this.getCAG()).data;
    this.cagName = data.name;
  },
  methods: {
    async getCAG() {
      return API.get(`cags/${this.currentCAG}/components`);
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
