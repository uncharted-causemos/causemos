<template>
  <div :class="{ 'project-card-container': !showMore, 'project-card-container selected': showMore }">
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
    <div
      class="row project-card-header"
      @click="toggleShowMore()">
      <div class="col-sm-4">
        <i
          :class="{ 'fa fa-angle-right': !showMore, 'fa fa-angle-down': showMore }"
        />
        <button
          type="button"
          class="btn btn-link"
          style="padding-left: 8px"
          @click="open(project.id)">
          <span class="overflow-ellipsis project-name">{{project.name}}</span>
        </button>
      </div>
      <div class="col-sm-2 number-col">
        {{ project.published_instances.length }}
      </div>
      <div class="col-sm-2 number-col">
        {{ project.registered_instances.length }}
      </div>
      <div class="col-sm-2" style="text-align: center">
        {{ project.source }}
      </div>
      <div class="col-sm-2">
        {{ dateFormatter(project.modified_at) }}
      </div>
    </div>
    <div
      v-if="showMore"
      class="container-fluid project-card-content"
      @click="toggleShowMore()">
      <div class="row">
        <div class="col-sm-12 details">
          <div>
            <p><b>{{project.description}}</b></p>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="showMore"
      class="project-card-footer"
    >
      <div class="row">
        <div class="col-sm-8">
          <button
            v-tooltip.top-center="'Open the project'"
            type="button"
            class="btn btn-primary"
            @click="open(project.id)"
          ><i class="fa fa-folder-open-o" />
            Open Project</button>
        </div>
        <div class="col-sm-4">
          <!--
          <button
            v-tooltip.top-center="'Remove the project from the list'"
            type="button"
            class="remove-button"
            @click.stop="showWarningModal"
          ><i class="fa fa-trash" />
            Remove Project</button>
            -->
        </div>
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
import { DomainModelProject } from '@/types/Common';

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'DomainModelProjectCard',
  components: {
    ModalConfirmation,
    MessageDisplay
  },
  props: {
    project: {
      type: Object as PropType<DomainModelProject>,
      default: () => ({})
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
      clearLastQuery: 'query/clearLastQuery',
      isDomainModelProject: 'app/isDomainModelProject'
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
    open(id: string) {
      // Reset filters every time we open a new project
      this.clearLastQuery();
      this.isDomainModelProject(true);
      this.$router.push({ name: 'domainModelOverview', params: { project: id } });
    }
  }
});
</script>

<style scoped lang="scss">
@import "~styles/variables";

.project-card-container {
  cursor: pointer;
  background: #fcfcfc;
  border: 1px solid #dedede;
  margin: 1px 0;
  padding: 10px;
}

.project-card-container:hover {
  border-color: $selected;
  cursor: pointer;
}

.selected {
  border-left: 4px solid $selected;
  background-color: #ffffff;
}

.project-card-header {
  i {
    margin-left: 20px;
  }
  padding-bottom: 5px;
  padding-top: 5px;
}

.project-card-content {
  padding-bottom: 5px;
  .details {
    div {
      margin-left: 10px;
    }
  }
}

.project-name {
  max-width: 40ch;
  display: inline-block;
  text-align: left;
  text-decoration: underline;
}

.project-card-footer {
  padding-bottom: 5px;
  padding-top: 5px;
  .btn {
    margin-left: 20px;
    margin-right: 10px;
  }
}

.number-col {
  text-align: right;
  padding-right: 30px;
}

.remove-button {
  background: #F44336;
  color: white;
  font-weight: 600;
  border: none;
  padding: 8px 16px;
  user-select: none;
}
</style>
