<template>
  <div class="data-explorer-container flex-col">
    <modal-header
      :title="fullTitle"
      @close="onCancel" />
    <search class="flex-grow-1 h-0" />
  </div>
</template>

<script>
import Search from '@/components/data-explorer/search';

import ModalHeader from '../components/data-explorer/modal-header.vue';

export default {
  name: 'DataExplorer',
  components: {
    Search,
    ModalHeader
  },
  data: () => ({
    fullTitle: 'back to Data Space'
  }),
  created() {
    this.fullTitle = 'back to Data Space [' + this.$route.query.analysisName + ']';
  },
  methods: {
    onCancel() {
      this.$router.push({ name: 'data' });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.data-explorer-container {
  height: 100vh;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

</style>
