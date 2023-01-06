<template>
  <dropdown-control
    class="unknown-bulk-dropdown"
    :class="{
      'confirmation-mode': showConfirmationMode,
      'non-confirmation-mode': !showConfirmationMode,
    }"
  >
    <template #content>
      <span class="dropdown-title">Fix unknown polarities</span><br />
      <div class="dropdown-option" @click.stop="select('ALL')">
        <i class="fa fa-check" :style="selectedOption('ALL')" />
        Set all
        <i class="fa fa-question" />
        to
        <i class="fa fa-arrow-up" />
      </div>
      <div class="dropdown-option" @click.stop="select('SUBJ')">
        <i class="fa fa-check" :style="selectedOption('SUBJ')" />
        Set subject
        <i class="fa fa-question" />
        to
        <i class="fa fa-arrow-up" />
      </div>
    </template>
    <template v-if="showConfirmationMode" #footer>
      <div class="alert alert-info" role="alert">
        {{ UNKNOWN_POLARITY_BULK_MESSAGE.NOTE }}
      </div>
      <div class="alert alert-warning" role="alert">
        {{ UNKNOWN_POLARITY_BULK_MESSAGE.WARNING }}
      </div>
      <div v-if="noSelectionMessage" class="selection-message">*No option selected</div>
      <div>
        <button type="button" class="btn btn-light" @click="cancelUpdate">Cancel</button>
        <button type="button" class="btn btn-primary" @click.stop.prevent="confirmUpdate(selected)">
          Confirm
        </button>
      </div>
    </template>
  </dropdown-control>
</template>

<script lang="ts">
import _ from 'lodash';

import DropdownControl from '@/components/dropdown-control.vue';
import messagesUtil from '@/utils/messages-util';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'UnknownPolarityEditor',
  components: {
    DropdownControl,
  },
  props: {
    showConfirmationMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select', 'close', 'confirmUpdate', 'cancelUpdate'],
  data: () => ({
    selected: '',
    noSelectionMessage: false,
    UNKNOWN_POLARITY_BULK_MESSAGE: messagesUtil.UNKNOWN_POLARITY_BULK_MESSAGE,
  }),
  methods: {
    select(type: string) {
      this.selected = type;
      this.noSelectionMessage = false;
      this.$emit('select', type);
    },
    close() {
      this.$emit('close');
    },
    selectedOption(index: string) {
      if (index === this.selected) {
        return {
          opacity: '1',
        };
      } else {
        return {
          opacity: '0.1',
        };
      }
    },
    confirmUpdate(selected: string) {
      if (_.isEmpty(selected)) {
        this.noSelectionMessage = true;
      }
      this.$emit('confirmUpdate', selected);
    },
    cancelUpdate() {
      this.$emit('cancelUpdate');
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.unknown-bulk-dropdown {
  position: absolute;
}
.confirmation-mode {
  width: 30%;
}
.non-confirmation-mode {
  top: 19px;
  width: 190px;
}

.selection-message {
  color: $negative;
}

.alert {
  margin-bottom: 0px;
}

.alert-info {
  background-color: #f0f0f0;
  font-style: italic;
  margin-top: 10px;
}
</style>
