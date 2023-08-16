<template>
  <comments-button-widget
    :comments="description ?? undefined"
    @update-comments="updateDescription"
  />
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, toRefs } from 'vue';
import CommentsButtonWidget from '@/components/widgets/comments-button-widget.vue';
import { getAnalysis, updateAnalysis } from '@/services/analysis-service';
import useToaster from '@/services/composables/useToaster';
import { TYPE } from 'vue-toastification';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
export default defineComponent({
  components: { CommentsButtonWidget },
  name: 'AnalysisCommentsButton',
  props: {
    analysisId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { analysisId } = toRefs(props);
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
        toast(EXPORT_MESSAGES.COMMENT_NOT_SAVED, TYPE.INFO, true);
      }
    };

    return {
      description,
      updateDescription,
    };
  },
});
</script>
