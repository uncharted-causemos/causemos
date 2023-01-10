<template>
  <div class="slider-section" :style="{ height: size + '%' }">
    <!-- left side -->
    <div class="tag" :style="{ background: color }" v-tooltip.left="name">
      <div
        class="slider-button"
        @mousedown="$emit('slider-button-down', $event)"
        @mouseup="$emit('slider-button-up', $event)"
      >
        <img :src="getImgUrl" style="height: 30%" />
      </div>
    </div>
    <!-- right side -->
    <div class="label-area">
      <div class="line-content">{{ name }}</div>
      <label class="line-content">{{ size + '%' }}</label>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { resolveAssetUrl } from '@/utils/url-util';

export default defineComponent({
  name: 'TagSection',
  emits: ['slider-button-down', 'slider-button-up'],
  props: {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  computed: {
    getImgUrl() {
      return resolveAssetUrl('slider-arrows.svg');
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$slider-section-rounding: 4px;

.slider-section {
  display: flex;
  align-items: center;

  .label-area {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: auto;

    .line-content {
      margin-bottom: 0;
      margin-left: 1rem;
      line-height: 1;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  .tag {
    height: 100%;
    min-width: 25%;
    border-top-width: 0.1em;
    border-top-style: solid;
    border-top-color: white;
    border-bottom-width: 0.1em;
    border-bottom-style: solid;
    border-bottom-color: white;
    box-sizing: border-box;
    padding: 0.5em;
    position: relative;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .slider-button {
      width: 2em;
      height: 2em;
      background-color: white;
      border-radius: 2em;
      position: absolute;
      bottom: calc(-1.1em);
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: auto;
      z-index: 1;
      cursor: ns-resize;
      user-select: none;

      img {
        transform: rotate(90deg);
      }
    }
  }
}

.slider-section:first-of-type {
  .tag {
    border-radius: $slider-section-rounding $slider-section-rounding 0px 0px;
  }
}
.slider-section:last-of-type {
  .tag {
    border-radius: 0px 0px $slider-section-rounding $slider-section-rounding;
  }
}

.slider-section:last-of-type {
  .tag > .slider-button {
    display: none !important;
  }
}
</style>
