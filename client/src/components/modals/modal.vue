<template>
  <transition name="modal">
    <div class="modal-mask">
      <div
        class="modal-wrapper"
        @click.stop="close()">
        <div
          class="modal-container"
          @mousedown="hasContext = true"
          @mouseup="hasContext = false"
          @click.stop=""
        >

          <div
            class="modal-header"
            :class="{ 'modal-header-green': useGreenHeader }"
          >
            <slot name="header" />
            <close-button
              v-if="showCloseButton"
              @click="close()"
            />
          </div>

          <div class="modal-body">
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

<script>
/**
 * Simple modal wrapper
*/
import Mousetrap from 'mousetrap';
import CloseButton from '@/components/widgets/close-button';

export default {
  name: 'Modal',
  components: {
    CloseButton
  },
  props: {
    showCloseButton: {
      type: Boolean,
      default: false
    },
    useGreenHeader: {
      type: Boolean,
      default: false
    }
  },
  created() {
    this.hasContext = false;
  },
  mounted() {
    this.mouseTrap = new Mousetrap(document);
    this.mouseTrap.bind('esc', this.close);
  },
  beforeDestroy() {
    if (this.mouseTrap) {
      this.mouseTrap.unbind('esc');
      this.mouseTrap = null;
    }
  },
  methods: {
    close() {
      if (this.hasContext === true) {
        this.hasContext = false;
        return;
      }
      this.$emit('close', null);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, .5);
  display: table;
  transition: opacity .3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  position: relative;
  width: 500px;
  margin: 0px auto;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
  transition: all .3s ease;
}

/deep/ .modal-header {
  position: relative;
  h3, h4 {
    margin: 10px;
  }
  .close-button {
    top: 50%;
    transform: translateY(-50%);
    right: 10px;
  }

  &.modal-header-green {
    background: #E1FAEB;
  }

  .green-icon {
    color: #038537;
  }
}

/deep/ .modal-header, .modal-body, .modal-footer {
  padding: 10px;
}

/*
 * The following styles are auto-applied to elements with
 * transition="modal" when their visibility is toggled
 * by Vue.js.
 *
 * You can easily play with the modal transition by editing
 * these styles.
 */

.modal-enter {
  opacity: 0;
}

.modal-leave-active {
  opacity: 0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}

</style>
