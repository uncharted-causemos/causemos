<template>
  <modal
    :show-close-button="true"
    :use-green-header="true"
    @close="search()">
    <template #header>
      <h4>
        <i
          class="fa fa-fw fa-check-circle green-icon"
          aria-hidden="true" />
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
            class="btn btn-primary btn-call-for-action"
            @click.stop="close()">View CAG
          </button>
        </li>
      </ul>
    </template>
  </modal>
</template>

<script>

import Modal from '@/components/modals/modal';

export default {
  name: 'ModalAddedToCag',
  components: {
    Modal
  },
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
};
</script>

<style lang="scss" scoped>

.first-button {
  margin-right: 10px;
}
</style>
