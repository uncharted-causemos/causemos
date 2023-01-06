<template>
  <div class="statements-columns-selector-container">
    <div v-for="(col, idx) of columns" :key="col.id" class="column-selector">
      <span @click.stop="toggleColumn(idx)">
        <i v-if="col.visible" class="fa fa-check-square-o fa-fw" />
        <i v-if="!col.visible" class="fa fa-square-o fa-fw" />
        {{ getDisplayName(col.id) }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';
import codeUtil from '@/utils/code-util';

export default defineComponent({
  name: 'StatementsColumnsSelector',
  computed: {
    ...mapGetters({
      columns: 'statements/columns',
    }),
  },
  methods: {
    ...mapActions({
      toggleColumn: 'statements/toggleColumn',
    }),
    getDisplayName(field: string) {
      const config = Object.values(codeUtil.CODE_TABLE).find((d) => {
        return d.field === field;
      });
      if (config) {
        return config.display;
      }
      return '???';
    },
  },
});
</script>

<style lang="scss">
@import '~styles/variables';

.statements-columns-selector-container {
  position: absolute;
  display: block;
  width: 200px;
  background: $background-light-1;
  box-sizing: border-box;
  opacity: 1;
  z-index: 20;
  border-radius: 4px;
  box-shadow: 0 -1px 0 #e5e5e5, 0 0 2px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.24);
  padding: 5px;
  color: $text-color-dark;

  .column-selector {
    padding: 5px 0;
  }
}
</style>
