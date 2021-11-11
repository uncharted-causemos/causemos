<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" /> Model Scenario Tags</h4>
    </template>
    <template #body>
      <div class="tags-header">
        <i
          class="fa fa-minus-circle tags-header-item"
          :class="{
            'update-tag-disabled': selectedTag === null,
            'remove-tag': selectedTag !== null
          }"
          @click="removeTag" ></i>
        <i
          class="fa fa-edit tags-header-item"
          :class="{
            'update-tag-disabled': selectedTag === null,
            'edit-tag': selectedTag !== null
          }"
          @click="if(selectedTag!==null) {isEditingTag=true;}" ></i>
      </div>
      <div v-if="isEditingTag" style="display: flex; align-items: center;">
        <input
          v-focus
          type="text"
          :value="selectedTag.label"
          @input="newTagText = $event.target.value"
          @keyup.enter="onTagNameUpdate"
        >
        <button
          type="button"
          class="btn btn-primary btn-call-for-action button-spacing"
          style
          @click.stop="onTagNameUpdate">
            Save
        </button>
        <button
          type="button"
          class="btn btn-primary button-spacing"
          style
          @click.stop="isEditingTag=false">
            Cancel
        </button>
      </div>
      <div class="tags-area-container" v-if="runTags.length > 0">
        <div v-for="tag in runTags" :key="tag.label"
          class="tag-label"
          :style="{ backgroundColor: tag.selected ? 'lightblue' : 'lightgray' }"
          @click="toggleTagSelection(tag)">
          {{tag.label}}
          <span class="tags-label-runs-count">{{tag.count}}</span>
        </div>
      </div>
      <div v-else>
        No tags available for any of this model's runs!
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn"
          @click.stop="close()">
            Close
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { ModelRun, RunsTag } from '@/types/ModelRun';
import { removeModelRunsTag, renameModelRunsTag } from '@/services/new-datacube-service';

// allow the user to review potential mode runs before kicking off execution
export default defineComponent({
  name: 'ModalDatacubeScenarioTags',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  props: {
    modelRunData: {
      type: Array as PropType<ModelRun[]>,
      default: []
    }
  },
  computed: {
    runTags(): Array<RunsTag> {
      const tags: RunsTag[] = [];
      if (this.modelRunData && this.modelRunData.length > 0) {
        this.modelRunData.forEach(run => {
          run.tags.forEach(tag => {
            const existingTagIndx = tags.findIndex(t => t.label === tag);
            if (existingTagIndx >= 0) {
              tags[existingTagIndx].count++;
            } else {
              tags.push({
                label: tag,
                count: 1,
                selected: false
              });
            }
          });
        });
      }
      return tags;
    }
  },
  data: () => ({
    selectedTag: null as RunsTag | null,
    isEditingTag: false,
    newTagText: ''
  }),
  mounted() {
  },
  methods: {
    close() {
      this.$emit('close');
    },
    toggleTagSelection(tag: RunsTag) {
      // if clicking on the same tag: toggle selection
      //  otherwise, selects the new tag and cancel previous tag selection, if any
      if (this.selectedTag === null) {
        this.selectedTag = tag;
      } else {
        if (this.selectedTag.label === tag.label) {
          // clicked on the same tag that was previously selected
          this.selectedTag = null;
        } else {
          // clicked on a different tag
          this.selectedTag.selected = false;
          this.selectedTag = tag;
        }
      }
      tag.selected = !tag.selected;
    },
    onTagNameUpdate() {
      if (this.newTagText !== this.selectedTag?.label && this.newTagText.trim().length > 0) {
        // we have a new tag name
        const oldTagName = this.selectedTag?.label as string;
        if (this.modelRunData && this.modelRunData.length > 0) {
          const modelRuns = this.modelRunData.filter(run => run.tags.includes(oldTagName));
          modelRuns.forEach(run => {
            run.tags = run.tags.filter(t => t !== oldTagName);
            run.tags.push(this.newTagText);
          });
          renameModelRunsTag(modelRuns.map(run => run.id), oldTagName, this.newTagText);
        }
      }
      this.isEditingTag = false;
    },
    removeTag() {
      if (this.selectedTag !== null && this.modelRunData && this.modelRunData.length > 0) {
        const modelRuns = this.modelRunData.filter(run =>
          this.selectedTag !== null && run.tags.includes(this.selectedTag.label));
        modelRuns.forEach(run => {
          // NOTE this will automatically refresh the rendered tags
          run.tags = run.tags.filter(t => t !== this.selectedTag?.label);
        });
        removeModelRunsTag(modelRuns.map(run => run.id), this.selectedTag.label);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

::v-deep(.modal-container) {
  width: max-content;
  max-width: 60vw;
  .modal-body {
    height: 200px;
    width: 400px;
    overflow-y: scroll;
  }
}

.tags-area-container {
  align-items: center;
  font-size: smaller;
  text-align: center;
  display: flex;
  align-items: center;

  .tag-label {
    background-color:lightgray;
    margin: 4px;
    padding: 4px;
    border-style: solid;
    border-radius: 4px;
    border-width: 1px;
    border-color: rgb(180, 180, 180);
    cursor: pointer;

    &:hover {
      background-color: darkgray !important;
    }

    .tags-label-runs-count {
      padding-left: 6px;
      padding-right: 6px;
      background-color: white;
      border-style: solid;
      border-radius: 50%;
      border-width: 1px;
      border-color: lightgray;
    }
  }
}

.remove-tag {
  cursor: pointer;
  &:hover {
    color: red;
  }
}
.edit-tag {
  cursor: pointer;
  &:hover {
    color: blue;
  }
}
.update-tag-disabled {
  color: lightgray;
  &:hover {
    cursor: not-allowed;
  }
}

.tags-header {
  display: flex;
  justify-content: flex-end;
  font-size: x-large;
}
.tags-header-item {
  padding-left: 2px;
  padding-right: 2px;
}

.button-spacing {
  padding: 2px;
  margin: 2px;
}
</style>
