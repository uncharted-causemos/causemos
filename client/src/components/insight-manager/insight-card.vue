<template>
  <Card class="insight" :class="{ 'card-mode': cardMode }">
    <div class="insight-content" @click="selectInsight()">
      <div class="insight-thumbnail">
        <img-lazy
          :src="`/api/insights/${props.insight.id}/thumbnail`"
          class="thumbnail" />
      </div>
      <div
        v-if="showDescription"
        :class="{ 'private-insight-title': insight.visibility === 'private' }">
        <span>{{ insight.name }}</span> <span class="insight-description">{{ insight.description }}</span>
      </div>
      <div
        v-else
        class="insight-title"
        :class="{ 'private-insight-title': insight.visibility === 'private' }">
        <h5>{{ insight.name }}</h5>
      </div>
      <div class="insight-footer">
        <!-- Stop propagation on click event to avoid opening insight -->
        <div v-if="cardMode" class="insight-checkbox" @click.stop="updateCuration()">
          <label>
            <i
              class="fa fa-lg fa-fw"
              :class="{ 'fa-check-square-o': curated, 'fa-square-o': !curated }"
            />
          </label>
        </div>
        <div class="insight-date">
          {{ dateFormatter(insight.modified_at, 'MMM DD, YYYY') }}
        </div>
        <div class="insight-action" @click.stop="openEditor()">
          <i class="fa fa-ellipsis-h insight-header-btn" />
          <dropdown-control
            v-if="activeInsight === insight.id"
            class="insight-editor-dropdown"
          >
            <template #content>
              <div class="dropdown-option" @click="editInsight">
                <i class="fa fa-edit" />
                Edit
              </div>
              <div class="dropdown-option" @click="removeInsight">
                <i class="fa fa-trash" />
                Delete
              </div>
            </template>
          </dropdown-control>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import Card from '@/components/widgets/card.vue';
import dateFormatter from '@/formatters/date-formatter';
import DropdownControl from '../dropdown-control.vue';
import ImgLazy from '../widgets/img-lazy.vue';

const props = defineProps({
  activeInsight: {
    type: String,
    default: ''
  },
  insight: {
    type: Object,
    default: null
  },
  cardMode: {
    type: Boolean,
    default: false
  },
  curated: {
    type: Boolean,
    default: false
  },
  showDescription: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['remove-insight', 'edit-insight', 'open-editor', 'select-insight', 'update-curation']);

const editInsight = () => {
  emit('edit-insight');
};
const removeInsight = () => {
  emit('remove-insight');
};
const openEditor = () => {
  emit('open-editor');
};
const selectInsight = () => {
  emit('select-insight');
};
const updateCuration = () => {
  emit('update-curation');
};
</script>

<style lang="scss" scoped>
.card-mode {
  width: 300px;
  min-height: 250px;
}

.insight {
  cursor: pointer;
  padding: 5px;
  border: 1px solid #e5e5e5;
  margin: 0px 1rem 1rem 0px;
  .insight-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    .insight-title {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      color: gray;
      font-style: italic;
    }
    .private-insight-title {
      color: black;
      font-style: normal;
    }
    .insight-description {
      flex: 1 1 auto;
      color: gray;
      font-style: italic;
    }
    .insight-footer {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      .insight-checkbox {
        flex: 0 1 auto;
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
    }
    .insight-thumbnail {
      .thumbnail {
        margin: auto;
        width:  100%;
        max-width: 700px;
      }
    }
  }
}

.insight-editor-dropdown {
  position: absolute;
  right: 0px;
  bottom: 32px;
  width: fit-content;
}
</style>
