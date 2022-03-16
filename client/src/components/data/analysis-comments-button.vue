<template>
  <comments-button-widget
    :comments="description"
    @update-comments="updateDescription"
  />
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import CommentsButtonWidget from '@/components/widgets/comments-button-widget.vue';
import { getAnalysis, updateAnalysis } from '@/services/analysis-service';
import useToaster from '@/services/composables/useToaster';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
export default defineComponent({
  components: { CommentsButtonWidget },
  name: 'AnalysisCommentsButton',
  setup() {
    const store = useStore();
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const description = ref<null | string>(null);
    const toast = useToaster();
    onMounted(async () => {
      const result = await getAnalysis(analysisId.value);
      if (result) {
        description.value = result.description;
      }
    });

    const updateDescription = async (commentsText: string) => {
      description.value = commentsText;
      try {
        await updateAnalysis(analysisId.value, { description: commentsText });
      } catch (e) {
        toast(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      }
    };

    return {
      description,
      updateDescription
    };
  }
});
</script>
