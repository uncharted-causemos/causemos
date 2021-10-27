<template>
  <comments-button :comments="comments" @update-comments="updateComments" />
</template>

<script lang="ts">
import useToaster from '@/services/composables/useToaster';
import modelService from '@/services/model-service';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
import _ from 'lodash';
import { computed, defineComponent, ref, toRefs, watchEffect } from 'vue';
import { useStore } from 'vuex';
import CommentsButton from '../widgets/comments-button.vue';
export default defineComponent({
  components: {
    CommentsButton
  },
  name: 'QualitativeCommentsButton',
  props: {
    modelSummary: {
      type: Object,
      default: null
    }
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
          toast(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
        });
    };

    return {
      comments,
      updateComments
    };
  }
});
</script>

<style lang="scss" scoped></style>
