<template>
  <div class="autocomplete-container">
    <input
      v-model="searchTerm"
      type="text"
      class="form-control"
      :placeholder="placeholderMessage"
      @input="onChange"
      @keydown.down="onArrowDown"
      @keydown.up="onArrowUp"
      @keydown.enter="onEnter"
    >
    <div
      class="autocomplete-results-container">
      <ul
        class="autocomplete-results">
        <li
          v-for="(suggestion, i) in suggestions"
          :key="i"
          class="autocomplete-result dropdown-option"
          :class="{ 'is-active': (i === selectedIndex || selectedFn(suggestion)) }"
          @click.stop.prevent="setSearchTerm(suggestion)">
          <component
            :is="displayType"
            :item="suggestion"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script>

import ConceptDisplay from '@/components/widgets/autocomplete/concept-display';

export default {
  name: 'AutoComplete',
  components: {
    ConceptDisplay
  },
  props: {
    placeholderMessage: {
      type: String,
      required: false,
      default: () => ''
    },
    displayType: {
      type: String,
      required: true
    },
    searchFn: {
      type: Function,
      required: true
    },
    selectedFn: {
      type: Function,
      default: () => false
    }
  },
  data: () => ({
    searchTerm: '',
    suggestions: [],
    selectedIndex: -1,
    showSuggestions: false
  }),
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
    this.onChange();
  },
  destroyed() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    onArrowDown() {
      if (this.selectedIndex < this.suggestions.length) {
        this.selectedIndex = this.selectedIndex + 1;
      }
    },
    onArrowUp() {
      if (this.selectedIndex > 0) {
        this.selectedIndex = this.selectedIndex - 1;
      }
    },
    async onChange() {
      this.suggestions = await this.searchFn(this.searchTerm);
      if (this.suggestions.length > 0 && this.searchTerm !== '') {
        this.showSuggestions = true;
      }
    },
    onEnter() {
      this.searchTerm = this.suggestions[this.selectedIndex];
      this.selectedIndex = -1;
      this.$emit('item-selected', this.searchTerm);
      this.showSuggestions = false;
    },
    setSearchTerm(suggestion) {
      this.searchTerm = suggestion;
      this.$emit('item-selected', this.searchTerm);
      this.showSuggestions = false;
    },
    handleClickOutside(evt) {
      if (!this.$el.contains(evt.target)) {
        this.selectedIndex = -1;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import '~styles/variables';

$input-element-height: 37px;

.autocomplete-container {
  margin-bottom: 10px;
  position: relative;
  flex-grow: 1;
  height: calc(400px - #{$input-element-height}); //Includes default height - 37px(input element height)
  overflow: hidden;

  .autocomplete-results-container {
    flex-grow: 1;
    overflow-y: scroll;
    height: calc(100% - #{$input-element-height});
  }
  .autocomplete-results {
    padding: 0;
    z-index: 52;
    background-color: white;
  }
  /deep/ .autocomplete-result {
    list-style: none;
    text-align: left;
    word-break: break-all;
  }
}

.form-control {
  width: calc(100% - 20px); // 20px = 2*margin
  margin: 10px;
  padding: 0 10px;
}
</style>
