<template>
  <div class="data-explorer-container flex-col">
    <action-bar @cancel="onCancel" />
    <search class="flex-grow-1 h-0" />
  </div>
</template>

<script>
import Search from '@/components/data-explorer/search';
import ActionBar from '@/components/data-explorer/action-bar';


export default {
  name: 'DataExplorer',
  components: {
    Search,
    ActionBar
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
