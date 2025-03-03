import {
  AnnotationState,
  FullLegacyInsight,
  NewInsight,
  UnpersistedInsight,
} from '@/types/Insight';
import { CropArea, CropAreaState } from 'cropro';
import { MarkerArea, MarkerAreaState } from 'markerjs2';
import { Ref, computed, ref, watch } from 'vue';

export default function useInsightAnnotation(
  savedInsightState: Ref<UnpersistedInsight | FullLegacyInsight | NewInsight | null>
) {
  // A record of the annotations that have been added, along with their
  //  positions and appearance.
  const markerAreaState = ref<MarkerAreaState | undefined>(undefined);
  const setMarkerAreaState = (newState: MarkerAreaState | undefined) => {
    markerAreaState.value = newState;
  };
  // A record of the crop dimensions that have been selected.
  const cropState = ref<CropAreaState | undefined>(undefined);
  const setCropState = (newState: CropAreaState | undefined) => {
    cropState.value = newState;
  };
  // The image element that is being annotated or cropped.
  const imageElementRef = ref<HTMLImageElement | null>(null);
  // The operation that is currently being performed on the image.
  const activeOperation = ref<'annotate' | 'crop' | null>(null);

  /**
   * The original image preview before any annotation or cropping.
   * After annotation or cropping, this value is saved in
   * annotationAndCropState.originalImagePreview so that the user can revert
   * all changes should they wish to.
   */
  const originalImagePreview = computed(
    () =>
      savedInsightState.value?.annotation_state?.originalImagePreview ??
      savedInsightState.value?.image ??
      ''
  );

  // When saved insight state is loaded, apply the marker and crop state
  watch(
    savedInsightState,
    (state) => {
      if (state?.annotation_state?.markerAreaState || state?.annotation_state?.cropAreaState) {
        setMarkerAreaState(state?.annotation_state?.markerAreaState);
        setCropState(state?.annotation_state?.cropAreaState);
      }
    },
    { immediate: true }
  );

  const annotateImage = async (shouldReapplyCrop = true) => {
    const imageElement = imageElementRef.value as HTMLImageElement;
    // save the content of the annotated image to restore if the user cancels the annotation
    const imageSrcBeforeAnnotations = imageElement.src;
    // Use the uncropped image as the source.
    imageElement.src = originalImagePreview.value;

    if (shouldReapplyCrop) {
      const cropArea = await cropImage(false);
      await cropArea.startRenderAndClose();
    }

    // Create an instance of MarkerArea from the imageElement
    const markerArea = new MarkerArea(imageElement);
    markerArea.renderAtNaturalSize = true;
    markerArea.targetRoot = imageElement.parentElement as HTMLElement;

    // Register event handlers for the "Done" and "Cancel" buttons in the
    //  marker.js UI.
    let isAnnotationSaved = false;
    // When the user clicks the Done (checkmark) button in the marker.js UI,
    //  we update the image src with the annotated image and save the state.
    markerArea.addEventListener('render', ({ dataUrl, state }) => {
      isAnnotationSaved = true;
      imageElement.src = dataUrl;
      setMarkerAreaState(state);
    });
    // This event is called when the user clicks either the Cancel (X) or
    //  Done (checkmark) button in the marker.js UI.
    // We revert the image src to the last saved state if the user didn't
    //  trigger this event by clicking the Done button.
    markerArea.addEventListener('close', () => {
      if (!isAnnotationSaved) {
        imageElement.src = imageSrcBeforeAnnotations;
      }
      activeOperation.value = null;
    });

    // Open the marker.js UI
    markerArea.show();
    activeOperation.value = 'annotate';
    // If previous state is present, restore it.
    if (markerAreaState.value) {
      markerArea.restoreState(markerAreaState.value);
    }
    return markerArea;
  };

  const cropImage = async (shouldReapplyAnnotations = true) => {
    const imageElement = imageElementRef.value as HTMLImageElement;
    // save the current image src to restore if the user cancels the crop
    const imageSrcBeforeCropping = imageElement.src;
    // Use the uncropped image as the source.
    imageElement.src = originalImagePreview.value;
    // Re-apply annotations to the uncropped image.
    if (shouldReapplyAnnotations) {
      const markerArea = await annotateImage(false);
      await markerArea.startRenderAndClose();
    }

    // Create an instance of CropArea from the target element.
    const cropArea = new CropArea(imageElement);
    cropArea.renderAtNaturalSize = true;
    // Attach the crop UI to the parent of the image.
    cropArea.targetRoot = imageElement.parentElement as HTMLElement;
    // Ensure the whole image is visible all the time.
    cropArea.zoomToCropEnabled = false;
    // Do not allow rotation and image flipping.
    cropArea.styles.settings.hideBottomToolbar = true;
    // Hide alignment grid.
    cropArea.isGridVisible = false;

    // register an event listener for when user clicks Close in the marker.js UI
    // NOTE: Contrary to markerJS, this event does not fire when the
    //  "done"(check mark) button is clicked
    cropArea.addCloseEventListener(() => {
      imageElement.src = imageSrcBeforeCropping;
      activeOperation.value = null;
    });

    // When the user clicks the Done (checkmark) button in the cropro UI,
    //  we update the image src with the cropped image and save the state.
    cropArea.addRenderEventListener((dataUrl, state) => {
      imageElement.src = dataUrl;
      cropState.value = state;
      // Remove reference to this CropArea object
      activeOperation.value = null;
    });

    // Show the Cropro UI
    cropArea.show();
    activeOperation.value = 'crop';

    // If the image has been cropped before, restore the crop rectangle
    //  positions.
    if (cropState.value) {
      cropArea.restoreState(cropState.value);
    }
    return cropArea;
  };

  const annotationAndCropState = computed<AnnotationState>(() => ({
    markerAreaState: markerAreaState.value,
    cropAreaState: cropState.value,
    originalImagePreview: originalImagePreview.value,
    imagePreview: imageElementRef.value?.src ?? '',
  }));

  return {
    imageElementRef,
    cropImage,
    annotateImage,
    annotationAndCropState,
    insightThumbnail: computed(() => imageElementRef.value?.src),
    activeOperation,
  };
}
