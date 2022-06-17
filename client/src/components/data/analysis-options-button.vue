<template>
  <analysis-options-button-widget
    :initial-name="analysisName"
    @rename="onRenameAnalysis"
    @duplicate="onDuplicate"
    @delete="onDeleteAnalysis"
  />
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';
import { deleteAnalysis, updateAnalysis, duplicateAnalysis } from '@/services/analysis-service';
import { useStore } from 'vuex';
import useToaster from '@/services/composables/useToaster';
import { ANALYSIS } from '@/utils/messages-util';
import router from '@/router';
import { ProjectType } from '@/types/Enums';
import AnalysisOptionsButtonWidget from '@/components/widgets/analysis-options-button-widget.vue';

export default defineComponent({
  components: { AnalysisOptionsButtonWidget },
  name: 'AnalysisOptionsButton',
  props: {
    analysisId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const {
      analysisId
    } = toRefs(props);
    const toast = useToaster();
    const store = useStore();
    const analysisName = computed(() => store.getters['app/analysisName']);
    const project = computed(() => store.getters['app/project']);

    const onRenameAnalysis = async (newName: string) => {
      const previousName = analysisName.value;
      try {
        // Optimistically set the new name
        store.dispatch('app/setAnalysisName', newName);
        await updateAnalysis(analysisId.value, { title: newName });
      } catch (e) {
        // Update failed, so undo name change
        store.dispatch('app/setAnalysisName', previousName);
        toast(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
      }
    };
    const onDeleteAnalysis = async () => {
      try {
        await deleteAnalysis(analysisId.value);
        toast(ANALYSIS.SUCCESSFUL_DELETION, 'success', false);
        // We need to wait for a short delay here before navigating back to the
        //  start page, since ES can take some time to refresh its indices after
        //  the delete operation, meaning the deleted analysis would still show
        //  up in the start page list.
        await new Promise<void>(resolve => {
          setTimeout(() => {
            resolve();
          }, 500);
        });
        // Back to DataStart page
        router.push({
          name: 'overview',
          params: {
            project: project.value,
            projectType: ProjectType.Analysis
          }
        });
      } catch (e) {
        console.error('Error occurred when deleting analysis:', e);
        toast(ANALYSIS.ERRONEOUS_DELETION, 'error', true);
      }
    };

    const onDuplicate = (newName: string) => {
      duplicateAnalysis(analysisId.value, newName).then((newId) => {
        toast(ANALYSIS.SUCCESSFUL_DUPLICATE, 'success', false);
        store.dispatch('app/setAnalysisName', newName);
        router.push({
          name: 'dataComparative',
          params: {
            project: project.value,
            analysisId: newId,
            projectType: ProjectType.Analysis
          }
        });
      }).catch(() => {
        toast(ANALYSIS.ERRONEOUS_DUPLICATE, 'error', true);
      });
    };

    return {
      analysisName,
      onRenameAnalysis,
      onDeleteAnalysis,
      onDuplicate
    };
  }
});
</script>
