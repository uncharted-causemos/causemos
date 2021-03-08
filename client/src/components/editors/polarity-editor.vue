<template>
  <div class="polarity-editor-container">
    <dropdown-control>
      <div
        slot="content"
        class="dropdown">
        <div class="dropdown-title">
          <span>Edit Relationship</span>
        </div>
        <close-button @click="close()" />
        <hr class="pane-separator">
        <h6
          class="option-group-header"
          :style="statementPolarityColor(1)">Same</h6>
        <div
          class="dropdown-option"
          @click.stop="select(1, 1)">
          <i
            class="fa fa-check"
            :style="checkedOption(item, 1, 1)"
          />
          <i
            :class="polarityClass(1)"
            class="polarity-factor"
          />
          <i
            id="statement-polarity-arrow"
            class="fa fa-long-arrow-right"
            :style="statementPolarityColor(1)"
          />
          <i
            :class="polarityClass(1)"
            class="polarity-factor"
          />
        </div>
        <div
          class="dropdown-option"
          @click.stop="select(-1, -1)">
          <i
            class="fa fa-check"
            :style="checkedOption(item, -1, -1)"
          />
          <i
            :class="polarityClass(-1)"
            class="polarity-factor"
          />
          <i
            id="statement-polarity-arrow"
            class="fa fa-long-arrow-right"
            :style="statementPolarityColor(1)"
          />
          <i
            :class="polarityClass(-1)"
            class="polarity-factor"
          />
        </div>
        <h6
          :style="statementPolarityColor(-1)"
          class="option-group-header">Opposite</h6>
        <div
          class="dropdown-option"
          @click.stop="select(1, -1)">
          <i
            class="fa fa-check"
            :style="checkedOption(item, 1, -1)"
          />
          <i
            :class="polarityClass(1)"
            class="polarity-factor"
          />
          <i
            id="statement-polarity-arrow"
            class="fa fa-long-arrow-right"
            :style="statementPolarityColor(-1)"
          />
          <i
            :class="polarityClass(-1)"
            class="polarity-factor"
          />
        </div>
        <div
          class="dropdown-option"
          @click.stop="select(-1, 1)">
          <i
            class="fa fa-check"
            :style="checkedOption(item, -1, 1)"
          />
          <i
            :class="polarityClass(-1)"
            class="polarity-factor"
          />
          <i
            id="statement-polarity-arrow"
            class="fa fa-long-arrow-right"
            :style="statementPolarityColor(-1)"
          />
          <i
            :class="polarityClass(1)"
            class="polarity-factor"
          />
        </div>
        <hr class="pane-separator">
        <div class="reverse-relation-container">
          <small-text-button
            :label="'Reverse relation'"
            @click="reverse()"
          />
        </div>
      </div>
    </dropdown-control>
  </div>
</template>


<script>
import DropdownControl from '@/components/dropdown-control';
import CloseButton from '@/components/widgets/close-button';
import polarityUtil from '@/utils/polarity-util';
import SmallTextButton from '@/components/widgets/small-text-button';

/**
 * Polarities picker, pick among 4 different polarity settings:
 * - positive/positive
 * - negative/negative
 * - positive/negative
 * - negative/positive
 */
export default {
  name: 'PolarityEditor',
  components: {
    DropdownControl,
    CloseButton,
    SmallTextButton
  },
  props: {
    item: {
      type: Object,
      default: () => ({
        subj_polarity: 1,
        obj_polarity: 1
      })
    }
  },
  methods: {
    reverse() {
      this.$emit('reverse-relation');
    },
    select(subjPolarity, objPolarity) {
      if ((this.item.subj_polarity !== subjPolarity) || (this.item.obj_polarity !== objPolarity)) {
        this.$emit('select', { subjPolarity, objPolarity });
      }
    },
    close() {
      this.$emit('close');
    },
    statementPolarityColor(statementPolarity) {
      return polarityUtil.statementPolarityColor(statementPolarity);
    },
    polarityClass(polarity) {
      return polarityUtil.polarityClass(polarity);
    },
    checkedOption(item, subjPolarity, objPolarity) {
      if (item.subj_polarity === subjPolarity && item.obj_polarity === objPolarity) {
        return {
          opacity: 1
        };
      } else {
        return {
          opacity: 0.1
        };
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.polarity-editor-container {
  position: absolute;
  top: 20%;
  right: 93%;
  width: 100%;
  .dropdown {
    i {
      padding: 5px;
    }
    .fa-window-close {
      cursor: pointer;
    }
    .option-group-header {
      padding-left: 16px;
      padding-top: 8px;
      margin: 0;
      font-weight: normal;
    }
  }
  .reverse-relation-container {
    padding: 5px 15px;
  }
}
</style>
