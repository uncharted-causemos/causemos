<template>
  <div class="output-preview-card-container">
    <div class="heading">
      <b
        v-tooltip="heading"
        class="text"
      >
        {{ heading }}
      </b>
    </div>
    <div class="card-map">
      <output-preview-map />
      <h4 class="preview-label">PREVIEW</h4>
    </div>
    <output-preview-timeline
      class="timeseries-chart"
    />
  </div>
</template>

<script>
import OutputPreviewMap from '@/components/data/output-preview-map';
import OutputPreviewTimeline from '@/components/data/output-preview-timeline';

export default {
  name: 'OutputPreviewCard',
  components: {
    OutputPreviewMap,
    OutputPreviewTimeline
  },
  props: {
    name: {
      type: String,
      default: ''
    },
    units: {
      type: String,
      default: ''
    }
  },
  computed: {
    heading() {
      let heading = this.name;
      if (this.units.length > 0) {
        heading += ` (${this.units})`;
      }
      return heading;
    }
  }
};
</script>


<style lang="scss" scoped>
@import "~styles/variables";

.output-preview-card-container {
  background: white;
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid $separator;
  border-radius: 3px;
}
.heading {
  height: 32px;
  margin: 5px 0;
  cursor: pointer;
  user-select: none;
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.card-map {
  flex: 3;
  position: relative;

  .preview-label {
    position: absolute;
    top: 3px;
    left: 10px;
    margin: 0;
    color: #000;
    text-shadow: 0px 0px 3px #fff;
    opacity: .5;
    font-weight: bold;
  }
}
.timeseries-chart {
  flex: 1;
  height: 0;
  width: 100%;
}
</style>
