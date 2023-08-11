<template>
  <div class="project-card-container">
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="remove"
      @close="showModal = false"
    >
      <template #title>Delete Project</template>
      <template #message>
        <p>
          Are you sure you want to delete
          <strong>{{ project.name }}</strong> and all associated CAGs/Models/Scenarios?
        </p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div class="project-card-header" @click="open(project.id)">
      <span class="overflow-ellipsis project-name table-column extra-wide">
        {{ project.name }}
      </span>
      <div class="table-column">
        {{ dataAnalysisCount + modelCount }}
      </div>
      <div class="table-column extra-wide">
        {{ project.corpus_id }}
      </div>
      <div class="table-column">
        {{ dateFormatter(project.modified_at, 'MMM DD, YYYY') }}
      </div>
      <div class="table-column extra-small">
        <small-icon-button :use-white-bg="true" @click.stop="showWarningModal">
          <i class="fa fa-fw fa-trash" />
        </small-icon-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, PropType } from 'vue';
import { mapActions } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

import MessageDisplay from '@/components/widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import { Project } from '@/types/Common';
import { ProjectType } from '@/types/Enums';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'ProjectCard',
  components: {
    ModalConfirmation,
    MessageDisplay,
    SmallIconButton,
  },
  props: {
    project: {
      type: Object as PropType<Project>,
      default: () => ({}),
    },
  },
  setup(props) {
    const showModal = ref(false);

    return {
      modelCount: computed(() => props.project.stat.model_count as number),
      dataAnalysisCount: computed(() => props.project.stat.data_analysis_count as number),
      showModal,
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery',
    }),
    dateFormatter,
    remove() {
      this.$emit('delete', this.project);
      this.showModal = false;
    },
    showWarningModal() {
      this.showModal = true;
    },
    closeWarning() {
      this.showModal = false;
    },
    open(id: string) {
      // Reset filters every time we open a new project
      this.clearLastQuery();
      this.$router.push({
        name: 'overview',
        params: { project: id, projectType: ProjectType.Analysis },
      });
    },
  },
});
</script>

<style scoped lang="scss">
@import '~styles/variables';

.project-card-container {
  background: white;
}

.project-card-header {
  padding: 10px;
  display: flex;
  cursor: pointer;
  border-bottom: 1px solid $separator;
}

.project-card-header:hover .project-name {
  color: $selected-dark;
}

.table-column {
  flex: 1;
  min-width: 0;

  &:not(:first-child) {
    margin-left: 5px;
  }

  &.extra-wide {
    flex: 2;
  }

  &.extra-small {
    width: 20px;
    flex: 0;
    min-width: auto;
  }
}
</style>
