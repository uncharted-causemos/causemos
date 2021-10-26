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
        <p>Are you sure you want to delete <strong>{{ project.name }}</strong> and all associated instances?</p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div class="project-card-header" @click="open()">
      <span class="table-column extra-wide overflow-ellipsis project-name">
        {{project.name}}
      </span>
      <div class="table-column">
        {{ project.ready_instances.length }}
      </div>
      <div class="table-column">
        <span :style="{color: project.draft_instances.length > 0 ? 'red' : 'black'}">{{ project.draft_instances.length }}</span>
      </div>
      <div class="table-column extra-wide overflow-ellipsis">
        {{ projectSource }}
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

import { defineComponent, ref, PropType } from 'vue';
import { mapActions } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import { DomainProject } from '@/types/Common';
import SmallIconButton from './widgets/small-icon-button.vue';

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'DomainDatacubeProjectCard',
  components: {
    ModalConfirmation,
    MessageDisplay,
    SmallIconButton
  },
  props: {
    project: {
      type: Object as PropType<DomainProject>,
      default: () => ({})
    }
  },
  computed: {
    projectSource(): string {
      if (this.project) {
        if (this.project.source) {
          return this.project.source;
        }
        if (this.project.maintainer && this.project.maintainer.length > 0) {
          return this.project.maintainer[0].organization;
        }
      }
      return '';
    }
  },
  setup() {
    const showMore = ref(false);
    const showModal = ref(false);

    return {
      showMore,
      showModal
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery'
    }),
    dateFormatter,
    toggleShowMore() {
      this.showMore = !this.showMore;
    },
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
    open() {
      // Reset filters every time we open a new project
      this.clearLastQuery();
      this.$router.push({
        name: 'domainDatacubeOverview',
        params: {
          project: this.project.id as string,
          projectType: this.project.type
        }
      });
    }
  }
});
</script>

<style scoped lang="scss">
@import "~styles/variables";

.project-card-container {
  background: white;
}

.project-card-header {
  padding: 10px;
  display: flex;
  cursor: pointer;
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
