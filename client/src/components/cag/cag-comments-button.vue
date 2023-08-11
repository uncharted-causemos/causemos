<template>
  <comments-button-widget :comments="comments ?? undefined" @update-comments="updateComments" />
</template>

<script lang="ts">
import useToaster from '@/services/composables/useToaster';
import modelService from '@/services/model-service';
import { TYPE } from 'vue-toastification';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
import _ from 'lodash';
import { computed, defineComponent, ref, toRefs, watchEffect } from 'vue';
import { useStore } from 'vuex';
import CommentsButtonWidget from '../widgets/comments-button-widget.vue';

export default defineComponent({
  components: {
    CommentsButtonWidget,
  },
  name: 'QualitativeCommentsButton',
  props: {
    modelSummary: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const { modelSummary } = toRefs(props);
    const comments = ref<string | null>(null);
    const toast = useToaster();
    const store = useStore();
    const currentCAG = computed(() => store.getters['app/currentCAG']);

    watchEffect(() => {
      comments.value = _.get(modelSummary.value, 'description', null);
    });

    const updateComments = async (commentsText: string) => {
      comments.value = commentsText;
      modelService
        .updateModelMetadata(currentCAG.value, { description: commentsText })
        .catch(() => {
          toast(EXPORT_MESSAGES.COMMENT_NOT_SAVED, TYPE.INFO, true);
        });
    };

    return {
      comments,
      updateComments,
    };
  },
});
</script>
