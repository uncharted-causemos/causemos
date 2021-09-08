<template>
  <div class="comments-button-container">
    <button
      v-tooltip.top-center="'Comments'"
      type="button"
      class="btn btn-default"
      @click="toggleIsOpen"
    >
      <i
        class="fa fa-fw"
        :class="{
          'fa-commenting': description !== '',
          'fa-commenting-o': description === ''
        }"
      />
    </button>
    <text-area-card
      v-if="isOpen"
      class="comment-box"
      :title="'Comments'"
      :initial-text="description"
      @close="isOpen = false"
      @saveText="updateComments"
    />
  </div>
</template>

<script lang="ts">
import { getAnalysis, updateAnalysis } from '@/services/analysis-service';
import useToaster from '@/services/composables/useToaster';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
import { computed, defineComponent, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import textAreaCard from '@/components/cards/text-area-card.vue';
export default defineComponent({
  components: { textAreaCard },
  name: 'CommentsButton',
  setup() {
    const store = useStore();
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const isOpen = ref(false);
    const description = ref('');
    const toast = useToaster();

    onMounted(async () => {
      const result = await getAnalysis(analysisId.value);
      description.value = result.description;
    });

    const updateComments = async (commentsText: string) => {
      description.value = commentsText;
      try {
        await updateAnalysis(analysisId.value, { description: commentsText });
      } catch (e) {
        toast(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      }
    };

    return {
      isOpen,
      toggleIsOpen: () => {
        isOpen.value = !isOpen.value;
      },
      updateComments,
      description
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

$leftMargin: 5px;
$diameter: #{$navbar-outer-height - $leftMargin};

.comments-button-container {
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
