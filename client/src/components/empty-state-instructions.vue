<template>
  <figure class="empty-state-instructions-container">
    <img
      v-if="currentView === 'data' || currentView === 'dataComparative'"
      src="../assets/empty-state-instructions/data-empty-state.png"
      alt="Data search instructions"
    />
    <img
      v-else-if="currentView === 'qualitative'"
      src="../assets/empty-state-instructions/knowledge-empty-state.png"
      alt="CAG creation instructions"
    />
    <img
      v-else-if="currentView === 'overview'"
      src="../assets/empty-state-instructions/analysis-project-empty-state.png"
      alt="This project has no content yet."
    />
    <img
      v-else
      src="../assets/empty-state-instructions/models-empty-state.png"
      alt="Model creation instructions"
    />
  </figure>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapGetters } from 'vuex';
export default defineComponent({
  name: 'EmptyStateInstructions',
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
    }),
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.empty-state-instructions-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66%;
  height: 100%;
  padding: $navbar-outer-height;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  overflow: hidden;
  pointer-events: none;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
