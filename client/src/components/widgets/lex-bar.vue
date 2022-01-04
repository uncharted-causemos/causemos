<template>
  <div class="lex-bar-container">
    <div ref="lexContainer" />
    <button class="btn btn-default clear-button" @click="clearSearch()">
      <i class="fa fa-remove" />{{ isCloseButtonLabelVisible ? 'Clear' : '' }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref, toRefs } from 'vue';
export default defineComponent({
  name: 'LexBar',
  props: {
    // TODO: can this type be more specific?
    // TODO: is it required?
    lexRef: {
      type: Object as PropType<{
        render: (element: HTMLElement) => void;
        reset: () => void;
      } | null>,
      default: null
    },
    isCloseButtonLabelVisible: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const { lexRef } = toRefs(props);

    const lexContainer = ref<HTMLElement | null>(null);

    onMounted(() => {
      if (lexRef.value === null || lexContainer.value === null) return;
      lexRef.value.render(lexContainer.value);
    });

    const clearSearch = () => {
      if (lexRef.value === null) return;
      lexRef.value.reset();
    };

    return {
      clearSearch
    };
  }
});
</script>

<style lang="scss" scoped>
.lex-bar-container :deep {
  @import '@/styles/lex-overrides';

  display: flex;

  & > div {
    flex: 1;
    min-width: 0;
  }

  .clear-button {
    flex: 0;
    padding: 5px;
  }
}
</style>
