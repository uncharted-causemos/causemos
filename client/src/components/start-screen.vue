<template>
  <div class="start-screen-container">
    <div
      v-if="showCreateSection"
      class="quarter-column"
    >
      <h4 class="section-header">{{ createSectionHeader }}</h4>
      <start-screen-card
        is-create-card
        @click="onCreate"
      />
    </div>
    <div class="recent">
      <div class="header-row">
        <h4 class="section-header">{{ openSectionHeader }}</h4>
        <input
          v-model="searchText"
          type="text"
          placeholder="Search"
        >
      </div>
      <div class="recent-card-list">
        <start-screen-card
          v-for="(recentCard, i) in filteredRecentCards"
          :key="i"
          :preview-image-src="recentCard.previewImageSrc"
          :title="recentCard.title"
          :subtitle="recentCard.subtitle"
          @click="onOpenRecent(recentCard)"
          @rename="onRename(recentCard)"
          @duplicate="onDuplicate(recentCard)"
          @delete="onDelete(recentCard)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import StartScreenCard from '@/components/widgets/start-screen-card.vue';

interface Card {
  id: string;
  previewImageSrc: string;
  title: string;
  subtitle: string;
}

export default defineComponent({
  name: 'StartScreen',
  components: {
    StartScreenCard
  },
  props: {
    createSectionHeader: {
      type: String,
      default: 'Create'
    },
    openSectionHeader: {
      type: String,
      default: 'Open'
    },
    recentCards: {
      type: Array as PropType<Card[]>,
      default: () => []
    },
    showCreateSection: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'open-recent', 'create', 'rename', 'duplicate', 'delete'
  ],
  data: () => ({
    searchText: ''
  }),
  computed: {
    filteredRecentCards(): Card[] {
      if (this.searchText.length === 0) return this.recentCards;
      return this.recentCards.filter(card => {
        const searchText = this.searchText.toLowerCase();
        const title = card.title.toLowerCase();
        const subtitle = card.subtitle.toLowerCase();
        return title.includes(searchText) || subtitle.includes(searchText);
      });
    }
  },
  mounted() {
  },
  methods: {
    onCreate() {
      this.$emit('create');
    },
    onOpenRecent(recentCard: Card) {
      this.$emit('open-recent', recentCard);
    },
    onRename(recentCard: Card) {
      this.$emit('rename', recentCard);
    },
    onDuplicate(recentCard: Card) {
      this.$emit('duplicate', recentCard);
    },
    onDelete(recentCard: Card) {
      this.$emit('delete', recentCard);
    }
  }
});
</script>

<style lang="scss">
@import "~styles/variables";

.start-screen-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;

  .quarter-column {
    width: 25vw;
    background: $background-light-3;
    padding: 16px 32px;
  }

  .recent {
    flex: 1;
    // Use 22px instead of 32px to account for cards' 10px horizontal margin
    padding: 16px 22px 16px 22px;
    overflow-y: auto;
    background: $background-light-2;

    .section-header {
      // Match cards' 10px horizontal margin
      margin-left: 10px;
    }

    .recent-card-list {
      width: 100%;
      display: flex;
      flex-wrap: wrap;

      .card-container {
        margin: 0 10px 20px 10px;
      }
    }
  }

  .section-header {
    font-weight: normal;
    margin: 0 0 10px 0;
  }

  .header-row {
    display: flex;
    justify-content: space-between;

    input {
      margin: 0 0 10px 10px;
      padding: 0 5px;
      border: none;
      flex: 1;
      max-width: 33.3%;
    }
  }
}
</style>
