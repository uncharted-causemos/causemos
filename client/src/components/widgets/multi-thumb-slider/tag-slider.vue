<template>
  <div
    class="slider-container"
    :style="{height: (tags.length * 10) + 'vh' }"
    ref="tag_slider_ref"
    @mousemove="handleEventMove"
    @mouseleave="handleEventUp"
    @mouseup="handleEventUp">
    <tag-section
      v-for="(tag, index) in tags"
      :key="tag.name"
      :size="sizes[index] ?? 0"
      :name="tag.name"
      :color="tag.color"
      @slider-button-down="currentSliderButtonIndex=index; handleEventDown($event)"
      @slider-button-up="currentSliderButtonIndex=index; handleEventUp($event)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import TagSection from '@/components/widgets/multi-thumb-slider/tag-section.vue';
import _ from 'lodash';

//
// adapted from React component: https://css-tricks.com/lets-make-a-multi-thumb-slider-that-calculates-the-width-between-thumbs/
//  as well as its vanilla js version: https://blog.intzone.com/multi-thumb-slider-in-vanilla-css-and-javascript/
//

export default defineComponent({
  name: 'TagSlider',
  emits: ['sections-size-updated'],
  components: {
    TagSection
  },
  props: {
    sections: {
      type: Object as PropType<{[key: string]: {name: string; weight: number}}>,
      default: () => ({})
    }
  },
  watch: {
    sections: {
      handler(): void {
        if (Object.keys(this.sections).length > 0) {
          // REVIEW: consider merging tags and sizes into one variable
          // first set weights for all tags
          this.sizes = Object.keys(this.sections).map(key => this.niceFormat(this.sections[key].weight));
          this.originalSizes = this.sizes;
          // then set tags to trigger vue update
          this.tags = Object.keys(this.sections).map(key => ({ name: this.sections[key].name, color: 'gray' }));
        } else {
          this.tags = [];
          this.originalSizes = [];
        }
      },
      immediate: true
    }
  },
  data: () => ({
    tags: [] as {name: string; color: string}[],
    startDragY: -1,
    sliderHeight: 0,
    currentSliderButtonIndex: -1,
    sizes: [] as number[],
    originalSizes: [] as number[],
    canResize: false
  }),
  methods: {
    niceFormat(number: number) {
      return +number.toFixed(1);
    },
    clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    },
    handleEventDown(event: MouseEvent) {
      this.startDragY = event.pageY;
      this.sliderHeight = (this.$refs as any).tag_slider_ref.offsetHeight;
      this.canResize = true;
      this.originalSizes = this.sizes.slice(); // i.e., clone
    },
    handleEventMove(event: MouseEvent) {
      event.preventDefault();
      if (!this.canResize) {
        return;
      }

      // only continue if mouse down is is true
      if (event.buttons === 0) {
        // mouse button is not down anymore; i.e., mouseup event didn't fire as expected
        return;
      }

      const endDragY = event.pageY;
      const distanceMoved = endDragY - this.startDragY;
      const percentageMoved = (distanceMoved / this.sliderHeight) * 100;
      const _sizes = this.originalSizes.slice(); // i.e., clone

      // calculate current section height
      const nextTagIndex = this.currentSliderButtonIndex + 1;
      const prevPercentage = _sizes[this.currentSliderButtonIndex];
      const currentSectionNewPercentage = prevPercentage + percentageMoved;
      // max available height for current section and the next one
      let maxPercent = prevPercentage + _sizes[nextTagIndex];
      // special case when 'nextTagIndex' is the last valid index
      //  this causes the maxPercent to be almost 100 but a little smaller due to floating point math
      //  so we recalculate to ensure the total will be exactly 100%
      if (nextTagIndex === _sizes.length - 1) {
        const totalHeightBefore = _sizes.reduce((partial_sum, a) => partial_sum + a, 0); // array sum
        maxPercent = 100 - (totalHeightBefore - maxPercent);
      }
      _sizes[this.currentSliderButtonIndex] = this.niceFormat(this.clamp(currentSectionNewPercentage, 0, maxPercent));

      // calculate next section height
      /**
       * NOTE:
       * Adjusting a section percentage should only affect its neighbor to the bottom.
       * This means that the maximum value of a given section maximum percentage
       * should be its height plus the height of its neighbor
       * when it’s allowed to take up the entire neighbor’s space.
       */
      const nextSectioncurrentSectionNewPercentage = _sizes[nextTagIndex] - percentageMoved;
      _sizes[nextTagIndex] = this.niceFormat(this.clamp(nextSectioncurrentSectionNewPercentage, 0, maxPercent));

      // update
      this.sizes = _sizes;
    },
    handleEventUp(event: MouseEvent) {
      event.preventDefault();
      this.canResize = false;

      // emit the updated weights/percentages
      const updatedSections = _.cloneDeep(this.sections);
      Object.keys(updatedSections).forEach((s, indx) => {
        updatedSections[s].weight = this.sizes[indx];
      });
      this.$emit('sections-size-updated', updatedSections);
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.slider-container {
  width: 100%;
  display: flex;
  background-color: transparent;
  flex-direction: column;
  // needed when the top/bottom sections are resized and ending up to have 0 height
  //  the goal is to avoid the sections overflowing into other UI
  padding-top: 2rem;
  padding-bottom: 2rem;
}

</style>
