<template>
  <modal
    :show-close-button="true"
    @close="search()">
    <template #header>
      <h4>
        <i
          class="fa fa-fw fa-check-circle green-icon"
          aria-hidden="true" /> Successfully Added to CAG
      </h4>
    </template>
    <template #body>
      {{ numberOfRelationsAdded }} causal relation{{ numberOfRelationsAdded === 1 ? ' was' : 's were' }} added to your CAG
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <li class="first-button">
          <button
            type="button"
            class="btn"
            @click.stop="search()">Continue Searching
          </button>
        </li>
        <li>
          <button
            type="button"
            class="btn btn-call-to-action"
            @click.stop="close()">View CAG
          </button>
        </li>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import Modal from '@/components/modals/modal.vue';

export default defineComponent({
  name: 'ModalAddedToCag',
  components: {
    Modal
  },
  emits: ['search', 'close'],
  props: {
    numberOfRelationsAdded: {
      type: Number,
      default: 0
    }
  },
  methods: {
    search() {
      this.$emit('search', null);
    },
    close() {
      this.$emit('close', null);
    }
  }
});
</script>

<style lang="scss" scoped>

.first-button {
  margin-right: 10px;
}
</style>
