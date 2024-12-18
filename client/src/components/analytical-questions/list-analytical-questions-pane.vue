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
                class="insight-name private-insight-name"
                :class="{
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

<script setup lang="ts">
import { ref } from 'vue';
import _ from 'lodash';

import useInsightsData from '@/composables/useInsightsData';
import { updateInsight } from '@/services/insight-service';
import {
  AnalyticalQuestion,
  FullInsight,
  Insight,
  NewInsight,
  SectionWithInsights,
} from '@/types/Insight';
import { QUESTIONS } from '@/utils/messages-util';
import MessageDisplay from '../widgets/message-display.vue';
import OptionsButton from '../widgets/options-button.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';

type PartialInsight = {
  id: string;
  name: string;
  visibility: string;
};

const HOVER_CLASS = {
  REORDERING_SECTION: 'reorder-section-hover',
  REORDERING_INSIGHT: 'reorder-insight-hover',
};

// TODO: eventually we'll be able to click checklist items everywhere, at
//  which point we can remove this prop.
defineProps<{
  showChecklistTitle: boolean;
  canClickChecklistItems: boolean;
  insightsBySection: SectionWithInsights[];
}>();
const toaster = useToaster();
// FIXME: hoist insights to parent component so that we're not fetching and
//  managing two copies
const { insights, reFetchInsights } = useInsightsData(['id', 'name', 'visibility']);

const getInsightById = (insightId: string) => {
  return insights.value.find((insight) => insight.id === insightId) as PartialInsight | undefined;
};

const questionsExpanded = ref(true);

const emit = defineEmits([
  'item-click',
  'update-section-title',
  'add-section',
  'delete-section',
  'move-section-above-section',
  'remove-insight-from-section',
  'move-insight',
]);
const selectedQuestion = ref<AnalyticalQuestion | null>(null);
const isEditModalOpen = ref(false);
const editSection = (section: AnalyticalQuestion) => {
  selectedQuestion.value = section;
  isEditModalOpen.value = true;
};

const onEditModalConfirm = (newSectionTitle: string) => {
  if (selectedQuestion.value === null) {
    console.error('No question is selected.');
    return;
  }
  const handleFailedUpdate = () => {
    toaster(QUESTIONS.ERRONEOUS_UPDATE, TYPE.INFO, true);
  };
  emit(
    'update-section-title',
    // Assert that ID is defined, since we should never be able to fetch a
    //  question before it's stored with an ID
    selectedQuestion.value.id as string,
    newSectionTitle,
    handleFailedUpdate
  );
  selectedQuestion.value = null;
  isEditModalOpen.value = false;
};

const showNewAnalyticalQuestion = ref(false);

const newQuestionText = ref('');

// TODO: clarify these function names
const addNewQuestion = () => {
  newQuestionText.value = '';
  showNewAnalyticalQuestion.value = true;
};
const onNewAnalyticalQuestion = () => {
  showNewAnalyticalQuestion.value = false;
  const handleSuccessfulAddition = () => {
    toaster(QUESTIONS.SUCCESSFUL_ADDITION, TYPE.SUCCESS, false);
  };
  const handleFailedAddition = () => {
    toaster(QUESTIONS.ERRONEOUS_ADDITION, TYPE.INFO, true);
  };
  emit('add-section', newQuestionText.value, handleSuccessfulAddition, handleFailedAddition);
};

const initiateQuestionDeletion = (question: AnalyticalQuestion) => {
  selectedQuestion.value = question;
  deleteSelectedQuestion();
};

const deleteSelectedQuestion = () => {
  if (selectedQuestion.value) {
    const handleSuccessfulDeletion = () => {
      toaster(QUESTIONS.SUCCESSFUL_REMOVAL, TYPE.SUCCESS, false);
    };
    const handleFailedDeletion = () => {
      toaster(QUESTIONS.ERRONEOUS_REMOVAL, TYPE.INFO, true);
    };
    emit(
      'delete-section',
      selectedQuestion.value.id as string,
      handleSuccessfulDeletion,
      handleFailedDeletion
    );
  }
  selectedQuestion.value = null;
};

const startDraggingSection = (evt: any, section: AnalyticalQuestion) => {
  evt.dataTransfer.dropEffect = 'move';
  evt.dataTransfer.effectAllowed = 'move';
  evt.dataTransfer.setData('section_id', section.id);
};

const onDrop = async (evt: any, targetSection: AnalyticalQuestion) => {
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
    emit('move-insight', droppedInsightId, droppedSectionId, targetSection.id as string, position);
    const insight = getInsightById(droppedInsightId);
    if (insight === undefined || droppedSectionId === targetSection.id) {
      return;
    }
    await updateInsight(droppedInsightId, insight as Partial<Insight | NewInsight>);
    reFetchInsights();
  } else if (types.includes('section_id')) {
    // Move dropped section above targetSection
    emit('move-section-above-section', droppedSectionId, targetSection.id);
  }
};

const addDragOverClassToSection = (evt: DragEvent) => {
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
};

const onDragLeave = (evt: DragEvent) => {
  if (evt.currentTarget instanceof HTMLElement) {
    evt.currentTarget.classList.remove(...Object.values(HOVER_CLASS));
  }
};
const startDraggingInsight = (
  event: DragEvent,
  insight: FullInsight | NewInsight,
  sectionId: string
) => {
  event.stopPropagation();
  if (event.dataTransfer === null || !(event.currentTarget instanceof HTMLElement)) {
    return;
  }
  event.dataTransfer.dropEffect = 'move';
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('insight_id', insight.id as string);
  event.dataTransfer.setData('section_id', sectionId);
};
const addDragOverClassToInsight = (evt: DragEvent) => {
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
};
const dropInsightOnInsight = async (
  event: DragEvent,
  targetSection: AnalyticalQuestion,
  targetInsightId: string
) => {
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
  emit(
    'move-insight',
    droppedInsightId,
    droppedSectionId,
    targetSection.id as string,
    insertionPosition
  );
  // Update the list of sections that this insight is linked to.
  const insight = getInsightById(droppedInsightId);
  if (insight === undefined || droppedSectionId === targetSection.id) {
    return;
  }
  // Update insight's list of the sections it's linked to
  await updateInsight(droppedInsightId, insight as Partial<Insight | NewInsight>);
  reFetchInsights();
};

const removeRelationBetweenInsightAndQuestion = (
  evt: any,
  questionItem: AnalyticalQuestion,
  insightId: string
) => {
  evt.preventDefault();
  evt.stopPropagation();
  emit('remove-insight-from-section', insightId, questionItem.id);
};
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
