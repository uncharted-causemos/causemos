<template>
  <div class="new-insight-modal-container">
    <full-screen-modal-header>
      <div style="display: flex; justify-content: space-around; width: 100%">
        <button
          type="button"
          class="btn btn-primary"
          @click="revertImage">
          Revert
        </button>
        <h5>{{title}}</h5>
        <div>
          <button
            type="button"
            class="btn btn-primary"
            @click="annotateImage">
            Annotate
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="cropImage">
            Crop
          </button>
        </div>
      </div>
    </full-screen-modal-header>
    <div class="pane-wrapper">
      <div class="pane-row">
        <div class="fields">
          <div v-if="imagePreview !== null" class="preview">
            <img id="finalImagePreview" ref="finalImagePreview" :src="imagePreview">
          </div>
          <disclaimer
            v-else
            style="text-align: center; color: black"
            :message="'No image preview!'"
          />
          <div v-if="showCropInfoMessage" style="align-self: center">Annotations are still there, but not shown when the image is being cropped!</div>
          <div class="form-group">
            <form>
              <label> Name* </label>
              <input
                :value="name"
                v-focus
                type="text"
                class="form-control"
                placeholder="Untitled insight"
                @keyup.enter.stop="saveInsight"
                @input="updateName"
              >
              <div
                v-if="hasError === true"
                class="error-msg">
                {{ errorMsg }}
              </div>
              <label>Description</label>
              <textarea
                :value="description"
                rows="2"
                class="form-control"
                @input="updateDescription" />
            </form>
          </div>
          <div class="controls">
            <button
              type="button"
              class="btn btn-light"
              @click="cancel"
            >
              Cancel
            </button>
            <button
              v-if="isNewInsight"
              class="btn btn-primary"
              @click="autofill"
            >
              Autofill
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :class="{ 'disabled': name.length === 0}"
              @click="save"
            >
              Save
            </button>
          </div>
        </div>

        <drilldown-panel
          is-open
          :tabs="drilldownTabs"
          :activeTabId="drilldownTabs[0].id"
          only-display-icons
        >
          <template #content>
            <insight-summary
              v-if="metadataDetails"
              :metadata-details="metadataDetails"
            />
          </template>
        </drilldown-panel>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  nextTick,
  PropType
} from 'vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import { MarkerArea, MarkerAreaState } from 'markerjs2';
import { CropArea, CropAreaState } from 'cropro';
import { InsightMetadata } from '@/types/Insight';
import InsightSummary from './insight-summary.vue';

const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';

const METDATA_DRILLDOWN_TABS = [
  {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info-circle'
  }
];

export default defineComponent({
  name: 'NewEditModalLayout',
  components: {
    DrilldownPanel,
    FullScreenModalHeader,
    Disclaimer,
    InsightSummary
  },
  props: {
    description: {
      type: String,
      default: ''
    },
    hasError: {
      type: Boolean,
      default: false
    },
    isNewInsight: {
      type: Boolean,
      default: true
    },
    metadataDetails: {
      type: Object as PropType<InsightMetadata>,
      required: true
    },
    name: {
      type: String,
      default: ''
    },
    imagePreview: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: ''
    },
    annotation: {
      type: Object,
      default: undefined
    }
  },
  emits: ['auto-fill', 'cancel', 'save', 'update:description', 'update:name'],
  data: () => ({
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    insightMetadata: '',
    markerAreaState: undefined as MarkerAreaState | undefined,
    markerArea: undefined as MarkerArea | undefined,
    cropArea: undefined as CropArea | undefined,
    cropState: undefined as CropAreaState | undefined,
    originalImagePreview: '',
    lastCroppedImage: '',
    lastAnnotatedImage: '',
    showCropInfoMessage: false
  }),
  watch: {
    imagePreview() {
      if (this.imagePreview !== null) {
        // apply previously saved annotation, if any
        if (this.annotation) {
          this.originalImagePreview = this.annotation.imagePreview;
          this.markerAreaState = this.annotation.markerAreaState;
          this.cropState = this.annotation.cropAreaState;
          nextTick(() => {
            const refAnnotatedImage = this.$refs.finalImagePreview as HTMLImageElement;
            refAnnotatedImage.src = this.originalImagePreview;
            this.annotateImage();
            (this.markerArea as MarkerArea).startRenderAndClose();
          });
        } else {
          this.originalImagePreview = this.imagePreview;
        }
      }
    }
  },
  methods: {
    revertImage() {
      if (this.markerArea?.isOpen) {
        this.markerArea.close();
      }

      if (this.cropArea?.isOpen) {
        this.cropArea.close();
      }

      this.markerAreaState = undefined;
      this.cropState = undefined;
      this.lastCroppedImage = '';
      this.showCropInfoMessage = false;

      const refFinalImage = this.$refs.finalImagePreview as HTMLImageElement;

      // revert img reference to the original image
      refFinalImage.src = this.originalImagePreview;
    },
    annotateImage() {
      if (this.cropArea?.isOpen) {
        this.cropArea.close();
      }

      if (this.markerArea?.isOpen) {
        return;
      }

      const refAnnotatedImage = this.$refs.finalImagePreview as HTMLImageElement;

      // save the content of the annotated image to restore if the user cancels the annotation
      this.lastAnnotatedImage = refAnnotatedImage.src;

      // copy the cropped, non-annotated, image as the source of the annotation
      refAnnotatedImage.src = this.lastCroppedImage !== '' ? this.lastCroppedImage : this.originalImagePreview;

      // create an instance of MarkerArea and pass the target image reference as a parameter
      this.markerArea = new MarkerArea(refAnnotatedImage);

      // attach the annotation UI to the parent of the image
      this.markerArea.targetRoot = refAnnotatedImage.parentElement as HTMLElement;
      this.markerArea.renderAtNaturalSize = true;

      let annotationSaved = false;

      // register an event listener for when user clicks Close in the marker.js UI
      // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
      this.markerArea.addCloseEventListener(() => {
        if (!annotationSaved) {
          refAnnotatedImage.src = this.lastAnnotatedImage;
        }
        annotationSaved = false;
      });

      // register an event listener for when user clicks OK/save in the marker.js UI
      this.markerArea.addRenderEventListener((dataUrl, state) => {
        annotationSaved = true;

        // we are setting the markup result to replace our original image on the page
        // but you can set a different image or upload it to your server
        refAnnotatedImage.src = dataUrl;

        // save state
        this.markerAreaState = state;
      });

      // finally, call the show() method and marker.js UI opens
      this.markerArea.show();

      // if previous state is present - restore it
      if (this.markerAreaState) {
        this.markerArea.restoreState(this.markerAreaState);
      }
    },
    cropImage() {
      if (this.markerArea?.isOpen) {
        this.markerArea.close();
      }
      if (this.cropArea?.isOpen) {
        return;
      }

      this.showCropInfoMessage = true;

      const refCroppedImage = this.$refs.finalImagePreview as HTMLImageElement;

      // create an instance of CropArea and pass the target image reference as a parameter
      this.cropArea = new CropArea(refCroppedImage);
      this.cropArea.renderAtNaturalSize = true;

      // before beginning the crop mode,
      //  we must ensure the full image is shown as the crop source
      // @LIMITATION: we are not able to leverage a good preview of the full original image with annotations applied unless we invoke the annotate-tool and wait until it is done
      refCroppedImage.src = this.originalImagePreview;

      // attach the crop UI to the parent of the image
      this.cropArea.targetRoot = refCroppedImage.parentElement as HTMLElement;

      // ensure the whole image is visible all the time
      this.cropArea.zoomToCropEnabled = false;

      // do not allow rotation and image flipping
      this.cropArea.styles.settings.hideBottomToolbar = true;

      // hide alignment grid
      this.cropArea.isGridVisible = false;

      let croppedSaved = false;

      // register an event listener for when user clicks Close in the marker.js UI
      // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
      this.cropArea.addCloseEventListener(() => {
        if (!croppedSaved) {
          refCroppedImage.src = this.lastCroppedImage;

          // hide the info message regarding the crop preview and the visibility of annotations
          this.showCropInfoMessage = false;

          // apply existing annotations, if any, after cancelling the image crop
          nextTick(() => {
            // note that this close event may be called if the user clicks Annotate while the crop mode was open
            // so we should not request re-annotation (in the next tick)
            //  or otherwise it would cancel the annotation mode that is being initiated
            if (!this.markerArea?.isOpen) {
              this.annotateImage();
              (this.markerArea as MarkerArea).startRenderAndClose();
            }
          });
        }
        croppedSaved = false;
      });

      // register an event listener for when user clicks OK/save in the CROPRO UI
      this.cropArea.addRenderEventListener((dataUrl, state) => {
        // we are setting the cropping result to replace our original image on the page
        // but you can set a different image or upload it to your server
        refCroppedImage.src = dataUrl;

        // save the cropped image (which would be used as the source of the annotation later on)
        this.lastCroppedImage = dataUrl;

        // hide the info message regarding the crop preview and the visibility of annotations
        this.showCropInfoMessage = false;

        // save state
        this.cropState = state;

        // apply existing annotations, if any, after cropping the image
        nextTick(() => {
          this.annotateImage();
          (this.markerArea as MarkerArea).startRenderAndClose();
        });
      });

      // finally, call the show() method and CROPRO UI opens
      this.cropArea.show();

      // handle previous state if present
      if (this.cropState) {
        //
        // Do not restore the state and crop the image
        // Instead, show the original image and the crop rect
        //
        const cropAreaTemp = this.cropArea as any;
        cropAreaTemp.cropLayer.setCropRectangle(this.cropState.cropRect);
      }
    },
    autofill() {
      this.$emit('auto-fill');
    },
    cancel() {
      this.$emit('cancel');
    },
    save() {
      const refFinalImage = this.$refs.finalImagePreview as HTMLImageElement;
      this.$emit('save', {
        annotatedImagePreview: refFinalImage.src,
        croppedNonAnnotatedImagePreview: this.lastCroppedImage !== '' ? this.lastCroppedImage : this.originalImagePreview,
        markerAreaState: this.markerAreaState,
        cropState: this.cropState
      });
    },
    updateName(event: any) {
      this.$emit('update:name', event.target.value);
    },
    updateDescription(event: any) {
      this.$emit('update:description', event.target.value);
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.new-insight-modal-container {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: stretch;
  align-items: stretch;
  height: 100vh;
  overflow: hidden;

  .pane-wrapper {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: hidden;
    padding: 1em 0 0;
    .pane-row {
      flex: 1 1 auto;
      display: flex;
      flex-direction: row;
      height: 100%;
      .fields {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-left: 1rem;
        padding-right: 1rem;
        height: 100%;
        .preview {
          flex: 1 1 auto;
          overflow: auto;
          align-self: center;
          img {
            max-height: 100%;
            max-width: 100%;
          }
        }
        .form-group {
          flex: 0 0 auto;
          margin-bottom: 3px;
          form {
            display: flex;
            flex-direction: column;
            width: 100%;
            textarea {
              flex: 1 1 auto;
              resize: none;
              outline: none;
              box-sizing: border-box;
            }
          }
        }
        .controls {
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          button {
            margin-left: 1rem;
          }
        }
      }
    }
  }
}

.error-msg {
  color: $negative;
}

h6 {
  @include header-secondary;
  font-size: $font-size-medium;
}

</style>

