<template>
  <div class="list-analytical-questions-pane-container">
    <h4 v-if="showChecklistTitle" class="title">Analysis Checklist</h4>
    <slot />
    <template v-if="showNewAnalyticalQuestion">
      <h5>New Section</h5>
      <textarea
        v-model="newQuestionText"
        v-focus
        type="text"
        placeholder="e.g. Which intervention will have the greatest impact on crop production?"
        rows="10"
        class="question-text"
      />
      <ul class="unstyled-list">
        <button type="button" class="btn" @click.stop="showNewAnalyticalQuestion = false">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-call-to-action"
          :disabled="newQuestionText.length == 0"
          @click.stop="onNewAnalyticalQuestion"
        >
          Save
        </button>
      </ul>
    </template>
    <template v-if="showNewAnalyticalQuestion === false">
      <div>
        <button
          v-tooltip.top-center="'Add a new analytical question'"
          type="button"
          class="btn btn-sm new-question-button"
          @click="addNewQuestion"
        >
          <i class="fa fa-plus-circle" />
          New section
        </button>
        &nbsp;
        <button class="btn btn-sm" @click="questionsExpanded = true">Expand All</button>
        &nbsp;
        <button class="btn btn-sm" @click="questionsExpanded = false">Collapse All</button>
      </div>

      <div v-if="insightsBySection.length > 0" class="analytical-questions-container">
        <div
          v-for="sectionWithInsights in insightsBySection"
          :key="sectionWithInsights.section.id"
          class="checklist-item"
          @drop="onDrop($event, sectionWithInsights.section)"
          @dragover="addDragOverClassToSection"
          @dragenter="addDragOverClassToSection"
          @dragleave="onDragLeave($event)"
          draggable="true"
          @dragstart="startDraggingSection($event, sectionWithInsights.section)"
        >
          <!-- first row display the question -->
          <div class="checklist-item-question">
            <i class="fa fa-bars checklist-item-menu" />
            <span
              class="question-title"
              :class="{ clickable: canClickChecklistItems }"
              @click="$emit('item-click', sectionWithInsights.section, null)"
            >
              {{ sectionWithInsights.section.question }}</span
            >
            <i
              v-if="hasTour(sectionWithInsights.section)"
              v-tooltip.top="'Tutorial available for this question'"
              class="fa fa-lg fa-info-circle"
              :style="{ color: canStartTour ? '#000000' : '#707070' }"
              :disabled="!canStartTour"
              @click.stop.prevent="startTour(sectionWithInsights.section)"
              @mousedown.stop.prevent
            />
            <options-button
              :dropdown-below="true"
              :wider-dropdown-options="true"
              class="options-button"
            >
              <template #content>
                <div class="dropdown-option" @click="editSection(sectionWithInsights.section)">
                  <i class="fa fa-edit" />
                  Edit
                </div>
                <div
                  class="dropdown-option"
                  @click="initiateQuestionDeletion(sectionWithInsights.section)"
                >
                  <i class="fa fa-trash" />
                  Delete
                </div>
              </template>
            </options-button>
          </div>
          <template v-if="questionsExpanded === true">
            <!-- second row display a list of linked insights -->
            <message-display
              v-if="(sectionWithInsights.insights.length ?? 0) === 0"
              class="no-insight-warning"
              :message-type="'alert-warning'"
              :message="'No insights assigned to this section.'"
            />
            <div
              v-for="insight in sectionWithInsights.insights"
              :key="insight.id"
              class="checklist-item-insight"
              draggable="true"
              @drop="
                dropInsightOnInsight($event, sectionWithInsights.section, insight.id as string)
              "
              @dragstart="
                startDraggingInsight($event, insight, sectionWithInsights.section.id as string)
              "
              @dragover="addDragOverClassToInsight"
              @dragenter="addDragOverClassToInsight"
              @dragleave="onDragLeave"
            >
              <i class="fa fa-star" />
              <span
                class="insight-name"
                :class="{
                  'private-insight-name': insight.visibility === 'private',
                  clickable: canClickChecklistItems,
                }"
                @click="$emit('item-click', sectionWithInsights.section, insight.id)"
              >
                {{ insight.name }}
              </span>
              <i
                class="fa fa-fw fa-close"
                style="pointer-events: all; cursor: pointer; margin-left: auto"
                @click="
                  removeRelationBetweenInsightAndQuestion(
                    $event,
                    sectionWithInsights.section,
                    insight.id as string
                  )
                "
              />
            </div>
          </template>
        </div>
      </div>
    </template>
    <teleport to="body">
      <rename-modal
        v-if="isEditModalOpen"
        :modal-title="'Edit section'"
        :current-name="selectedQuestion?.question ?? ''"
        @confirm="onEditModalConfirm"
        @cancel="isEditModalOpen = false"
      />
    </teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import { mapActions, mapGetters } from 'vuex';
import _ from 'lodash';
import Shepherd from 'shepherd.js';

import useInsightsData from '@/services/composables/useInsightsData';
import { updateInsight } from '@/services/insight-service';
import { ProjectType } from '@/types/Enums';
import { AnalyticalQuestion, FullInsight, Insight, SectionWithInsights } from '@/types/Insight';
import { QUESTIONS } from '@/utils/messages-util';
import MessageDisplay from '../widgets/message-display.vue';
import OptionsButton from '../widgets/options-button.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import useToaster from '@/services/composables/useToaster';
import { TYPE } from 'vue-toastification';

type PartialInsight = {
  id: string;
  name: string;
  visibility: string;
  analytical_question: string[];
};

const HOVER_CLASS = {
  REORDERING_SECTION: 'reorder-section-hover',
  REORDERING_INSIGHT: 'reorder-insight-hover',
};

export default defineComponent({
  name: 'ListAnalyticalQuestionsPane',
  components: {
    MessageDisplay,
    OptionsButton,
    RenameModal,
  },
  props: {
    showChecklistTitle: {
      type: Boolean,
      default: false,
    },
    // TODO: eventually we'll be able to click checklist items everywhere, at
    //  which point we can remove this prop.
    canClickChecklistItems: {
      type: Boolean,
      default: false,
    },
    insightsBySection: {
      type: Array as PropType<SectionWithInsights[]>,
      default: [],
    },
  },
  setup() {
    const toaster = useToaster();
    // FIXME: hoist insights to parent component so that we're not fetching and
    //  managing two copies
    const { insights, reFetchInsights } = useInsightsData(undefined, [
      'id',
      'name',
      'visibility',
      'analytical_question',
    ]);

    const getInsightById = (insightId: string) => {
      return insights.value.find((insight) => insight.id === insightId) as
        | PartialInsight
        | undefined;
    };

    const questionsExpanded = ref(true);

    return {
      reFetchInsights,
      getInsightById,
      questionsExpanded,
      toaster,
    };
  },
  emits: [
    'item-click',
    'update-section-title',
    'add-section',
    'delete-section',
    'move-section-above-section',
    'remove-insight-from-section',
    'move-insight',
  ],
  data: () => ({
    AnalyticalQuestionsTabs: [{ name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' }],
    currentTab: 'Analysis Checklist',
    selectedQuestion: null as AnalyticalQuestion | null,
    showNewAnalyticalQuestion: false,
    newQuestionText: '',
    isEditModalOpen: false,
    toursMetadata: [
      {
        baseQuestion: 'What are the appropriate aggregation functions?',
        targetView: 'data',
      },
      {
        baseQuestion: 'What are the key influences causing change in a node?',
        targetView: 'quantitative',
      },
    ],
    lastDragEnter: null,
  }),
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
      projectType: 'app/projectType',
      project: 'app/project',
      contextId: 'insightPanel/contextId',
      isReadyForNextStep: 'tour/isReadyForNextStep',
      isPanelOpen: 'insightPanel/isPanelOpen',
    }),
    canStartTour(): boolean {
      // if the tour's target-view is compatible with currentView and no modal is shown
      return (
        !this.isPanelOpen &&
        this.toursMetadata.findIndex((t) => t.targetView === this.currentView) >= 0
      );
    },
  },
  methods: {
    ...mapActions({
      setTour: 'tour/setTour',
    }),
    hasTour(questionItem: AnalyticalQuestion): boolean {
      return this.toursMetadata.findIndex((t) => t.baseQuestion === questionItem.question) >= 0;
    },
    questionVisibility() {
      return this.projectType === ProjectType.Analysis ? 'private' : 'public';
    },
    editSection(section: AnalyticalQuestion) {
      this.selectedQuestion = section;
      this.isEditModalOpen = true;
    },
    onEditModalConfirm(newSectionTitle: string) {
      if (this.selectedQuestion === null) {
        console.error('No question is selected.');
        return;
      }
      const handleFailedUpdate = () => {
        this.toaster(QUESTIONS.ERRONEOUS_UPDATE, TYPE.INFO, true);
      };
      this.$emit(
        'update-section-title',
        // Assert that ID is defined, since we should never be able to fetch a
        //  question before it's stored with an ID
        this.selectedQuestion.id as string,
        newSectionTitle,
        handleFailedUpdate
      );
      this.selectedQuestion = null;
      this.isEditModalOpen = false;
    },
    // TODO: clarify these function names
    addNewQuestion() {
      this.newQuestionText = '';
      this.showNewAnalyticalQuestion = true;
    },
    onNewAnalyticalQuestion() {
      this.showNewAnalyticalQuestion = false;
      const handleSuccessfulAddition = () => {
        this.toaster(QUESTIONS.SUCCESSFUL_ADDITION, TYPE.SUCCESS, false);
      };
      const handleFailedAddition = () => {
        this.toaster(QUESTIONS.ERRONEOUS_ADDITION, TYPE.INFO, true);
      };
      this.$emit(
        'add-section',
        this.newQuestionText,
        handleSuccessfulAddition,
        handleFailedAddition
      );
    },
    initiateQuestionDeletion(question: AnalyticalQuestion) {
      this.selectedQuestion = question;
      this.deleteSelectedQuestion();
    },
    deleteSelectedQuestion() {
      if (this.selectedQuestion) {
        // REVIEW: delete this question from any insight that references it
        const selectedQuestionLinkedInsights = this.selectedQuestion?.linked_insights as string[];
        selectedQuestionLinkedInsights.forEach((insightId) => {
          this.removeQuestionFromInsight(this.selectedQuestion as AnalyticalQuestion, insightId);
        });

        const handleSuccessfulDeletion = () => {
          this.toaster(QUESTIONS.SUCCESSFUL_REMOVAL, TYPE.SUCCESS, false);
        };
        const handleFailedDeletion = () => {
          this.toaster(QUESTIONS.ERRONEOUS_REMOVAL, TYPE.INFO, true);
        };
        this.$emit(
          'delete-section',
          this.selectedQuestion.id as string,
          handleSuccessfulDeletion,
          handleFailedDeletion
        );
      }
      this.selectedQuestion = null;
    },
    setActive(tab: string) {
      this.currentTab = tab;
    },
    startDraggingSection(evt: any, section: AnalyticalQuestion) {
      evt.dataTransfer.dropEffect = 'move';
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('section_id', section.id);
    },
    async onDrop(evt: any, targetSection: AnalyticalQuestion) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.currentTarget.classList.remove(...Object.values(HOVER_CLASS));
      if (evt.dataTransfer === null || !(evt.currentTarget instanceof HTMLElement)) {
        return;
      }
      const types = evt.dataTransfer.types;
      // Depending on the combination of insight/section ID, this drop
      //  represents one of two different actions.
      const droppedInsightId = evt.dataTransfer.getData('insight_id');
      const droppedSectionId = evt.dataTransfer.getData('section_id');
      if (types.includes('insight_id')) {
        // Move insight to the end of this section
        const position = targetSection.linked_insights.filter(
          (insightId) => insightId !== droppedInsightId
        ).length;
        this.$emit(
          'move-insight',
          droppedInsightId,
          droppedSectionId,
          targetSection.id as string,
          position
        );
        const insight = this.getInsightById(droppedInsightId);
        if (insight === undefined || droppedSectionId === targetSection.id) {
          return;
        }
        // Update insight's list of the sections it's linked to
        const updatedList = insight.analytical_question.filter(
          (sectionId) => sectionId !== droppedSectionId && sectionId !== targetSection.id
        );
        updatedList.push(targetSection.id as string);
        insight.analytical_question = updatedList;
        await updateInsight(droppedInsightId, insight as Insight);
        this.reFetchInsights();
      } else if (types.includes('section_id')) {
        // Move dropped section above targetSection
        this.$emit('move-section-above-section', droppedSectionId, targetSection.id);
      }
    },
    addDragOverClassToSection(evt: DragEvent) {
      // Preventing default action (open as link for some elements) identifies
      //  this element as a valid drop target to the browser.
      evt.preventDefault();
      evt.stopPropagation();
      if (evt.dataTransfer === null || !(evt.currentTarget instanceof HTMLElement)) {
        return;
      }
      const types = evt.dataTransfer.types;
      if (types.includes('insight_id')) {
        // Moving/assigning insight
        evt.currentTarget.classList.add(HOVER_CLASS.REORDERING_INSIGHT);
      } else if (types.includes('section_id')) {
        // Reordering section
        evt.currentTarget.classList.add(HOVER_CLASS.REORDERING_SECTION);
      }
    },
    onDragLeave(evt: DragEvent) {
      if (evt.currentTarget instanceof HTMLElement) {
        evt.currentTarget.classList.remove(...Object.values(HOVER_CLASS));
      }
    },
    startDraggingInsight(event: DragEvent, insight: FullInsight, sectionId: string) {
      event.stopPropagation();
      if (event.dataTransfer === null || !(event.currentTarget instanceof HTMLElement)) {
        return;
      }
      event.dataTransfer.dropEffect = 'move';
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('insight_id', insight.id as string);
      event.dataTransfer.setData('section_id', sectionId);
    },
    addDragOverClassToInsight(evt: DragEvent) {
      if (evt.dataTransfer === null || !(evt.currentTarget instanceof HTMLElement)) {
        return;
      }
      const types = evt.dataTransfer.types;
      if (types.includes('insight_id')) {
        // Insights are only a valid drop target when we're dragging to move or
        //  assign an insight. Preventing default identifies this element as a
        //  valid drop target to the browser.
        evt.preventDefault();
        evt.stopPropagation();
        evt.currentTarget.classList.add(HOVER_CLASS.REORDERING_INSIGHT);
      }
    },
    async dropInsightOnInsight(
      event: DragEvent,
      targetSection: AnalyticalQuestion,
      targetInsightId: string
    ) {
      // prevent default action (open as link for some elements)
      event.preventDefault();
      if (event.dataTransfer === null || !(event.currentTarget instanceof HTMLElement)) {
        return;
      }
      event.currentTarget.classList.remove(...Object.values(HOVER_CLASS));
      const droppedInsightId = event.dataTransfer.getData('insight_id');
      if (droppedInsightId === '') {
        return;
      }
      // Only stop propagation if this insight element is handling the drop
      //  action. Otherwise, let the event bubble up to the containing section.
      event.stopPropagation();
      const droppedSectionId = event.dataTransfer.getData('section_id');
      if (droppedInsightId === targetInsightId) {
        return;
      }
      // Insert insight immediately above the insight it was dropped onto, but
      //  first filter out any existing instance of the dropped insight in the
      //  section.
      const targetInsightList = targetSection.linked_insights.filter(
        (_insightId) => _insightId !== droppedInsightId
      );
      const insertionPosition = targetInsightList.findIndex(
        (_insightId) => _insightId === targetInsightId
      );
      this.$emit(
        'move-insight',
        droppedInsightId,
        droppedSectionId,
        targetSection.id as string,
        insertionPosition
      );
      // Update the list of sections that this insight is linked to.
      const insight = this.getInsightById(droppedInsightId);
      if (insight === undefined || droppedSectionId === targetSection.id) {
        return;
      }
      // Update insight's list of the sections it's linked to
      const updatedList = insight.analytical_question.filter(
        (sectionId) => sectionId !== droppedSectionId && sectionId !== targetSection.id
      );
      updatedList.push(targetSection.id as string);
      insight.analytical_question = updatedList;
      await updateInsight(droppedInsightId, insight as Insight);
      this.reFetchInsights();
    },
    removeRelationBetweenInsightAndQuestion(
      evt: any,
      questionItem: AnalyticalQuestion,
      insightId: string
    ) {
      evt.preventDefault();
      evt.stopPropagation();

      // question
      this.$emit('remove-insight-from-section', insightId, questionItem.id);

      // insight
      // update an insight, first fetch the insight to grab its list of linked_questions and update it
      // also, remove this insight from the question list
      this.removeQuestionFromInsight(questionItem, insightId);
    },
    async removeQuestionFromInsight(questionItem: AnalyticalQuestion, insightId: string) {
      const insight = this.getInsightById(insightId);
      if (insight) {
        insight.analytical_question = insight?.analytical_question.filter(
          (qid: string) => qid !== questionItem.id
        );
        await updateInsight(insightId, insight as Insight);
        this.reFetchInsights();
      }
    },
    startTour(question: AnalyticalQuestion) {
      if (this.canStartTour) {
        // @NOTE: tours are linked with questions via question's text
        switch (question.question) {
          case 'What are the appropriate aggregation functions?':
            this.startAggregationsTour();
            break;
        }
      }
    },
    startAggregationsTour() {
      // FIXME: starting a tour may switch the user context to the approperiate context where the tour is applicable
      //        ideally, a warning is needed and ideally saving the tour details (e.g., steps) in ES and having a more flexible way to create them
      const tour = new Shepherd.Tour({
        tourName: 'aggregations-tour',
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'my-container my-title my-text', // default CSS classes for all steps
        },
      });

      const stepOne = {
        id: 'step-1-overview',
        text: `On the <b>Descriptions</b> tab, review the <b>units</b> and identify if it is:
          <br>
          <ul>
            <li>a count (e.g. number of people)</li>
            <li>a percentage, rate or probability (e.g. % of population)</li>
            <li>an index (e.g. rank)</li>
          </ul>
          <br>
          Then click on the <b>Data</b> tab.
        `,
        title: 'Review Description and Click Data tab',
        attachTo: {
          element: '.tour-datacube-desc',
          on: 'right',
        },
        buttons: [
          {
            text: 'Skip tutorial!',
            action: function () {
              return tour.cancel();
            },
          },
        ],
        highlightClass: 'my-highlight',
        // @FIXME: temp solution to expand the highlighted-target area to include
        //  the Data/Desc buttons since they live in different components in the DOM hierarchy
        //  and won't be clickable if not within the highlighted area
        modalOverlayOpeningPadding: 50,
      };

      const stepTwo = {
        id: 'step-2-select-aggregation',
        text: `Select the appropriate <b>Aggregation Function</b>:
               e.g. if there are multiple values in a region or a time period, how should they be aggregated?
          <br>
          <ul>
            <li>a count: <b>sum</b></li>
            <li>a percentage, rate or probability: <b>mean</b></li>
            <li>an index: <b>mean</b></li>
          </ul>
        `,
        title: 'Select Aggregation Function',
        attachTo: {
          element: '.tour-agg-dropdown-config',
          on: 'right',
        },
        buttons: [
          {
            text: 'Skip tutorial!',
            action: function () {
              return tour.cancel();
            },
          },
          {
            text: 'Next',
            action: function () {
              return tour.next();
            },
          },
        ],
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // check every 1 second for the next step to be flagged as ready
            //  i.e., until the map and the spatial-aggregation config are visible
            //  kill the timer if the operation is taking too long!
            let elapsedTime = 0;
            const wait = () => {
              if (this.isReadyForNextStep) {
                resolve();
              } else {
                elapsedTime += 1000;
                if (elapsedTime > 30000) {
                  // wait 30 seconds
                  console.warn('operation took too long... killing the tour timer!');
                  resolve();
                }
                // we should only continue waiting/checking for the ready-signal unless as long as the tour is active
                if (tour.isActive()) {
                  _.debounce(wait, 1000)();
                }
              }
            };
            wait();
          });
        },
        highlightClass: 'my-highlight',
        // @FIXME: temp solution to expand the highlighted-target area to include
        //  the dropdown config options to allow the user to select one of them before advancing the tour
        modalOverlayOpeningPadding: 100,
      };

      const stepThree = {
        id: 'step-3-aggregation-summary',
        text: 'These configuration options will be remembered in this quantitative analysis.',
        buttons: [
          {
            text: 'Got it',
            action: function () {
              return tour.complete();
            },
          },
        ],
      };

      tour.addSteps([stepOne, stepTwo, stepThree]);
      tour.start();

      // save this newly created tour in the store
      this.setTour(tour);
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.title {
  @include header-secondary;
}

.question-text {
  margin-bottom: 1rem;
  border-color: gray;
  border-width: thin;
}

.list-analytical-questions-pane-container {
  display: flex;
  flex-direction: column;

  .analytical-questions-container {
    overflow-y: auto;

    .checklist-item {
      flex-direction: column;
      display: flex;
      font-size: $font-size-medium;
      padding-bottom: 25px;
      border-top: 2px solid transparent;
      position: relative;

      &::after {
        content: '';
        height: 1px;
        background: transparent;
      }

      &.reorder-section-hover {
        border-top-color: $selected;
      }

      &.reorder-insight-hover::after {
        background: $selected;
      }

      .checklist-item-question {
        flex-direction: row;
        display: flex;
        align-items: baseline;

        .checklist-item-menu {
          cursor: move;
          margin-right: 5px;
        }

        .question-title {
          user-select: none;
          flex: 1;
          min-width: 0;
          margin-right: 5px;
          font-size: $font-size-large;

          &.clickable {
            cursor: pointer;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
      .checklist-item-insight {
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        // 6px visually lines up the insight's "x" with the section's menu
        padding: 5px 6px 5px 15px;
        border-top: 1px solid transparent;
        .insight-name {
          padding-left: 1rem;
          padding-right: 1rem;
          color: gray;
          font-style: italic;
          flex: 1;
          min-width: 0;

          &.clickable {
            cursor: pointer;

            &:hover {
              text-decoration: underline;
            }
          }
        }
        .private-insight-name {
          color: black;
          font-style: normal;
        }
        &.reorder-insight-hover {
          border-top-color: $selected;
        }
      }
    }
  }
}

.no-insight-warning {
  margin: 5px 20px 0 15px;
}

.new-question-button {
  margin: 10px 0;
}

.options-button {
  align-self: flex-start;
  position: relative;
  bottom: 5px;
}

.unstyled-list > *:not(:first-child) {
  margin-left: 5px;
}
</style>
