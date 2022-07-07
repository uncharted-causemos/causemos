<template>
  <full-screen-modal-header
    icon="angle-left"
    :nav-back-label="navBackLabel"
    @close="onBack"
  >
    <button
      v-tooltip.top-center="selectLabel"
      type="button"
      class="btn btn-call-to-action"
      :disabled="selectedSearchItems.length < 1"
      @click="onSelection"
    >
      <i class="fa fa-fw fa-plus-circle" />
      {{selectLabel}}
    </button>
    <span>
      <span class="selected">{{ selectedSearchItems.length }} selected</span>
    </span>
  </full-screen-modal-header>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import FullScreenModalHeader from '../widgets/full-screen-modal-header.vue';

export default defineComponent({
  name: 'DataExplorerModalHeader',
  components: {
    FullScreenModalHeader
  },
  props: {
    selectLabel: {
      type: String,
      default: 'Add'
    },
    navBackLabel: {
      type: String,
      default: ''
    },
    showNamingModal: {
      type: Boolean,
      default: false
    },
    selectedSearchItems: {
      type: Array,
      required: true
    }
  },
  emits: ['close', 'selection'],
  methods: {
    onSelection() {
      this.$emit('selection');
    },
    onBack() {
      this.$emit('close');
    }
  }
});
</script>

<style lang="scss" scoped>

.selected {
  font-weight: bold;
  margin-left: 5px;
}

</style>
