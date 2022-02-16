<template>
  <h5 v-if="title !== ''" class="title">{{title}}</h5>
  <input
    v-model="n"
    v-focus
    type="text"
    placeholder="name"
    rows="1"
    class="text-field"
    @keyup.enter="save"
  />
  <textarea
    v-model="d"
    type="text"
    placeholder="description"
    rows="5"
    class="text-field"
  />
  <ul class="unstyled-list">
    <button
      type="button"
      class="btn"
      style="width: 50%"
      @click.stop="cancel">
        Cancel
    </button>
    <button
      type="button"
      class="btn btn-primary btn-call-for-action"
      style="width: 50%"
      :disabled="n.length == 0"
      @click.stop="save">
        Save
    </button>
  </ul>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CAGScenarioForm',
  emits: ['save', 'cancel'],
  props: {
    title: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    }
  },
  data: () => ({
    n: '',
    d: ''
  }),
  mounted() {
    this.n = this.name;
    this.d = this.description;
  },
  methods: {
    save() {
      // emit an event to save (e.g., create a new scenario)
      this.$emit('save', {
        name: this.n,
        description: this.d
      });
    },
    cancel() {
      this.$emit('cancel');
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .text-field {
    margin-bottom: 1rem;
    border-color: gray;
    border-width: thin;
  }

  .unstyled-list {
    display: flex;
  }
</style>
