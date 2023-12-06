<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper" @click.stop="sticky ? {} : close()">
        <!--
          click.stop is needed in modal-container so the event doesn't
          bubble up which triggers the close mechanism
        -->
        <div
          class="modal-container"
          @mousedown="hasContext = true"
          @mouseup="hasContext = false"
          @click.stop=""
        >
          <div class="modal-header">
            <slot name="header" />
            <close-button v-if="showCloseButton" @click="close()" />
          </div>

          <div ref="modalBody" class="modal-body">
            <slot name="body" />
          </div>

          <div class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
/**
 * Simple modal wrapper
 */
import { defineComponent, ref } from 'vue';
import Mousetrap from 'mousetrap';
import CloseButton from '@/components/widgets/close-button.vue';

export default defineComponent({
  name: 'Modal',
  components: {
    CloseButton,
  },
  props: {
    showCloseButton: {
      type: Boolean,
      default: false,
    },
    sticky: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    const hasContext = ref(false);
    const mouseTrap = new Mousetrap(document.body);
    return {
      hasContext,
      mouseTrap,
    };
  },
  emits: ['close'],
  mounted() {
    this.mouseTrap.bind('esc', this.close);
  },
  beforeUnmount() {
    if (this.mouseTrap) {
      this.mouseTrap.unbind('esc');
    }
  },
  methods: {
    close() {
      if (this.hasContext === true) {
        this.hasContext = false;
        return;
      }
      this.$emit('close', null);
    },
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: table;
  transition: opacity 0.3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  position: relative;
  width: 500px;
  margin: 0 auto;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  transition: all 0.3s ease;
}

.modal-header {
  padding: 40px;
}

.modal-body {
  padding: 40px;
  padding-top: 0;
}

:deep(.modal-footer) {
  padding: 20px 40px;
  text-align: right;
  border-top: 1px solid #e3e3e3;

  .btn + .btn {
    margin-left: 5px;
  }
}

:deep(.modal-header) {
  position: relative;
}

:deep(.modal-body) {
  label {
    font-weight: 300;
  }
}

/*
 * The following styles are auto-applied to elements with
 * transition="modal" when their visibility is toggled
 * by Vue.js.
 *
 * You can easily play with the modal transition by editing
 * these styles.
 */

.modal-enter-from {
  opacity: 0;
}

.modal-leave-active {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
