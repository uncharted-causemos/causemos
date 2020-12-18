<template>
  <dropdown-control
    class="unknown-bulk-dropdown"
    :class="{ 'confirmation-mode': showConfirmationMode, 'non-confirmation-mode': !showConfirmationMode}"
  >
    <div slot="content">
      <span class="dropdown-title">Fix unknown polarities</span><br>
      <div
        class="dropdown-option"
        @click.stop="select('ALL')">
        <i
          class="fa fa-check"
          :style="selectedOption('ALL')" />
        Set all
        <i class="fa fa-question" />
        to
        <i class="fa fa-arrow-up" />
      </div>
      <div
        class="dropdown-option"
        @click.stop="select('SUBJ')">
        <i
          class="fa fa-check"
          :style="selectedOption('SUBJ')" />
        Set subject
        <i class="fa fa-question" />
        to
        <i class="fa fa-arrow-up" />
      </div>
    </div>
    <div
      v-if="showConfirmationMode"
      slot="footer">
      <div
        class="alert alert-info"
        role="alert">
        {{ UNKNOWN_POLARITY_BULK_MESSAGE.NOTE }}
      </div>
      <div
        class="alert alert-warning"
        role="alert">
        {{ UNKNOWN_POLARITY_BULK_MESSAGE.WARNING }}
      </div>
      <div
        v-if="noSelectionMessage"
        class="selection-message">
        *No option selected
      </div>
      <div>
        <button
          type="button"
          class="btn btn-light"
          @click="cancelUpdate"
        >
          Cancel</button>
        <button
          type="button"
          class="btn btn-primary"
          @click.stop.prevent="confirmUpdate(selected)"
        >Confirm</button>
      </div>
    </div>
  </dropdown-control>
</template>

<script>
import _ from 'lodash';

import DropdownControl from '@/components/dropdown-control';
import messagesUtil from '@/utils/messages-util';

export default {
  name: 'UnknownPolarityEditor',
  components: {
    DropdownControl
  },
  props: {
    showConfirmationMode: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    selected: '',
    noSelectionMessage: false,
    UNKNOWN_POLARITY_BULK_MESSAGE: messagesUtil.UNKNOWN_POLARITY_BULK_MESSAGE
  }),
  methods: {
    select(type) {
      this.selected = type;
      this.noSelectionMessage = false;
      this.$emit('select', type);
    },
    close() {
      this.$emit('close');
    },
    selectedOption(index) {
      if (index === this.selected) {
        return {
          opacity: '1'
        };
      } else {
        return {
          opacity: '0.1'
        };
      }
    },
    confirmUpdate(selected) {
      if (_.isEmpty(selected)) {
        this.noSelectionMessage = true;
      }
      this.$emit('confirmUpdate', selected);
    },
    cancelUpdate() {
      this.$emit('cancelUpdate');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";

.unknown-bulk-dropdown{
  position:absolute;
}
.confirmation-mode {
  width: 30%;
}
.non-confirmation-mode {
  top: 19px;
  width: 190px;
}

.selection-message {
  color: $state-danger-text
}
</style>
