<template>
  <div class="analytical-questions-panel-container">
    <template v-if="showNewAnalyticalQuestion">
      <h5 class="title"><i class="fa fa-fw fa-question" /> New Analytical Question</h5>
      <textarea
        v-model="newQuestionText"
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
    <template v-else>
      <button
        v-tooltip.top-center="'Promote question to be public and visible to all projects'"
        type="button"
        class="btn btn-primary button-spacing"
        :disabled="selectedQuestion === null"
        @click="promote">
          Promote Question
          <i class="fa fa-question-circle" />
      </button>
      <div class="analytical-questions-header">
        <span>Questions ({{questionsList.length}})</span>
        <div>
          <button
            v-tooltip.top-center="'Delete the selected analytical question'"
            type="button"
            class="btn remove-button button-spacing"
            :disabled="selectedQuestion === null"
            @click="deleteSelectedQuestion">
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
                  'fa-check-circle step-complete': questionItem.linked_insights.length > 0,
                  'fa-circle step-not-complete': questionItem.linked_insights.length === 0,
                }"
                @mousedown.stop.prevent
              />
              <span @mousedown.stop.prevent class="checklist-item-text">{{ questionItem.question }}</span>
            </div>
            <!-- second row display a list of linked insights -->
            <div class="checklist-item-insights">
              <div
                v-for="insight in questionItem.linked_insights"
                :key="insight.id"
                class="checklist-item-insight">
                  <i @mousedown.stop.prevent class="fa fa-star" style="color: orange" />
                  <span @mousedown.stop.prevent style="padding-left: 1rem; padding-right: 1rem;">{{ insight.name }}</span>
                  <i class="fa fa-fw fa-close"
                    style="pointer-events: all; cursor: pointer; margin-left: auto;"
                    @click="deleteLinkedInsight($event, questionItem, insight)" />
              </div>
            </div>
          </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters, useStore } from 'vuex';

import { getInsightById, updateInsight, getAllInsights } from '@/services/insight-service';
import { AnalyticalQuestion, Insight } from '@/types/Insight';
import { computed, defineComponent, ref, watchEffect } from 'vue';
import _ from 'lodash';
import { QUESTIONS } from '@/utils/messages-util';
import { getAllQuestions, addQuestion, deleteQuestion } from '@/services/question-service';

export default defineComponent({
  name: 'ListAnalyticalQuestionsPane',
  setup() {
    const questionsList = ref<AnalyticalQuestion[]>([]);
    const store = useStore();
    const contextId = computed(() => store.getters['insightPanel/contextId']);
    const project = computed(() => store.getters['app/project']);

    const questionsFetchedAt = ref(0);

    // FIXME: refactor into a composable
    watchEffect(onInvalidate => {
      console.log('refetching questions at: ' + new Date(questionsFetchedAt.value).toTimeString());
      let isCancelled = false;
      async function fetchQuestions() {
        const allQuestions = await getAllQuestions(project.value, contextId.value);
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }

        function addExampleQuestions() {
          allQuestions.push({
            id: (allQuestions.length + 1).toString(),
            question: 'What are the key factors and relationships that are causing the problem?',
            linked_insights: [],
            visibility: 'public',
            url: '',
            target_view: ''
          });
          allQuestions.push({
            id: (allQuestions.length + 1).toString(),
            question: 'What is the total crop production under baseline condition?',
            linked_insights: [],
            visibility: 'public',
            url: '',
            target_view: ''
          });
          allQuestions.push({
            id: (allQuestions.length + 1).toString(),
            question: 'What is the theory of change?',
            linked_insights: [],
            visibility: 'public',
            url: '',
            target_view: ''
          });
        }
        addExampleQuestions();

        // @Review upon loading the default questions,
        // existing insights may already be associated with some of them, so we need to reflect that
        const allInsights = await getAllInsights(project.value, contextId.value);
        // compare each insight against all questions
        allQuestions.forEach(questionItem => {
          allInsights.forEach(insight => {
            if (insight.analytical_question.includes(questionItem.question)) {
              // FIXME: add insight id instead
              questionItem.linked_insights.push(insight);
            }
          });
        });
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
      questionsFetchedAt
    };
  },
  data: () => ({
    AnalyticalQuestionsTabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' }
    ],
    currentTab: 'Analysis Checklist',
    selectedQuestion: null as AnalyticalQuestion | null,
    showNewAnalyticalQuestion: false,
    newQuestionText: ''
  }),
  computed: {
    ...mapGetters({
      viewState: 'insightPanel/viewState',
      currentView: 'app/currentView'
    })
  },
  methods: {
    ...mapActions({
      setQuestions: 'analysisChecklist/setQuestions'
    }),
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
    deleteSelectedQuestion() {
      if (this.selectedQuestion) {
        deleteQuestion(this.selectedQuestion.id as string).then(result => {
          const message = result.status === 200 ? QUESTIONS.SUCCESSFUL_REMOVAL : QUESTIONS.ERRONEOUS_REMOVAL;
          if (message === QUESTIONS.SUCCESSFUL_REMOVAL) {
            (this as any).toaster(message, 'success', false);
            // refresh
            this.questionsList = this.questionsList.filter(q => q.question !== this.selectedQuestion?.question);
            this.setQuestions(this.questionsList);
          } else {
            (this as any).toaster(message, 'error', true);
          }
        });
      }
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
      }

      const insight_id = evt.dataTransfer.getData('insight_id');
      if (insight_id !== '') {
        // fetch the dropped insight and use its name in this question's insights
        const loadedInsight = await getInsightById(insight_id);
        if (loadedInsight) {
          const existingIndex = questionItem.linked_insights.findIndex(i => i.id === loadedInsight.id);
          if (existingIndex < 0) {
            // only add any dropped insight once to each question
            questionItem.linked_insights.push(loadedInsight);

            // update the store to facilitate questions consumption in other UI places
            this.setQuestions(this.questionsList);
          }
          // add the following question (text) to the insight
          if (!loadedInsight.analytical_question.includes(questionItem.question)) {
            loadedInsight.analytical_question.push(questionItem.question);
            updateInsight(loadedInsight.id, loadedInsight);
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
    deleteLinkedInsight(evt: any, questionItem: AnalyticalQuestion, insight: Insight) {
      evt.preventDefault();
      evt.stopPropagation();

      questionItem.linked_insights = questionItem.linked_insights.filter(
        item => item.id !== insight.id
      );

      // update the store to facilitate questions consumption in other UI places
      this.setQuestions(this.questionsList);

      // also, remove this insight from the question list
      insight.analytical_question = insight.analytical_question.filter(
        item => item !== questionItem.question
      );
      updateInsight(insight.id as string, insight);
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
        font-size: 16px;
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
          }
        }
      }
    }
  }
</style>
