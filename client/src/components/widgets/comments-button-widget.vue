<template>
  <div class="comments-button-widget-container">
    <button v-tooltip.top-center="'Comments'" type="button" class="btn" @click="toggleIsOpen">
      <i
        class="fa fa-fw"
        :class="{
          'fa-commenting': comments !== '',
          'fa-commenting-o': comments === '',
        }"
      />
    </button>
    <text-area-card
      v-if="isOpen"
      class="comment-box"
      :title="'Comments'"
      :initial-text="comments"
      @close="isOpen = false"
      @saveText="updateComments"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import textAreaCard from '@/components/cards/text-area-card.vue';

export default defineComponent({
  components: { textAreaCard },
  name: 'CommentsButtonWidget',
  props: {
    comments: {
      type: String,
      default: '',
    },
  },
  emits: ['update-comments'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    return {
      isOpen,
      toggleIsOpen: () => {
        isOpen.value = !isOpen.value;
      },
      updateComments: (newComments: string) => {
        emit('update-comments', newComments);
      },
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

$leftMargin: 5px;
$diameter: #{$navbar-outer-height - $leftMargin};

.comments-button-widget-container {
  isolation: isolate;
  position: relative;
  z-index: 1;
}

i {
  margin-right: 0;
}

button {
  width: $diameter;
  height: $diameter;
  border-radius: 50%;
  margin-left: $leftMargin;
  padding: 0;
}

.comment-box {
  position: absolute;
  left: 50%;
  top: calc(100% + 5px);
  width: 25vw;
}
</style>
