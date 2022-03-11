<template>
  <div class="list-analytical-questions-pane-container">
    <h4 v-if="showChecklistTitle" class="title">Analysis Checklist</h4>
    <template v-if="isDeleteModalOpen">
      <h5>Delete Public Question</h5>
      <p>Are you sure you want to delete?</p>
      <message-display
        class="delete-confirm-alert"
        :message-type="'alert-warning'"
        :message="'This deletion will remove the question from all projects.'"
      />
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn"
          @click.stop="isDeleteModalOpen = false">
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="deleteSelectedQuestion">
            Confirm
        </button>
      </ul>
    </template>
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
        <button
          type="button"
          class="btn"
          @click.stop="showNewAnalyticalQuestion = false">
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :disabled="newQuestionText.length == 0"
          @click.stop="onNewAnalyticalQuestion">
            Save
        </button>
      </ul>
    </template>
    <template v-if="isDeleteModalOpen === false && showNewAnalyticalQuestion === false">
      <button
        v-tooltip.top-center="'Add a new analytical question'"
        type="button"
        class="btn btn-default new-question-button"
        @click="addNewQuestion">
          <i class="fa fa-plus-circle" />
          Add new section
      </button>
      <div v-if="sortedQuestions.length > 0" class="analytical-questions-container">
        <div
          v-for="questionItem in sortedQuestions"
          :key="questionItem.id"
          class="checklist-item"
          @drop='onDrop($event, questionItem)'
          @dragover='onDragOver($event)'
          @dragenter='onDragEnter($event)'
          @dragleave='onDragLeave($event)'
          draggable='true'
          @dragstart='onDragStart($event, questionItem)'
        >
            <!-- first row display the question -->
            <div class="checklist-item-question">
              <i class="fa fa-bars checklist-item-menu" />
              <span class="question-title"> {{ questionItem.question }}</span>
              <i
                v-if="hasTour(questionItem)"
                v-tooltip.top="'Tutorial available for this question'"
                class="fa fa-lg fa-info-circle"
                :style="{ color: canStartTour ? '#000000' : '#707070' }"
                :disabled="!canStartTour"
                @click.stop.prevent="startTour(questionItem)"
                @mousedown.stop.prevent
              />
              <options-button
                :dropdown-below="true"
                :wider-dropdown-options="true"
                class="options-button"
              >
                <template #content>
                  <div class="dropdown-option" @click="editSection(questionItem)">
                    <i class="fa fa-edit" />
                    Edit
                  </div>
                  <div
                    class="dropdown-option"
                    @click="initiateQuestionDeletion(questionItem)"
                  >
                    <i class="fa fa-trash" />
                    Delete
                  </div>
                </template>
              </options-button>
            </div>
            <!-- second row display a list of linked insights -->
            <message-display
              v-if="(insightsByQuestion.get(questionItem.id)?.length ?? 0) === 0"
              class="no-insight-warning"
              :message-type="'alert-warning'"
              :message="'No insights assigned to this section.'"
            />
            <div
              v-for="insight in insightsByQuestion.get(questionItem.id)"
              :key="insight.id"
              class="checklist-item-insight">
              <i @mousedown.stop.prevent class="fa fa-star" />
              <span
                @mousedown.stop.prevent
                class="insight-name"
                :class="{ 'private-insight-name': insight.visibility === 'private' }">
                {{ insight.name }}
              </span>
              <i class="fa fa-fw fa-close"
                style="pointer-events: all; cursor: pointer; margin-left: auto;"
                @click="removeRelationBetweenInsightAndQuestion($event, questionItem, insight.id)" />
            </div>
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
import { computed, defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';
import _ from 'lodash';
import Shepherd from 'shepherd.js';

import useInsightsData from '@/services/composables/useInsightsData';
import useQuestionsData from '@/services/composables/useQuestionsData';
import { updateInsight } from '@/services/insight-service';
import { addQuestion, deleteQuestion, updateQuestion } from '@/services/question-service';
import { ProjectType } from '@/types/Enums';
import { AnalyticalQuestion, Insight, ViewState } from '@/types/Insight';
import { QUESTIONS } from '@/utils/messages-util';
import { SORT_PATH, sortQuestionsByPath } from '@/utils/questions-util';
import MessageDisplay from '../widgets/message-display.vue';
import OptionsButton from '../widgets/options-button.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import useToaster from '@/services/composables/useToaster';

type PartialInsight = { id: string, name: string, visibility: string, analytical_question: string[] };

export default defineComponent({
  name: 'ListAnalyticalQuestionsPane',
  components: {
    MessageDisplay,
    OptionsButton,
    RenameModal
  },
  props: {
    showChecklistTitle: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const toaster = useToaster();
    const { questionsList, reFetchQuestions } = useQuestionsData();
    const { insights, reFetchInsights } = useInsightsData(undefined,
      ['id', 'name', 'visibility', 'analytical_question']);

    const getInsightById = (insightId: string) => {
      return insights.value.find(insight => insight.id === insightId) as PartialInsight;
    };

    const insightsByQuestion = computed<Map<string, PartialInsight[]>>(() => {
      return new Map<string, PartialInsight[]>(questionsList.value.map(question => [
        question.id,
        insights.value.filter(insight => question.linked_insights.includes(insight.id as string))
      ] as [string, PartialInsight[]]));
    });

    return {
      questionsList,
      insightsByQuestion,
      reFetchQuestions,
      reFetchInsights,
      getInsightById,
      toaster
    };
  },
  data: () => ({
    AnalyticalQuestionsTabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' }
    ],
    currentTab: 'Analysis Checklist',
    selectedQuestion: null as AnalyticalQuestion | null,
    showNewAnalyticalQuestion: false,
    newQuestionText: '',
    isDeleteModalOpen: false,
    isEditModalOpen: false,
    toursMetadata: [
      {
        baseQuestion: 'What are the appropriate aggregation functions?',
        targetView: 'data'
      },
      {
        baseQuestion: 'What are the key influences causing change in a node?',
        targetView: 'quantitative'
      }
    ],
    lastDragEnter: null
  }),
  computed: {
    ...mapGetters({
      viewState: 'insightPanel/viewState',
      currentView: 'app/currentView',
      projectType: 'app/projectType',
      project: 'app/project',
      contextId: 'insightPanel/contextId',
      isReadyForNextStep: 'tour/isReadyForNextStep',
      isPanelOpen: 'insightPanel/isPanelOpen'
    }),
    sortedQuestions(): AnalyticalQuestion[] {
      return sortQuestionsByPath(this.questionsList);
    },
    // @REVIEW: this is similar to insightTargetView
    questionTargetView(): string[] {
      // an insight created during model publication should be listed either
      //  in the full list of insights,
      //  or as a context specific insight when opening the page of the corresponding model family instance
      //  (the latter is currently supported via a special route named dataPreview)
      // return this.currentView === 'modelPublishingExperiment' ? ['data', 'dataPreview', 'domainDatacubeOverview', 'overview', 'modelPublishingExperiment'] : [this.currentView, 'overview'];
      return this.projectType === ProjectType.Analysis ? [this.currentView, 'overview', 'dataComparative'] : ['data', 'nodeDrilldown', 'dataComparative', 'overview', 'dataPreview', 'domainDatacubeOverview', 'modelPublishingExperiment'];
    },
    canStartTour(): boolean {
      // if the tour's target-view is compatible with currentView and no modal is shown
      return !this.isPanelOpen &&
            this.toursMetadata.findIndex(t => t.targetView === this.currentView) >= 0;
    }
  },
  mounted() {
    this.showSidePanel();
  },
  methods: {
    ...mapActions({
      setQuestions: 'analysisChecklist/setQuestions',
      showSidePanel: 'panel/showSidePanel',
      setTour: 'tour/setTour'
    }),
    hasTour(questionItem: AnalyticalQuestion): boolean {
      return this.toursMetadata.findIndex(t => t.baseQuestion === questionItem.question) >= 0;
    },
    questionVisibility() {
      return this.projectType === ProjectType.Analysis ? 'private' : 'public';
      // return (this.currentView === 'modelPublishingExperiment' || this.currentView === 'dataPreview') ? 'public' : 'private';
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
      const updatedSection = {
        ...this.selectedQuestion,
        question: newSectionTitle
      };
      this.selectedQuestion = null;
      this.isEditModalOpen = false;
      // Assert that ID is defined, since we should never be able to fetch a
      //  question before it's stored with an ID
      updateQuestion(updatedSection.id as string, updatedSection).then(
        result => {
          if (result.status === 200) {
            // refresh the latest list from the server
            this.reFetchQuestions();
          } else {
            this.toaster(QUESTIONS.ERRONEOUS_UPDATE, 'error', true);
          }
        }
      );
    },
    updateLocalQuestionsList(newQuestionsList: AnalyticalQuestion[]) {
      this.questionsList = newQuestionsList;
      this.setQuestions(this.sortedQuestions); // computed ref of this.questionsList
    },
    addNewQuestion() {
      this.newQuestionText = '';
      this.showNewAnalyticalQuestion = true;
    },
    onNewAnalyticalQuestion() {
      this.showNewAnalyticalQuestion = false;

      const url = this.$route.fullPath;
      const viewState: ViewState = _.cloneDeep(this.viewState);
      const newQuestionOrderIndx = _.get(_.maxBy(this.sortedQuestions, SORT_PATH), SORT_PATH);
      viewState.analyticalQuestionOrder = newQuestionOrderIndx !== undefined ? (newQuestionOrderIndx + 1) : this.sortedQuestions.length;
      const newQuestion: AnalyticalQuestion = {
        question: this.newQuestionText,
        description: '',
        visibility: 'private', // this.questionVisibility(),
        project_id: this.project,
        context_id: this.contextId,
        url,
        target_view: this.questionTargetView,
        pre_actions: null,
        post_actions: null,
        linked_insights: [],
        view_state: viewState
      };
      addQuestion(newQuestion).then((result) => {
        const message = result.status === 200 ? QUESTIONS.SUCCESSFUL_ADDITION : QUESTIONS.ERRONEOUS_ADDITION;
        if (message === QUESTIONS.SUCCESSFUL_ADDITION) {
          this.toaster(message, 'success', false);
          // refresh the latest list from the server
          this.reFetchQuestions();
        } else {
          this.toaster(message, 'error', true);
        }
      });
    },
    initiateQuestionDeletion(question: AnalyticalQuestion) {
      this.selectedQuestion = question;
      this.deleteSelectedQuestion();
    },
    deleteSelectedQuestion() {
      if (this.selectedQuestion) {
        // REVIEW: delete this question from any insight that references it
        const selectedQuestionLinkedInsights = this.selectedQuestion?.linked_insights as string[];
        selectedQuestionLinkedInsights.forEach(insightId => {
          this.removeQuestionFromInsight(this.selectedQuestion as AnalyticalQuestion, insightId);
        });

        // Remove question from the local list of questions
        const updatedList = this.questionsList.filter(q => q.question !== this.selectedQuestion?.question);
        this.updateLocalQuestionsList(updatedList);

        deleteQuestion(this.selectedQuestion.id as string).then(result => {
          const message = result.status === 200 ? QUESTIONS.SUCCESSFUL_REMOVAL : QUESTIONS.ERRONEOUS_REMOVAL;
          if (message === QUESTIONS.SUCCESSFUL_REMOVAL) {
            this.toaster(message, 'success', false);
          } else {
            this.toaster(message, 'error', true);
          }
        });
      }
      this.selectedQuestion = null;
      this.isDeleteModalOpen = false;
    },
    setActive(tab: string) {
      this.currentTab = tab;
    },
    onDragStart(evt: any, questionItem: AnalyticalQuestion) {
      evt.dataTransfer.dropEffect = 'move';
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('question_id', questionItem.id);
    },
    async onDrop(evt: any, questionItem: AnalyticalQuestion) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.currentTarget.style.background = 'white';

      // At most ONE of these will exist
      const question_id = evt.dataTransfer.getData('question_id');
      const insight_id = evt.dataTransfer.getData('insight_id');

      if (question_id !== '') {
        // swap questions: question_id and questionItem.id
        const questions = _.cloneDeep(this.sortedQuestions);
        const question1 = questions.find(q => q.id === question_id);
        const question2 = questions.find(q => q.id === questionItem.id);
        if (question1 === undefined || question2 === undefined) {
          return;
        }
        const position1 = question1.view_state.analyticalQuestionOrder as number;
        const position2 = question2.view_state.analyticalQuestionOrder as number;

        // Swap and update local copy
        question1.view_state.analyticalQuestionOrder = position2;
        question2.view_state.analyticalQuestionOrder = position1;
        this.updateLocalQuestionsList(questions);

        // update question(s) on the backend for persistent ordering
        await updateQuestion(question1.id as string, question1);
        await updateQuestion(question2.id as string, question2);
      }

      // implied else
      if (insight_id !== '') {
        // fetch the dropped insight and use its name in this question's insights
        const insight = this.getInsightById(insight_id);
        if (insight) {
          const existingIndex = questionItem.linked_insights.findIndex(id => id === insight_id);
          if (existingIndex < 0) {
            // only add any dropped insight once to each question
            questionItem.linked_insights.push(insight_id);

            // update question on the backend
            updateQuestion(questionItem.id as string, questionItem);

            // update the store to facilitate questions consumption in other UI places
            this.updateLocalQuestionsList(this.sortedQuestions);
          }
          // add the following question (text) to the insight
          if (!(insight.analytical_question.findIndex(qid => qid === questionItem.id) >= 0)) {
            insight.analytical_question.push(questionItem.id as string);
            await updateInsight(insight_id, insight as Insight);
            this.reFetchInsights();
          }
        }
      }
    },
    onDragOver(evt: any) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.stopPropagation();

      // Change the source element's background color for enter events
      evt.currentTarget.style.background = 'lightblue';
    },
    onDragEnter(evt: any) {
      // prevent default action
      evt.preventDefault();
      evt.stopPropagation();
      this.lastDragEnter = evt.target; // keep track of element that was first entered while draging
    },
    onDragLeave(evt: any) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.stopPropagation();
      // Change the source element's background color back to white
      if (this.lastDragEnter === evt.target) { // HACK: only flip color back if we leave the original element we entered
        evt.currentTarget.style.background = 'white';
      }
    },
    removeRelationBetweenInsightAndQuestion(evt: any, questionItem: AnalyticalQuestion, insightId: string) {
      evt.preventDefault();
      evt.stopPropagation();

      //
      // question
      //

      // filter linked insights of this question
      questionItem.linked_insights = questionItem.linked_insights.filter(
        linId => linId !== insightId
      );

      // update question on the backend
      updateQuestion(questionItem.id as string, questionItem);

      // update the store to facilitate questions consumption in other UI places
      this.setQuestions(this.sortedQuestions);

      //
      // insight
      //

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
          case 'What are the key influences causing change in a node?':
            this.startMatrixTour();
            break;
          case 'What are the appropriate aggregation functions?':
            this.startAggregationsTour();
            break;
        }
      }
    },
    startMatrixTour() {
      const tour = new Shepherd.Tour({
        tourName: 'sensitivity-matrix-tour',
        useModalOverlay: true,
        defaultStepOptions: {
          // enable X button to cancel from any step
          cancelIcon: {
            enabled: true
          },
          classes: 'my-container my-title my-text' // default CSS classes for all steps
        }
      });

      // NOTE
      // step one assumes the context of a CAG in the qualitative view with the flow-tab
      const stepOne = {
        id: 'step-1-matrix-tab-click',
        text: 'Clicking the Matrix tab will show the sensitivity matrix.',
        title: 'Click the Matrix tab',
        attachTo: {
          element: '.tour-matrix-tab', // this.$refs.newrunsbuttonref // also element can be referenced with id, e.g. #some-id
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Skip tutorial!',
            action: function() {
              return tour.cancel();
            }
          }
        ],
        modalOverlayOpeningPadding: 0, // padding applied to the highlight on the target element
        highlightClass: 'my-highlight'
        // classes: 'my-title my-text' // CSS classes for this step
      };

      const stepTwo = {
        id: 'step-2-sensitivity-matrix',
        text: 'This is the sensitivity analysis matrix. <br>To see the top influencers for a node, click on its column header.',
        attachTo: {
          element: '.tour-x-axis-sensitivity-matrix', // this DOM element is dynamic and will only be available once the sensitivity-analysis-matrix is rendered
          on: 'bottom'
        },
        buttons: [
          {
            text: 'Next',
            action: function() {
              return tour.next();
            }
          },
          {
            text: 'Skip tutorial!',
            action: function() {
              return tour.cancel();
            }
          }
        ],
        beforeShowPromise: () => {
          return new Promise<void>(resolve => {
            // check every 1 second for the next step to be flagged as ready
            //  i.e., until the sensitivity matrix is visible
            //  kill the timer if the operation is taking too long!
            let elapsedTime = 0;
            const wait = () => {
              if (this.isReadyForNextStep) {
                resolve();
              } else {
                elapsedTime += 1000;
                if (elapsedTime > 30000) { // wait 30 seconds
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
        }
        // advanceOn: { selector: '', event: 'click' }
      };

      const stepThree = {
        id: 'step-3-sensitivity-matrix-click',
        text: '<b>Key influences</b> causing change in malnutrition are the darker cells ones.<br> <b>Influence score</b> is based on structure of graph and weight of relationships',
        attachTo: {
          element: '.tour-grid-lines',
          on: 'right'
        },
        buttons: [
          {
            text: 'Got it',
            action: function() {
              return tour.complete();
            }
          }
        ]
      };

      tour.addSteps([stepOne, stepTwo, stepThree]);
      tour.start();

      // save this newly created tour in the store
      this.setTour(tour);
    },
    startAggregationsTour() {
      // FIXME: starting a tour may switch the user context to the approperiate context where the tour is applicable
      //        ideally, a warning is needed and ideally saving the tour details (e.g., steps) in ES and having a more flexible way to create them
      const tour = new Shepherd.Tour({
        tourName: 'aggregations-tour',
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'my-container my-title my-text' // default CSS classes for all steps
        }
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
          on: 'right'
        },
        buttons: [
          {
            text: 'Skip tutorial!',
            action: function() {
              return tour.cancel();
            }
          }
        ],
        highlightClass: 'my-highlight',
        // @FIXME: temp solution to expand the highlighted-target area to include
        //  the Data/Desc buttons since they live in different components in the DOM hierarchy
        //  and won't be clickable if not within the highlighted area
        modalOverlayOpeningPadding: 50
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
          on: 'right'
        },
        buttons: [
          {
            text: 'Skip tutorial!',
            action: function() {
              return tour.cancel();
            }
          },
          {
            text: 'Next',
            action: function() {
              return tour.next();
            }
          }
        ],
        beforeShowPromise: () => {
          return new Promise<void>(resolve => {
            // check every 1 second for the next step to be flagged as ready
            //  i.e., until the map and the spatial-aggregation config are visible
            //  kill the timer if the operation is taking too long!
            let elapsedTime = 0;
            const wait = () => {
              if (this.isReadyForNextStep) {
                resolve();
              } else {
                elapsedTime += 1000;
                if (elapsedTime > 30000) { // wait 30 seconds
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
        modalOverlayOpeningPadding: 100
      };

      const stepThree = {
        id: 'step-3-aggregation-summary',
        text: 'These configuration options will be remembered in this quantitative analysis.',
        buttons: [
          {
            text: 'Got it',
            action: function() {
              return tour.complete();
            }
          }
        ]
      };

      tour.addSteps([stepOne, stepTwo, stepThree]);
      tour.start();

      // save this newly created tour in the store
      this.setTour(tour);
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .title {
    @include header-secondary;
  }

  .question-text {
    margin-bottom: 1rem;
    border-color: gray;
    border-width: thin;
  }

  .insight-action {
    flex: 1 1 auto;
    text-align: right;
    .insight-header-btn {
      cursor: pointer;
      padding: 5px;
      color: gray;
    }
  }

  .insight-editor-dropdown {
    position: absolute;
    right: 0px;
    width: fit-content;
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
        margin-bottom: 25px;
        margin-top: 5px;

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
          }
          .public-question-label {
            @include header-secondary;
            // Make label the same height as the question so it is centered
            line-height: $font-size-large;
          }
        }
        .checklist-item-insight {
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          margin-left: 20px;
          margin-top: 5px;
          .insight-name {
            padding-left: 1rem;
            padding-right: 1rem;
            color: gray;
            font-style: italic;
            flex: 1;
            min-width: 0;
          }
          .private-insight-name {
            color: black;
            font-style: normal;
          }
        }
      }
    }
  }

  .no-insight-warning {
    margin-top: 5px;
    margin-left: 20px;
  }

  .delete-confirm-alert {
    margin-bottom: 10px;
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
