<template>
  <div class="alert" :class="alertType" role="alert">
    <div class="message-container">
      <i class="fa" :class="messageIcon" aria-hidden="true" />
      <highlight-text :text="message" :highlights="highlights" />
      <span v-if="dismissable" class="message-close" @click="dismiss()">
        <i class="fa fa-fw fa-close" />
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
/**
 * A simple wrapper to display messages
 */
import HighlightText from '@/components/widgets/highlight-text.vue';
export default defineComponent({
  name: 'MessageDisplay',
  components: {
    HighlightText,
  },
  props: {
    message: {
      type: String,
      default: '',
    },
    messageType: {
      type: String,
      default: 'info',
    },
    dismissable: {
      type: Boolean,
      default: false,
    },
    highlights: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    messageIcon: function () {
      if (this.messageType === 'warning') {
        return 'fa-exclamation-triangle';
      }
      return 'fa-info-circle';
    },
    alertType: function () {
      if (this.messageType === 'warning') {
        return 'alert-warning';
      } else if (this.messageType === 'primary') {
        return 'alert-primary';
      }
      return 'alert-info';
    },
  },
  methods: {
    dismiss() {
      this.$emit('dismiss');
    },
  },
});
</script>

<style lang="scss" scoped>
.alert {
  margin-bottom: 0px;
}

.alert-primary {
  color: #004085;
  background-color: #cce5ff;
  border-color: #b8daff;
}

.alert-info {
  background-color: #f0f0f0;
  font-style: italic;
  margin-top: 10px;
}

.message-container {
  display: flex;
  align-items: center;
  .fa {
    padding-right: 5px;
  }
  :deep(.highlight) {
    font-weight: 800;
  }
}

.message-close {
  cursor: pointer;
}
</style>
