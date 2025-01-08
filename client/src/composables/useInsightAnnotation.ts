import { FullInsight, NewInsight } from '@/types/Insight';
import { CropArea, CropAreaState } from 'cropro';
import { MarkerArea, MarkerAreaState } from 'markerjs2';
import { Ref, computed, nextTick, ref, watch } from 'vue';

export default function useInsightAnnotation(
  savedInsightState: Ref<FullInsight | NewInsight | null>
) {
  const markerArea = ref<MarkerArea | undefined>(undefined);
  const markerAreaState = ref<MarkerAreaState | undefined>(undefined);
  const setMarkerAreaState = (newState: MarkerAreaState | undefined) => {
    markerAreaState.value = newState;
  };

  const cropArea = ref<CropArea | undefined>(undefined);
  const cropState = ref<CropAreaState | undefined>(undefined);
  const setCropState = (newState: CropAreaState | undefined) => {
    cropState.value = newState;
  };

  const imageElementRef = ref<HTMLImageElement | null>(null);
  const lastCroppedImage = ref('');

  /**
   * Last saved state before the current round of changes.
   * If the user clicks "cancel" we reapply this state.
   * */
  const lastAnnotatedImage = ref('');
  const showCropInfoMessage = ref(false);

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
  watch(savedInsightState, (state) => {
    // lastCroppedImage.value = annotation.value.previewImage;
    if (state?.annotation_state?.markerAreaState || state?.annotation_state?.cropAreaState) {
      setMarkerAreaState(state?.annotation_state?.markerAreaState);
      setCropState(state?.annotation_state?.cropAreaState);
      // NOTE: REVIEW: FIXME:
      //  restoring both annotation and/or cropping is tricky since each one calls the other
      // if (this.markerAreaState) {
      //   nextTick(() => {
      //     const refElement = this.$refs.imageElementRef as HTMLImageElement;
      //     refElement.src = this.originalImagePreview;
      //     this.annotateImage();
      //     (this.markerArea as MarkerArea).startRenderAndClose();
      //   });
      // }
    }
  });

  const annotateImage = () => {
    if (cropArea.value?.isOpen) {
      cropArea.value.close();
    }

    if (markerArea.value?.isOpen) {
      return;
    }

    const refElement = imageElementRef.value as HTMLImageElement;

    // save the content of the annotated image to restore if the user cancels the annotation
    lastAnnotatedImage.value = refElement.src;

    // copy the cropped, non-annotated, image as the source of the annotation
    refElement.src =
      lastCroppedImage.value !== '' ? lastCroppedImage.value : originalImagePreview.value;

    // create an instance of MarkerArea and pass the target image reference as a parameter
    markerArea.value = new MarkerArea(refElement);
    markerArea.value.renderAtNaturalSize = true;

    // attach the annotation UI to the parent of the image
    markerArea.value.targetRoot = refElement.parentElement as HTMLElement;

    let isAnnotationSaved = false;

    // register an event listener for when user clicks Close in the marker.js UI
    // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
    // TODO: update to version 2.16 and use .addEventListener('close', () => {});
    markerArea.value.addCloseEventListener(() => {
      if (!isAnnotationSaved) {
        console.log('closing without saving, reapplying last saved state');
        refElement.src = lastAnnotatedImage.value;
      }
      console.log('closing after saving');
      // TODO: can we remove this next line? seems like we always initialize it to false when we're showing it.
      isAnnotationSaved = false;
    });

    // register an event listener for when user clicks OK/save in the marker.js UI
    markerArea.value.addRenderEventListener((dataUrl, state) => {
      isAnnotationSaved = true;

      // Replace the image element's src value with the annotated image
      console.log('rendering new state. are they the same?', refElement.src === dataUrl, state);
      refElement.src = dataUrl;

      // save state
      markerAreaState.value = state;
    });

    // finally, call the show() method and marker.js UI opens
    markerArea.value.show();

    // if previous state is present - restore it
    if (markerAreaState.value) {
      markerArea.value.restoreState(markerAreaState.value);
      console.log('restoring state', markerAreaState.value);
    }
  };

  const cropImage = () => {
    if (markerArea.value?.isOpen) {
      markerArea.value.close();
    }
    if (cropArea.value?.isOpen) {
      return;
    }

    showCropInfoMessage.value = true;

    const refCroppedImage = imageElementRef.value as HTMLImageElement;

    // create an instance of CropArea and pass the target image reference as a parameter
    cropArea.value = new CropArea(refCroppedImage);
    cropArea.value.renderAtNaturalSize = true;

    // before beginning the crop mode,
    //  we must ensure the full image is shown as the crop source
    // @LIMITATION: we are not able to leverage a good preview of the full original image with annotations applied unless we invoke the annotate-tool and wait until it is done
    refCroppedImage.src = originalImagePreview.value;

    // attach the crop UI to the parent of the image
    cropArea.value.targetRoot = refCroppedImage.parentElement as HTMLElement;

    // ensure the whole image is visible all the time
    cropArea.value.zoomToCropEnabled = false;

    // do not allow rotation and image flipping
    cropArea.value.styles.settings.hideBottomToolbar = true;

    // hide alignment grid
    cropArea.value.isGridVisible = false;

    let croppedSaved = false;

    // register an event listener for when user clicks Close in the marker.js UI
    // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
    cropArea.value.addCloseEventListener(() => {
      if (!croppedSaved) {
        refCroppedImage.src = lastCroppedImage.value;

        // hide the info message regarding the crop preview and the visibility of annotations
        showCropInfoMessage.value = false;

        // apply existing annotations, if any, after cancelling the image crop
        nextTick(() => {
          // note that this close event may be called if the user clicks Annotate while the crop mode was open
          // so we should not request re-annotation (in the next tick)
          //  or otherwise it would cancel the annotation mode that is being initiated
          if (!markerArea.value?.isOpen) {
            annotateImage();
            (markerArea.value as MarkerArea).startRenderAndClose();
          }
        });
      }
      croppedSaved = false;
    });

    // register an event listener for when user clicks OK/save in the CROPRO UI
    cropArea.value.addRenderEventListener((dataUrl, state) => {
      // we are setting the cropping result to replace our original image on the page
      // but you can set a different image or upload it to your server
      refCroppedImage.src = dataUrl;

      // save the cropped image (which would be used as the source of the annotation later on)
      lastCroppedImage.value = dataUrl;

      // hide the info message regarding the crop preview and the visibility of annotations
      showCropInfoMessage.value = false;

      // save state
      cropState.value = state;

      // apply existing annotations, if any, after cropping the image
      nextTick(() => {
        annotateImage();
        (markerArea.value as MarkerArea).startRenderAndClose();
      });
    });

    // finally, call the show() method and CROPRO UI opens
    cropArea.value.show();

    // handle previous state if present
    if (cropState.value) {
      //
      // Do not restore the state and crop the image
      // Instead, show the original image and the crop rect
      //
      const cropAreaTemp = cropArea.value as any;
      cropAreaTemp.cropLayer.setCropRectangle(cropState.value.cropRect);
    }
  };

  // const revertImage = () => {
  //   if (markerArea.value?.isOpen) {
  //     markerArea.value.close();
  //   }
  //   if (cropArea.value?.isOpen) {
  //     cropArea.value.close();
  //   }
  //   markerAreaState.value = undefined;
  //   cropState.value = undefined;
  //   lastCroppedImage.value = '';
  //   showCropInfoMessage.value = false;
  //   // revert img reference to the original image
  //   if (originalImagePreview.value && originalImagePreview.value !== '') {
  //     const refFinalImage = $refs.imageElementRef as HTMLImageElement;
  //     refFinalImage.src = originalImagePreview.value;
  //   }
  // };
  const onCancelEdit = () => {
    // if annotation/cropping was enabled, we need to apply them
    // FIXME: this call has been commented out for years (as of December 2023).
    //  It's not clear why or whether it causes bugs.
    // revertImage();
    if (markerArea.value?.isOpen) {
      markerArea.value.close();
    }
    if (cropArea.value?.isOpen) {
      cropArea.value.close();
    }
  };

  const annotationAndCropState = computed(() => ({
    markerAreaState: markerAreaState.value,
    cropAreaState: cropState.value,
    croppedImageWithoutAnnotations:
      lastCroppedImage.value !== '' ? lastCroppedImage.value : originalImagePreview.value,
    originalImagePreview: originalImagePreview.value,
  }));

  return {
    imageElementRef,
    onCancelEdit,
    cropImage,
    annotateImage,
    // TODO: improve crop info warning appearance
    showCropInfoMessage,
    annotationAndCropState,
    insightThumbnail: computed(() => imageElementRef.value?.src),
  };
}
