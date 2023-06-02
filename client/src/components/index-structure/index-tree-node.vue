<template>
  <div class="index-tree-node-container" :class="classObject" @click="selectNode">
    <div class="disable-overlay" />
    <div v-if="isConceptNodeWithoutDataset(props.nodeData)" class="input-arrow" />
    <template v-if="showDatasetSearch">
      <IndexTreeNodeSearchBar
        :initial-search-text="props.nodeData.name"
        @select-dataset="attachDataset"
        @set-node-name="setNodeName"
        @cancel="cancelDatasetSearch"
      />
      <IndexTreeNodeAdvancedSearchButton
        class="advanced-search-button"
        :node-id="props.nodeData.id"
      />
    </template>
    <div v-else-if="showEditName" class="rename content flex">
      <input
        v-focus
        class="form-control"
        type="text"
        :placeholder="renameInputTextPlaceholder"
        v-model="renameInputText"
        @keyup.escape="cancelRename"
        @keyup.enter="handleRenameDone"
      />
      <button
        class="btn btn-default"
        @click="handleRenameDone"
        :disabled="renameInputText === '' && renameInputTextPlaceholder === ''"
      >
        Done
      </button>
    </div>
    <div v-else class="header content">
      <div class="name">
        {{ props.nodeData.name }}
      </div>
      <OptionsButton :dropdown-below="true" :wider-dropdown-options="true" @click.stop="">
        <template #content>
          <div
            v-for="item in optionsButtonMenu"
            class="dropdown-option"
            :key="item.type"
            @click="handleOptionsButtonClick(item.type)"
          >
            <i class="fa fa-fw" :class="item.icon" />
            {{ item.text }}
          </div>
        </template>
      </OptionsButton>
    </div>
    <div v-if="isConceptNodeWithoutDataset(props.nodeData) && !showDatasetSearch" class="content">
      <p
        v-if="dataSourceText.length > 0"
        class="un-font-small data-source-text subdued"
        :class="{ warning: isEmptyNode(props.nodeData) }"
      >
        {{ dataSourceText }}
      </p>
      <button
        v-if="!showEditName"
        class="btn btn-default full-width-button"
        @click="emit('create-child', props.nodeData.id)"
      >
        Add input concept
      </button>
      <button
        v-if="showAttachDatasetButton"
        class="btn btn-default full-width-button button-top-margin"
        @click="isSearchingForDataset = true"
      >
        <i class="fa fa-fw" :class="DATASET_ICON" />
        Attach dataset
      </button>
      <button
        v-if="showSeeResultsButton"
        class="btn btn-sm btn-call-to-action full-width-button button-top-margin"
        :disabled="!canViewResults"
        @click="seeResults"
      >
        See results
      </button>
    </div>
    <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)" class="content">
      <div class="flex dataset-label" :style="{ color: DATASET_COLOR }">
        <i class="fa fa-fw" :class="DATASET_ICON" />
        <span class="un-font-small expand">Dataset</span>
        <InvertedDatasetLabel v-if="props.nodeData.dataset.isInverted" />
      </div>
      <p class="un-font-small subdued">
        {{ dataSourceText }}
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ConceptNode, DatasetSearchResult } from '@/types/Index';
import {
  duplicateNode,
  isEmptyNode,
  isConceptNodeWithoutDataset,
  isConceptNodeWithDatasetAttached,
  DATASET_ICON,
  isOutputIndexNode,
  getNodeDataSourceText,
  DATASET_COLOR,
  indexNodeTreeContainsDataset,
} from '@/utils/index-tree-util';
import OptionsButton from '@/components/widgets/options-button.vue';
import IndexTreeNodeSearchBar from '@/components/index-structure/index-tree-node-search-bar.vue';
import IndexTreeNodeAdvancedSearchButton from '@/components/index-structure/index-tree-node-advanced-search-button.vue';
import { OptionButtonMenu, MENU_OPTIONS } from '@/utils/index-common-util';
import InvertedDatasetLabel from '../widgets/inverted-dataset-label.vue';
import useIndexTree from '@/services/composables/useIndexTree';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ProjectType } from '@/types/Enums';

interface Props {
  nodeData: ConceptNode;
  isSelected: boolean;
  isConnecting: boolean;
  isDescendentOfConnectingNode: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'rename', nodeId: string, newName: string): void;
  (e: 'delete', deleted: ConceptNode): void;
  (e: 'duplicate', duplicated: ConceptNode): void;
  (e: 'select', nodeId: string): void;
  (e: 'create-child', parentNodeId: string): void;
  (e: 'detach-dataset', nodeId: string): void;
  (e: 'switch-dataset', nodeId: string): void;
  (
    e: 'attach-dataset',
    nodeId: string,
    dataset: DatasetSearchResult,
    nodeNameAfterAttachingDataset: string
  ): void;
  (e: 'create-edge', nodeId: string): void;
}>();

const classObject = computed(() => {
  return {
    selected: props.isSelected,
    'flexible-width': showDatasetSearch.value,
    disabled: disableInteraction.value,
    'no-highlight':
      props.isConnecting &&
      (!isConceptNodeWithoutDataset(props.nodeData) || props.isDescendentOfConnectingNode),
  };
});

const selectNode = () => {
  if (!props.isConnecting) {
    emit('select', props.nodeData.id);
  } else if (
    props.isConnecting &&
    !props.isDescendentOfConnectingNode &&
    isConceptNodeWithoutDataset(props.nodeData)
  ) {
    emit('create-edge', props.nodeData.id);
  }
};

// Rename

const isRenaming = ref(false);
const renameInputText = ref('');

const showEditName = computed(() => {
  // props.nodeData.name === '' means that the node has never been given a name
  return props.nodeData.name === '' || isRenaming.value;
});
const renameInputTextPlaceholder = computed(() => {
  return isConceptNodeWithDatasetAttached(props.nodeData) ? props.nodeData.dataset.datasetName : '';
});

const cancelRename = () => {
  if (props.nodeData.name === '') {
    // the "create index node" flow has never been completed, so delete node.
    emit('delete', props.nodeData);
  } else {
    isRenaming.value = false;
  }
};
const handleRenameDone = () => {
  if (
    // Can't exit the flow with an empty rename bar unless this is a dataset node
    renameInputText.value === '' &&
    !isConceptNodeWithDatasetAttached(props.nodeData)
  ) {
    return;
  }
  const shouldRevertToDatasetName =
    renameInputText.value === '' && isConceptNodeWithDatasetAttached(props.nodeData);
  const newNodeName = shouldRevertToDatasetName
    ? props.nodeData.dataset.datasetName
    : renameInputText.value;
  emit('rename', props.nodeData.id, newNodeName);
  isRenaming.value = false;
  renameInputText.value = '';
};

const optionsButtonMenu = computed(() => {
  if (props.nodeData.isOutputNode) {
    return [MENU_OPTIONS.RENAME];
  }
  if (showEditName.value) {
    return [MENU_OPTIONS.DELETE];
  }
  if (isConceptNodeWithDatasetAttached(props.nodeData)) {
    return [
      MENU_OPTIONS.RENAME,
      MENU_OPTIONS.DUPLICATE,
      MENU_OPTIONS.DELETE,
      MENU_OPTIONS.REMOVE_DATASET,
    ];
  }
  return [MENU_OPTIONS.RENAME, MENU_OPTIONS.DUPLICATE, MENU_OPTIONS.DELETE];
});

const handleOptionsButtonClick = (option: OptionButtonMenu) => {
  switch (option) {
    case OptionButtonMenu.Rename:
      renameInputText.value = props.nodeData.name;
      isRenaming.value = true;
      break;
    case OptionButtonMenu.Duplicate:
      emit('duplicate', duplicateNode(props.nodeData));
      break;
    case OptionButtonMenu.Delete:
      emit('delete', props.nodeData);
      break;
    case OptionButtonMenu.ChangeDataset:
      emit('detach-dataset', props.nodeData.id); // menu option has been removed for now, to be reassessed later
      break;
    case OptionButtonMenu.RemoveDataset:
      emit('switch-dataset', props.nodeData.id);
      break;
    default:
      break;
  }
};

const showAttachDatasetButton = computed(
  () =>
    isEmptyNode(props.nodeData) &&
    !isOutputIndexNode(props.nodeData) &&
    !showDatasetSearch.value &&
    !showEditName.value
);

const showSeeResultsButton = computed(
  () => isOutputIndexNode(props.nodeData) && !showDatasetSearch.value && !showEditName.value
);
const indexTree = useIndexTree();
const canViewResults = computed(() => indexNodeTreeContainsDataset(indexTree.tree.value));
const router = useRouter();
const route = useRoute();
const store = useStore();
const project = computed(() => store.getters['app/project']);
const analysisId = computed(() => route.params.analysisId as string);
const seeResults = () => {
  router.push({
    name: 'indexResults',
    params: {
      project: project.value,
      analysisId: analysisId.value,
      projectType: ProjectType.Analysis,
    },
  });
};

// Dataset search

const disableInteraction = ref(false);
// Whenever the data for this node changes (e.g. when attaching a dataset), re-enable interactions.
watch(
  () => props.nodeData,
  () => {
    disableInteraction.value = false;
  },
  { deep: true }
);
const isSearchingForDataset = ref(false);

const showDatasetSearch = computed(
  () =>
    isEmptyNode(props.nodeData) &&
    // props.nodeData.name === '' means that the "create dataset node" flow has never been completed.
    (isSearchingForDataset.value === true || props.nodeData.name === '')
);

const cancelDatasetSearch = () => {
  if (props.nodeData.name === '') {
    // the "create dataset node" flow has never been completed, so delete node.
    emit('delete', props.nodeData);
  } else {
    isSearchingForDataset.value = false;
  }
};
const setNodeName = (value: string) => {
  emit('rename', props.nodeData.id, value);
  isSearchingForDataset.value = false;
};
const attachDataset = (dataset: DatasetSearchResult, nodeNameAfterAttachingDataset: string) => {
  emit('attach-dataset', props.nodeData.id, dataset, nodeNameAfterAttachingDataset);
  isSearchingForDataset.value = false;
  // Once attach-dataset event is fired, further interaction with data search or selection should
  //  not be done until the node data is changed and the watcher above has fired to re-enable
  //  interactions.
  disableInteraction.value = true;
};

const dataSourceText = computed(() => getNodeDataSourceText(props.nodeData));
</script>

<style scoped lang="scss">
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/common';
@import '@/styles/index-graph';

$option-button-width: 16px;

.index-tree-node-container {
  @include index-tree-node;

  &.flexible-width {
    width: auto;
  }

  &.no-highlight:hover {
    cursor: not-allowed;
  }

  &:not(.no-highlight):hover {
    @include index-tree-node-hover;
  }

  // When node is selected, we want to show a 2px accent color border outside.
  // To avoid adjusting the size of the node element, use ::before to make a
  //  slightly larger pseudoelement within it.
  &.selected::before {
    --border-width: 2px;
    content: '';
    display: block;
    position: absolute;
    pointer-events: none;
    width: calc(100% + calc(2 * var(--border-width)));
    height: calc(100% + calc(2 * var(--border-width)));
    top: calc(-1 * var(--border-width));
    left: calc(-1 * var(--border-width));
    border-radius: 3px;
    border: var(--border-width) solid $accent-main;
  }

  &.disabled {
    pointer-events: none;
    .disable-overlay {
      display: block;
    }
  }

  .disable-overlay {
    display: none;
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 999;
    opacity: 0.4;
    background: white;
  }

  .input-arrow {
    position: absolute;
    top: 8px;
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 5px solid #b3b4b5;
  }

  .options-button-container {
    width: $option-button-width;
    height: $option-button-width;
    :deep(i) {
      font-size: 12px;
    }
    display: none;
    :deep(.dropdown-container) {
      top: $option-button-width;
      right: $option-button-width;
    }
  }

  &:hover .options-button-container,
  .options-button-container.active {
    display: block;
  }

  .content {
    @include index-tree-node-content;
  }
  .full-width-button {
    width: 100%;
  }

  .header {
    display: flex;
    align-items: center;

    > i {
      display: grid;
      align-items: center;
      margin-right: $node-content-horizontal-padding;
    }

    > span {
      flex: 1;
      min-width: 0;
    }
  }

  .rename {
    .form-control {
      height: 32px;
      padding: 8px 8px;
    }
    button {
      width: 100%;
      max-width: 59px;
      margin-left: 5px;
      color: white;
      background-color: $call-to-action-color;
    }
  }

  .name {
    flex: 1;
  }

  .advanced-search-button {
    margin: 5px 0 10px 10px;
  }
}

.dataset-label {
  gap: 2px;
  align-items: center;
  margin-bottom: 2px;

  .expand {
    flex: 1;
    min-width: 0;
  }
}

.data-source-text {
  margin-bottom: 2px;
}

.button-top-margin {
  margin-top: 10px;
}

.warning {
  color: $un-color-feedback-warning;
}
</style>
