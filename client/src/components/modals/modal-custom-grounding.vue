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
            <h1>Add custom grounding</h1>
            <close-button
              v-if="showCloseButton"
              @click="close()"
            />
          </div>

          <div class="modal-body">
            <div class="row input-row">
              <label class="col-md-4">Theme</label>
              <input id="inputTheme" class="col-md-6" v-model="newTheme" type="text" placeholder="Type a theme"/>
            </div>
            <div class="row input-row">
              <label class="col-md-4">Theme property</label>
              <input id="inputThemeProperty" class="col-md-6" v-model="newThemeProperty" type="text" placeholder="Type the theme property (optional)"/>
            </div>
            <div class="row input-row">
              <label class="col-md-4">Process</label>
              <input id="inputProcess" class="col-md-6" v-model="newProcess" type="text" placeholder="Type a process (optional)"/>
            </div>
            <div class="row input-row">
              <label class="col-md-4">Process property</label>
              <input id="inputProcessProperty" class="col-md-6" v-model="newProcessProperty" type="text" placeholder="Type the process property (optional)"/>
            </div>
            <div class="row input-row" style="text-align: center">
              <button
                v-if="haveData"
                class="col-md-10"
                style="border: none; background-color: white"
                @click="$emit('addCustomGrounding', customGrounding)"
              >
                <span style="color: #255DCC">
                  <i class="fa fa-plus-circle fa-3x"></i>
                </span>
              </button>
            </div>
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
    CloseButton
  },
  props: {
    showCloseButton: {
      type: Boolean,
      default: true
    },
    useGreenHeader: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    newTheme: '',
    newThemeProperty: '',
    newProcess: '',
    newProcessProperty: ''
  }),
  computed: {
    haveData() {
      if (this.newTheme.length > 0) {
        return true;
      }
      return false;
    },
    customGrounding(): object {
      return {
        theme: this.newTheme,
        themeProperty: this.newThemeProperty,
        process: this.newProcess,
        processProperty: this.newProcessProperty
      };
    }
  },
  setup() {
    const hasContext = ref(false);
    const mouseTrap = new Mousetrap(document.body);
    return {
      hasContext,
      mouseTrap
    };
  },
  emits: [
    'close',
    'addCustomGrounding'
  ],
  mounted() {
    this.mouseTrap.bind('esc', this.close);
  },
  beforeUnmount() {
    if (this.mouseTrap) {
      this.mouseTrap.unbind('esc');
    }
  },
  methods: {
    clearData() {
      this.newTheme = this.newThemeProperty = this.newProcess = this.newProcessProperty = '';
    },
    close() {
      this.clearData();
      if (this.hasContext === true) {
        this.hasContext = false;
        return;
      }
      this.$emit('close', null);
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";
.input-row {
  margin: 10px;
  padding: 5px;
}

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

::v-deep(.modal-header) {
  position: relative;
  h3, h4 {
    color: #5A5A5A;
    @include header-secondary;
  }
  .close-button {
    top: 50%;
    transform: translateY(-50%);
    right: 10px;
  }

  &.modal-header-green {
    h3, h4 {
      color: #038537;
    }
  }

  .green-icon {
    color: #038537;
  }
}

::v-deep(.modal-body) {
  label {
    font-weight: 300;
  }
}

::v-deep(.modal-header, .modal-body, .modal-footer) {
  padding: 0 10px 10px;
  border: 0;
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
