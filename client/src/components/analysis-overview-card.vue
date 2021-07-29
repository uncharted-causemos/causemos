<template>
  <div :class="{ 'project-card-container': !showMore, 'project-card-container selected': showMore }">
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="deleteAnalysis"
      @close="showModal = false"
    >
      <template #title>Remove analysis</template>
      <template #message>
        <p>Are you sure you want to remove <strong>{{ analysis.title }}</strong>?</p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div
      class="row project-card-header"
      @click="toggleShowMore()">
      <div class="col-sm-2 instance-header no-padding">
        <i
          :class="{ 'fa fa-angle-right': !showMore, 'fa fa-angle-down': showMore }"
        />
        <button
          type="button"
          class="btn btn-link no-padding"
          style="color: black; margin-bottom: 1rem"
          @click="openAnalysis">
          <span class="overflow-ellipsis"><b>{{analysis.title}}</b></span>
        </button>
      </div>
      <div class="col-sm-3">
        <div style="fontWeight: normal; fontSize: smaller">{{analysis.description}}</div>
        <div class="instance-header" style="margin-left: 0px">
          <div style="fontWeight: normal; fontSize: x-small; left-margin: 0px">Last updated: {{analysis.subtitle}}</div>
        </div>
      </div>
      <div class="col-sm-1 instance-header">
        {{analysis.type === 'quantitative' ? 'Datacubes' : 'Concepts'}}
        <div style="color: black">{{analysis.type === 'quantitative' ? analysis.datacubesCount : analysis.nodeCount }}</div>
      </div>
      <div class="col-sm-1 instance-header">
        {{analysis.type === 'quantitative' ? 'Models': 'Relations'}}
        <div style="color: black">{{analysis.type === 'quantitative' ? '-' : analysis.edgeCount }}</div>
      </div>
      <div class="col-sm-1 instance-header">
        Insights
        <div style="color: black">12</div>
      </div>
      <div class="col-sm-1 instance-header">
        Comments
        <div style="color: black">7</div>
      </div>
    </div>
    <div
      v-if="showMore"
      class="project-card-footer"
    >
      <div class="row">
        <div class="col-sm-5"></div>
        <div class="col-sm-1">
          <button
            v-tooltip.top-center="'Open analysis'"
            type="button"
            class="btn btn-primary button-spacing btn-call-for-action"
            @click="openAnalysis"
            ><i class="fa fa-folder-open-o" />
              Open
          </button>
        </div>
        <div class="col-sm-3">
          <button
            v-tooltip.top-center="'Rename analysis'"
            type="button"
            class="btn btn-primary button-spacing"
            @click="editAnalysis"
            >
            <i class="fa fa-edit" />Rename
          </button>
          <button
            v-tooltip.top-center="'Duplicate analysis'"
            type="button"
            class="btn btn-primary button-spacing"
            @click="duplicateAnalysis"
            >
            <i class="fa fa-copy" />Duplicate
          </button>
        </div>
        <div class="col-sm-2">
          <button
            v-tooltip.top-center="'delete analysis'"
            type="button"
            class="remove-button button-spacing"
            @click.stop="showWarningModal"
          ><i class="fa fa-trash" />
            Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref, PropType } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';

interface AnalysisOverviewCard {
  id: string;
  previewImageSrc: string | null;
  title: string;
  subtitle: string;
  description: string;
  type: string; // e.g., qualitative, quantitative
}

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'AnalysisOverviewCard',
  components: {
    ModalConfirmation,
    MessageDisplay
  },
  props: {
    analysis: {
      type: Object as PropType<AnalysisOverviewCard>,
      default: () => ({})
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  setup() {
    const showModal = ref(false);
    const showMore = ref(false);

    return {
      showModal,
      showMore
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery'
    }),
    dateFormatter,
    deleteAnalysis() {
      this.$emit('delete');
      this.showModal = false;
    },
    showWarningModal() {
      this.showModal = true;
    },
    closeWarning() {
      this.showModal = false;
    },
    openAnalysis() {
      // Reset filters every time we open
      this.clearLastQuery();
      this.$emit('open');
    },
    editAnalysis() {
      // Reset filters every time we edit
      this.clearLastQuery();
      this.$emit('rename');
    },
    duplicateAnalysis() {
      // Reset filters every time we edit
      this.clearLastQuery();
      this.$emit('duplicate');
    },
    toggleShowMore() {
      this.showMore = !this.showMore;
    }
  }
});
</script>

<style scoped lang="scss">
@import "~styles/variables";

.instance-header {
  @include header-secondary;
  font-weight: bold;
  color: darkgrey;
  padding-bottom: 5px;
  margin-left: 2rem;
}

.fixed-height-column {
  height: 12vh;
  overflow: auto;
}

.project-card-container {
  background: #fcfcfc;
  border: 1px solid #dedede;
  margin: 1px 0;
  padding: 6px;
}

.project-card-container:hover {
  border-color: $selected;
}

.selected {
  border-left: 4px solid $selected;
  background-color: #ffffff;
}

.project-card-header {
  padding-bottom: 5px;
  padding-top: 5px;
  padding-left: 3rem;
}

.button-spacing {
  padding: 4px;
  margin: 2px;
  border-radius: 8px;
}

.remove-button {
  background: #F44336;
  color: white;
  font-weight: 600;
  border: none;
  user-select: none;
}
</style>
