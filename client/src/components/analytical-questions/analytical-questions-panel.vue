<template>
  <side-panel
    class="analytical-questions-panel-container"
    :tabs="AnalyticalQuestionsTabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
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
      >
          <!-- first row display the question -->
          <div class="checklist-item-question">
            <i
              class="step-icon-common fa fa-lg fa-border"
              :class="{
                'fa-check-circle step-complete': questionItem.linkedInsights.length > 0,
                'fa-circle step-not-complete': questionItem.linkedInsights.length === 0,
              }"
            />
            <span class="checklist-item-text">{{ questionItem.question }}</span>
          </div>
          <!-- second row display a list of linked insights -->
          <div class="checklist-item-insights">
            <div
              v-for="insight in questionItem.linkedInsights"
              :key="insight.id"
              class="checklist-item-insight">
                <i class="fa fa-star" style="color: orange" />
                <span style="padding-left: 1rem; padding-right: 1rem;">{{ insight.name }}</span>
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

export default defineComponent({
  name: 'AnalyticalQuestionsPanel',
  components: {
    SidePanel
  },
  data: () => ({
    AnalyticalQuestionsTabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-file-text' }
    ],
    currentTab: 'Analysis Checklist',
    questionsList: [] as AnalyticalQuestion[],
    selectedQuestion: null as AnalyticalQuestion | null
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
    addExampleQuestions() {
      this.questionsList.push({
        id: '0', // similar to insight id; will be used to load the question context
        question: 'What are the key factors and relationships that are causing the problem?',
        linkedInsights: [],
        visibility: 'public',
        url: '',
        target_view: ''
      });
      this.questionsList.push({
        id: '1',
        question: 'What is the total crop production under baseline condition?',
        linkedInsights: [],
        visibility: 'public',
        url: '',
        target_view: ''
      });
      this.questionsList.push({
        id: '2',
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
    applyQuestionContext(question: AnalyticalQuestion) {
      this.selectedQuestion = question;
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
    async onDrop(evt: any, questionItem: AnalyticalQuestion) {
      // prevent default action (open as link for some elements)
      evt.preventDefault();
      evt.currentTarget.style.background = 'white';

      const insight_id = evt.dataTransfer.getData('insight_id');
      // fetch the dropped insight and use its name in this question's insights
      const loadedInsight = await getInsightById(insight_id);
      if (loadedInsight) {
        const existingIndex = questionItem.linkedInsights.findIndex(i => i.id === loadedInsight.id);
        if (existingIndex >= 0) {} else {
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
      margin-left: 1rem;
      margin-right: 1rem;
      overflow: auto;

      .checklist-item {
        flex-direction: column;
        font-size: 16px;
        display: flex;
        margin-bottom: 10px;
        padding: 5px;

        .checklist-item-question {
          flex-direction: row;
          display: flex;
          align-items: center;
          cursor: pointer;
          // pointer-events: none;

          .checklist-item-text {
            padding: 0 10px;
            width: 180px;
            display: inline-block;
          }
        }

        .checklist-item-insights {
          flex-direction: column;
          display: flex;
          // pointer-events: none;

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
          }
        }
      }
    }
  }
</style>
