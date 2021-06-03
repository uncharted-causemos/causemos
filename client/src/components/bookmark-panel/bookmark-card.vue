<template>
  <card
    class="bookmark"
    @click="selectBookmark()"
  >
    <div class="bookmark-content">
      <div class="bookmark-thumbnail">
        <img
          :src="bookmark.thumbnail_source"
          class="thumbnail">
      </div>
      <div class="bookmark-title">
        <h5>{{ bookmark.title }}</h5>
      </div>
      <div class="bookmark-footer">
        <div class="bookmark-date">
          {{ dateFormatter(bookmark.modified_at, 'MMM DD, YYYY') }}
        </div>
        <div class="bookmark-action" @click.stop="openEditor()">
          <i class="fa fa-ellipsis-h bookmark-header-btn" />
          <bookmark-editor
            v-if="activeBookmark === bookmark.id"
            @delete="deleteBookmark()"
          />
      </div>
    </div>
    </div>
  </card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import BookmarkEditor from '@/components/bookmark-panel/bookmark-editor.vue';
import Card from '@/components/widgets/card.vue';
import dateFormatter from '@/formatters/date-formatter';
import stringFormatter from '@/formatters/string-formatter';

export default defineComponent({
  name: 'BookmarkCard',
  components: {
    BookmarkEditor,
    Card
  },
  props: {
    activeBookmark: {
      type: String,
      default: ''
    },
    bookmark: {
      type: Object,
      default: null
    }
  },
  emits: ['delete-bookmark', 'open-editor', 'select-bookmark'],
  methods: {
    dateFormatter,
    stringFormatter,
    deleteBookmark() {
      this.$emit('delete-bookmark');
    },
    openEditor() {
      this.$emit('open-editor');
    },
    selectBookmark() {
      this.$emit('select-bookmark');
    }
  }
});

</script>

<style lang="scss" scoped>
.bookmark {
  cursor: pointer;
  padding: 5px 5px 10px;
  border: 1px solid #e5e5e5;
  max-width: 300px;
  margin: 0px 1em 1em 0px;
  .bookmark-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    .bookmark-title {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      width: 100%;
    }
    .bookmark-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .bookmark-header-btn {
        cursor: pointer;
        padding: 5px;
        color: gray;
      }
      .bookmark-action {
        flex: 0 1 auto;
      }
    }
    .bookmark-description {
      flex: 1 1 auto;
      align-self: stretch;
    }
    .bookmark-empty-description {
      flex: 1 1 auto;
      align-self: stretch;
      color: #D6DBDF;
    }
    .bookmark-thumbnail {
      .thumbnail {
        width:  100%;
      }
    }
  }
}
</style>
