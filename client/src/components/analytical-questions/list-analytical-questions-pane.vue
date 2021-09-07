<template>
  <div class="analytical-questions-panel-container">
    <template v-if="showDeleteModal">
      <h5 class="title"><i class="fa fa-fw fa-question" /> Delete Public Question</h5>
      <p>
        Are you sure you want to delete?
        <br/>
        <b style="color: red">Note this deletion will remove the question from all projects!</b>
      </p>

      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="showDeleteModal = false">
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
      <h5 class="title"><i class="fa fa-fw fa-question" /> New Analytical Question</h5>
      <textarea
        v-model="newQuestionText"
        v-focus
        type="text"
        placeholder="Enter a new analytical question"
        rows="10"
        class="row question-text col-md-11"
      />
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
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
    <template v-if="showDeleteModal === false && showNewAnalyticalQuestion === false">
      <div class="analytical-questions-header">
        <span>Questions ({{questionsList.length}})</span>
        <div style="display: flex; align-items: center">
          <button
            v-tooltip.top-center="'Delete the selected analytical question'"
            type="button"
            class="btn remove-button button-spacing"
            :disabled="selectedQuestion === null"
            @click="initiateQuestionDeletion">
              <i class="fa fa-trash" />
              Delete
          </button>
          <button
            v-tooltip.top-center="'Add a new analytical question'"
            type="button"
            class="btn btn-primary btn-call-for-action button-spacing"
            @click="addNewQuestion">
              <i class="fa fa-plus-circle" />
              Add
          </button>
          <div class="insight-action" @click.stop="isOpenEditor=!isOpenEditor">
            <i class="fa fa-ellipsis-v insight-header-btn" />
            <dropdown-control v-if="isOpenEditor" class="insight-editor-dropdown">
              <template #content>
                <div
                  class="dropdown-option"
                  :class="{'disabled': selectedQuestion === null}"
                  @click="promote"
                >
                  <i class="fa fa-edit" />
                  Promote
                </div>
              </template>
            </dropdown-control>
          </div>
        </div>
      </div>
      <div v-if="questionsList.length > 0" class="analytical-questions-container">
        <div
          v-for="questionItem in questionsList"
          :key="questionItem.id"
          class="checklist-item"
          :class="{'step-selected': selectedQuestion && questionItem.question === selectedQuestion.question}"
          @click="applyQuestionContext(questionItem)"
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
              <i
                class="step-icon-common fa fa-lg fa-border"
                :class="{
                  'fa-check-circle step-complete': fullLinkedInsights(questionItem.linked_insights).length > 0,
                  'fa-circle step-not-complete': fullLinkedInsights(questionItem.linked_insights).length === 0,
                }"
                @mousedown.stop.prevent
              />
              <span
                @mousedown.stop.prevent
                class="checklist-item-text"
                :class="{ 'private-question-title': questionItem.visibility === 'private' }">
                  {{ questionItem.question }}
              </span>
              <i
                v-if="hasTour(questionItem)"
                class="fa fa-lg fa-info-circle"
                :disabled="canStartTour()"
                @click.stop.prevent="startTour(questionItem)"
                @mousedown.stop.prevent
              />
            </div>
            <!-- second row display a list of linked insights -->
            <div class="checklist-item-insights">
              <div
                v-for="insight in fullLinkedInsights(questionItem.linked_insights)"
                :key="insight.id"
                class="checklist-item-insight">
                  <i @mousedown.stop.prevent class="fa fa-star" style="color: orange" />
                  <span
                    @mousedown.stop.prevent
                    class="insight-style"
                    :class="{ 'insight-style-private': insight.visibility === 'private' }">
                    {{ insight.name }}
                  </span>
                  <i class="fa fa-fw fa-close"
                    style="pointer-events: all; cursor: pointer; margin-left: auto;"
                    @click="removeRelationBetweenInsightAndQuestion($event, questionItem, insight.id)" />
              </div>
            </div>
          </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters, useStore } from 'vuex';

import { getInsightById, updateInsight } from '@/services/insight-service';
import { AnalyticalQuestion, Insight } from '@/types/Insight';
import { computed, defineComponent, ref, watchEffect } from 'vue';
import _ from 'lodash';
import { QUESTIONS } from '@/utils/messages-util';
import { getAllQuestions, addQuestion, deleteQuestion, updateQuestion, getContextSpecificQuestions } from '@/services/question-service';
import DropdownControl from '@/components/dropdown-control.vue';
import useInsightsData from '@/services/composables/useInsightsData';
import Shepherd from 'shepherd.js';

export default defineComponent({
  name: 'ListAnalyticalQuestionsPane',
  components: {
    DropdownControl
  },
  setup() {
    const questionsList = ref<AnalyticalQuestion[]>([]);

    const store = useStore();
    const contextId = computed(() => store.getters['insightPanel/contextId']);
    const project = computed(() => store.getters['app/project']);
    const currentView = computed(() => store.getters['app/currentView']);

    const questionsFetchedAt = ref(0);

    // save a local copy of all insights for quick reference whenever needed
    // FIXME: ideally this should be from a store so that changes to the insight list externally are captured
    const { insights: allInsights } = useInsightsData();

    const insightsById = (id: string) => allInsights.value.find(i => i.id === id);

    const fullLinkedInsights = (linked_insights: string[]) => {
      const result: Insight[] = [];
      linked_insights.forEach(insightId => {
        const ins = insightsById(insightId);
        if (ins) {
          result.push(ins);
        }
      });
      return result;
    };

    // FIXME: refactor into a composable
    watchEffect(onInvalidate => {
      console.log('refetching questions at: ' + new Date(questionsFetchedAt.value).toTimeString());
      let isCancelled = false;
      async function fetchQuestions() {
        let allQuestions;
        // allQuestions = await getAllQuestions(project.value);

        if (contextId.value === '') {
          allQuestions = await getAllQuestions(project.value);
        } else {
          allQuestions = await getContextSpecificQuestions(project.value, contextId.value, currentView.value);
        }

        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }

        // update the store to facilitate questions consumption in other UI places
        store.dispatch('analysisChecklist/setQuestions', allQuestions);

        questionsList.value = allQuestions;
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchQuestions();
    });
    return {
      questionsList,
      contextId,
      project,
      questionsFetchedAt,
      insightsById,
      fullLinkedInsights
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
    showDeleteModal: false,
    isOpenEditor: false,
    toursMetadata: [
      {
        baseQuestion: 'What are the appropriate aggregation functions?',
        targetView: 'data'
      },
      {
        baseQuestion: 'What are the key influences causing change in a node?',
        targetView: 'quantitative'
      }
    ]
  }),
  computed: {
    ...mapGetters({
      viewState: 'insightPanel/viewState',
      currentView: 'app/currentView',
      isReadyForNextStep: 'tour/isReadyForNextStep',
      isPanelOpen: 'insightPanel/isPanelOpen'
    })
  },
  methods: {
    ...mapActions({
      setQuestions: 'analysisChecklist/setQuestions',
      setTour: 'tour/setTour'
    }),
    hasTour(questionItem: AnalyticalQuestion): boolean {
      return this.toursMetadata.findIndex(t => t.baseQuestion === questionItem.question) >= 0;
    },
    canStartTour() {
      // if the tour's target-view is compatible with currentView and no modal is shown
      return !this.isPanelOpen &&
             this.toursMetadata.findIndex(t => t.targetView === this.currentView) >= 0;
    },
    promote() {
      // update selectedQuestion to be public, i.e., visible in all projects
      if (this.selectedQuestion) {
        this.selectedQuestion.visibility = 'public';
        this.selectedQuestion.project_id = '';
        this.selectedQuestion.context_id = [''];
        this.selectedQuestion.url = '';
        updateQuestion(this.selectedQuestion.id as string, this.selectedQuestion).then(result => {
          const message = result.status === 200 ? QUESTIONS.SUCCESFUL_UPDATE : QUESTIONS.ERRONEOUS_UPDATE;
          // FIXME: cast to 'any' since typescript cannot see mixins yet!
          if (message === QUESTIONS.SUCCESFUL_UPDATE) {
            (this as any).toaster(message, 'success', false);
          } else {
            (this as any).toaster(message, 'error', true);
          }
        });
      }
    },
    addNewQuestion() {
      this.newQuestionText = '';
      this.showNewAnalyticalQuestion = true;
    },
    onNewAnalyticalQuestion() {
      this.showNewAnalyticalQuestion = false;

      const url = this.$route.fullPath;
      const newQuestion: AnalyticalQuestion = {
        question: this.newQuestionText,
        description: '',
        visibility: 'private', // questions are always added with private visibility but can be promoted to be public
        project_id: this.project,
        context_id: this.contextId,
        url,
        target_view: this.currentView,
        pre_actions: null,
        post_actions: null,
        linked_insights: [],
        view_state: this.viewState
      };
      addQuestion(newQuestion).then((result) => {
        const message = result.status === 200 ? QUESTIONS.SUCCESSFUL_ADDITION : QUESTIONS.ERRONEOUS_ADDITION;
        // FIXME: cast to 'any' since typescript cannot see mixins yet!
        if (message === QUESTIONS.SUCCESSFUL_ADDITION) {
          (this as any).toaster(message, 'success', false);
          // refresh the latest list from the server
          this.questionsFetchedAt = Date.now();
        } else {
          (this as any).toaster(message, 'error', true);
        }
      });
    },
    initiateQuestionDeletion() {
      if (this.selectedQuestion?.visibility === 'public') {
        this.showDeleteModal = true;
      } else {
        this.deleteSelectedQuestion();
      }
    },
    deleteSelectedQuestion() {
      if (this.selectedQuestion) {
        // REVIEW: delete this question from any insight that references it
        const selectedQuestionLinkedInsights = this.selectedQuestion?.linked_insights as string[];
        selectedQuestionLinkedInsights.forEach(insightId => {
          this.removeQuestionFromInsight(this.selectedQuestion as AnalyticalQuestion, insightId);
        });

        // refresh
        this.questionsList = this.questionsList.filter(q => q.question !== this.selectedQuestion?.question);
        this.setQuestions(this.questionsList);

        deleteQuestion(this.selectedQuestion.id as string).then(result => {
          const message = result.status === 200 ? QUESTIONS.SUCCESSFUL_REMOVAL : QUESTIONS.ERRONEOUS_REMOVAL;
          if (message === QUESTIONS.SUCCESSFUL_REMOVAL) {
            (this as any).toaster(message, 'success', false);
          } else {
            (this as any).toaster(message, 'error', true);
          }
        });
      }
      this.selectedQuestion = null;
      this.showDeleteModal = false;
    },
    setActive(tab: string) {
      this.currentTab = tab;
    },
    applyQuestionContext(analyticalQuestion: AnalyticalQuestion) {
      if (this.selectedQuestion && this.selectedQuestion.question === analyticalQuestion.question) {
        this.selectedQuestion = null;
      } else {
        this.selectedQuestion = analyticalQuestion;
      }
    },
    onDragStart(evt: any, questionItem: AnalyticalQuestion) {
      this.selectedQuestion = null;
      evt.dataTransfer.dropEffect = 'move';
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('question_id', questionItem.id);
    },
    async onDrop(evt: any, questionItem: AnalyticalQuestion) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.currentTarget.style.background = 'white';

      const question_id = evt.dataTransfer.getData('question_id');
      if (question_id !== '') {
        // swap questions: question_id and questionItem.id
        const questions = _.cloneDeep(this.questionsList);
        const i1 = questions.findIndex(q => q.id === question_id);
        const i2 = questions.findIndex(q => q.id === questionItem.id);
        // swap
        const q1 = questions[i1];
        questions[i1] = questions[i2];
        questions[i2] = q1;
        // update
        this.questionsList = questions;

        // update the store to facilitate questions consumption in other UI places
        this.setQuestions(this.questionsList);

        // NOTE: re-ordering of questions is not persistent (and shouldn't be)
      }

      const insight_id = evt.dataTransfer.getData('insight_id');
      if (insight_id !== '') {
        // fetch the dropped insight and use its name in this question's insights
        const loadedInsight: Insight = await getInsightById(insight_id);
        if (loadedInsight) {
          const existingIndex = questionItem.linked_insights.findIndex(id => id === loadedInsight.id);
          if (existingIndex < 0) {
            // only add any dropped insight once to each question
            questionItem.linked_insights.push(loadedInsight.id as string);

            // update question on the backend
            updateQuestion(questionItem.id as string, questionItem);

            // update the store to facilitate questions consumption in other UI places
            this.setQuestions(this.questionsList);
          }
          // add the following question (text) to the insight
          if (!(loadedInsight.analytical_question.findIndex(qid => qid === questionItem.id) >= 0)) {
            loadedInsight.analytical_question.push(questionItem.id as string);
            updateInsight(loadedInsight.id as string, loadedInsight);
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
    },
    onDragLeave(evt: any) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.stopPropagation();

      // Change the source element's background color back to white
      evt.currentTarget.style.background = 'white';
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
      this.setQuestions(this.questionsList);

      //
      // insight
      //

      // update an insight, first fetch the insight to grab its list of linked_questions and update it
      // also, remove this insight from the question list
      this.removeQuestionFromInsight(questionItem, insightId);
    },
    removeQuestionFromInsight(questionItem: AnalyticalQuestion, insightId: string) {
      const insight: any = this.insightsById(insightId);
      if (insight) {
        insight.analytical_question = insight?.analytical_question.filter(
          (qid: string) => qid !== questionItem.id
        );
        updateInsight(insight?.id as string, insight);
      }
    },
    startTour(question: AnalyticalQuestion) {
      if (this.canStartTour()) {
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
          element: '.x-axis-sensitivity-matrix', // this DOM element is dynamic and will only be available once the sensitivity-analysis-matrix is rendered
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
          element: '.grid-lines', // FIXME: add a unique tour css
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
        id: 'step-2-select-spatial-aggregation',
        text: `Select the appropriate <b>Spatial Aggregation</b>:
               e.g. if there are values at regional level, how should they be aggregated at the country level?
          <br>
          <ul>
            <li>a count: <b>sum</b></li>
            <li>a percentage, rate or probability: <b>mean</b></li>
            <li>an index: <b>mean</b></li>
          </ul>
        `,
        title: 'Select Spatial Aggregation',
        attachTo: {
          element: '.tour-spatial-agg-dropdown-config',
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
        id: 'step-3-select-temporal-aggregation',
        text: `Select the appropriate <b>Temporal Aggregation</b>:
               e.g. if there are values for multiple days in a month, how should they be aggregated as one value for that month?
          <br>
          <ul>
            <li>a count: <b>sum</b></li>
            <li>a percentage, rate or probability: <b>mean</b></li>
            <li>an index: <b>mean</b></li>
          </ul>
        `,
        title: 'Select Temporal Aggregation',
        attachTo: {
          element: '.tour-temporal-agg-dropdown-config',
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
        highlightClass: 'my-highlight',
        // @FIXME: temp solution to expand the highlighted-target area to include
        //  the dropdown config options to allow the user to select one of them before advancing the tour
        modalOverlayOpeningPadding: 100
      };

      const stepFour = {
        id: 'step-4-aggregation-summary',
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

      tour.addSteps([stepOne, stepTwo, stepThree, stepFour]);
      tour.start();

      // save this newly created tour in the store
      this.setTour(tour);
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .question-text {
    margin: 1rem;
    border-color: gray;
    border-width: thin;
  }

  .button-spacing {
    padding: 4px;
    margin: 2px;
  }

  .remove-button {
    background: #F44336;
    color: white;
    font-weight: 600;
    border: none;
    user-select: none;
    &:hover {
      color: white;
    }
  }

  .step-selected {
    // background-color: lightblue;
    border: 2px solid darkgray;
  }
  .step-icon-common {
    border-width: 1px;
    border-style: solid;
    border-radius: 100% 100% 100% 100%;
    padding: 0;
  }

  .step-complete {
    color: black;
  }

  .step-not-complete {
    border-color: black;
    color: transparent;
  }

  .drag-over {
    border-style: solid;
    border: blue;
    border-width: 1px;
    background-color: red;
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

  .analytical-questions-panel-container {
    margin-top: 5px;
    display: flex;
    flex-direction: column;

    .analytical-questions-header-promote {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 1rem;
    }

    .analytical-questions-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 1rem;
    }

    .analytical-questions-container {
      overflow-y: auto;
      height: 100%;

      .checklist-item {
        flex-direction: column;
        display: flex;
        font-size: $font-size-medium;
        margin-bottom: 10px;
        padding: 5px;

        .checklist-item-question {
          flex-direction: row;
          display: flex;
          align-items: center;
          cursor: pointer;

          .checklist-item-menu {
            padding: 5px;
            cursor: move;
          }

          .checklist-item-text {
            user-select: none;
            padding: 0 10px;
            width: 170px;
            display: inline-block;
            color: gray;
          }
          .private-question-title {
            color: black;
          }
        }

        .checklist-item-insights {
          flex-direction: column;
          display: flex;

          .checklist-item-insight {
            background-color: lightgray;
            margin: 2px;
            padding-left: 1rem;
            padding-right: 1rem;
            border: 1px solid darkgray;
            border-radius: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            .insight-style {
              padding-left: 1rem;
              padding-right: 1rem;
              color: gray;
              font-style: italic;
            }
            .insight-style-private {
              color: black;
              font-style: normal;
            }
          }
        }
      }
    }
  }
</style>
