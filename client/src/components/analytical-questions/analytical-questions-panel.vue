<template>
  <modal-new-analytical-question
    v-if="showNewAnalyticalQuestion === true"
    @close="onNewAnalyticalQuestion" />
  <side-panel
    class="analytical-questions-panel-container"
    :tabs="AnalyticalQuestionsTabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
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
    <div class="analytical-questions-container">
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
                'fa-check-circle step-complete': questionItem.linkedInsights.length > 0,
                'fa-circle step-not-complete': questionItem.linkedInsights.length === 0,
              }"
              @mousedown.stop.prevent
            />
            <span @mousedown.stop.prevent class="checklist-item-text">{{ questionItem.question }}</span>
          </div>
          <!-- second row display a list of linked insights -->
          <div class="checklist-item-insights">
            <div
              v-for="insight in questionItem.linkedInsights"
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
  </side-panel>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex';

import SidePanel from '@/components/side-panel/side-panel.vue';
import { getInsightById, updateInsight, getAllInsights } from '@/services/insight-service';
import { AnalyticalQuestion, Insight } from '@/types/Insight';
import { defineComponent } from 'vue';
import ModalNewAnalyticalQuestion from '@/components/modals/modal-new-analytical-question.vue';
import _ from 'lodash';

export default defineComponent({
  name: 'AnalyticalQuestionsPanel',
  components: {
    SidePanel,
    ModalNewAnalyticalQuestion
  },
  data: () => ({
    AnalyticalQuestionsTabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-file-text' }
    ],
    currentTab: 'Analysis Checklist',
    questionsList: [] as AnalyticalQuestion[],
    selectedQuestion: null as AnalyticalQuestion | null,
    showNewAnalyticalQuestion: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      contextId: 'insightPanel/contextId'
    })
  },
  watch: {
  },
  created() {
  },
  mounted() {
    this.addExampleQuestions();
    this.loadInitialLinkedInsights();
  },
  methods: {
    ...mapActions({
      setQuestions: 'analysisChecklist/setQuestions'
    }),
    deleteSelectedQuestion() {
      if (this.selectedQuestion) {
        this.questionsList = this.questionsList.filter(q => q.question !== this.selectedQuestion?.question);
      }
    },
    addNewQuestion() {
      this.showNewAnalyticalQuestion = true;
    },
    onNewAnalyticalQuestion(result: any) {
      this.showNewAnalyticalQuestion = false;
      if (!result.cancel) {
        this.questionsList.push({
          id: (this.questionsList.length + 1).toString(),
          question: result.text,
          linkedInsights: [],
          visibility: 'public',
          url: '',
          target_view: ''
        });
      }
    },
    addExampleQuestions() {
      this.questionsList.push({
        id: (this.questionsList.length + 1).toString(),
        question: 'What are the key factors and relationships that are causing the problem?',
        linkedInsights: [],
        visibility: 'public',
        url: '',
        target_view: ''
      });
      this.questionsList.push({
        id: (this.questionsList.length + 1).toString(),
        question: 'What is the total crop production under baseline condition?',
        linkedInsights: [],
        visibility: 'public',
        url: '',
        target_view: ''
      });
      this.questionsList.push({
        id: (this.questionsList.length + 1).toString(),
        question: 'What is the theory of change?',
        linkedInsights: [],
        visibility: 'public',
        url: '',
        target_view: ''
      });
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
    async loadInitialLinkedInsights() {
      // @Review upon loading the default questions,
      // existing insights may already be associated with some of them, so we need to reflect that
      const allInsights = await getAllInsights(this.project, this.contextId);
      // compare each insight against all questions
      this.questionsList.forEach(questionItem => {
        allInsights.forEach(insight => {
          if (insight.analytical_question.includes(questionItem.question)) {
            questionItem.linkedInsights.push(insight);
          }
        });
      });

      // update the store to facilitate questions consumption in other UI places
      this.setQuestions(this.questionsList);
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
          const existingIndex = questionItem.linkedInsights.findIndex(i => i.id === loadedInsight.id);
          if (existingIndex < 0) {
            // only add any dropped insight once to each question
            questionItem.linkedInsights.push(loadedInsight);

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

      questionItem.linkedInsights = questionItem.linkedInsights.filter(
        item => item.id !== insight.id
      );

      // update the store to facilitate questions consumption in other UI places
      this.setQuestions(this.questionsList);

      // also, remove this insight from the question list
      insight.analytical_question = insight.analytical_question.filter(
        item => item !== questionItem.question
      );
      updateInsight(insight.id, insight);
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .analytical-questions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1rem;
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
