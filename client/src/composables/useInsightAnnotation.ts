import { CropArea, CropAreaState } from 'cropro';
import { MarkerArea, MarkerAreaState } from 'markerjs2';
import { Ref, computed, nextTick, ref, watch } from 'vue';

export default function useInsightAnnotation(imagePreview: Ref<string | null>) {
  const markerArea = ref<MarkerArea | undefined>(undefined);
  const markerAreaState = ref<MarkerAreaState | undefined>(undefined);
  const setMarkerAreaState = (newState: MarkerAreaState) => {
    markerAreaState.value = newState;
  };

  const cropArea = ref<CropArea | undefined>(undefined);
  const cropState = ref<CropAreaState | undefined>(undefined);
  const setCropState = (newState: CropAreaState) => {
    cropState.value = newState;
  };

  const annotation = ref<any>(null);
  const setAnnotation = (newValue: any) => {
    annotation.value = newValue;
  };

  const finalImagePreview = ref<HTMLImageElement | null>(null);
  const lastCroppedImage = ref('');
  const lastAnnotatedImage = ref('');
  const showCropInfoMessage = ref(false);

  const originalImagePreview = ref('');
  watch(imagePreview, (_imagePreview) => {
    if (_imagePreview === null) {
      originalImagePreview.value = '';
      return;
    }
    // apply previously saved annotation, if any
    if (!annotation.value) {
      originalImagePreview.value = imagePreview.value ?? '';
      return;
    }

    originalImagePreview.value = annotation.value.originalImagePreview;
    // lastCroppedImage.value = annotation.value.previewImage;
    if (annotation.value.markerAreaState || annotation.value.cropAreaState) {
      setMarkerAreaState(annotation.value.markerAreaState);
      setCropState(annotation.value.cropAreaState);
      // NOTE: REVIEW: FIXME:
      //  restoring both annotation and/or cropping is tricky since each one calls the other
      // if (this.markerAreaState) {
      //   nextTick(() => {
      //     const refAnnotatedImage = this.$refs.finalImagePreview as HTMLImageElement;
      //     refAnnotatedImage.src = this.originalImagePreview;
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

    const refAnnotatedImage = finalImagePreview.value as HTMLImageElement;

    // save the content of the annotated image to restore if the user cancels the annotation
    lastAnnotatedImage.value = refAnnotatedImage.src;

    // copy the cropped, non-annotated, image as the source of the annotation
    refAnnotatedImage.src =
      lastCroppedImage.value !== '' ? lastCroppedImage.value : originalImagePreview.value;

    // create an instance of MarkerArea and pass the target image reference as a parameter
    markerArea.value = new MarkerArea(refAnnotatedImage);

    // attach the annotation UI to the parent of the image
    markerArea.value.targetRoot = refAnnotatedImage.parentElement as HTMLElement;
    markerArea.value.renderAtNaturalSize = true;

    let annotationSaved = false;

    // register an event listener for when user clicks Close in the marker.js UI
    // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
    markerArea.value.addCloseEventListener(() => {
      if (!annotationSaved) {
        refAnnotatedImage.src = lastAnnotatedImage.value;
      }
      annotationSaved = false;
    });

    // register an event listener for when user clicks OK/save in the marker.js UI
    markerArea.value.addRenderEventListener((dataUrl, state) => {
      annotationSaved = true;

      // we are setting the markup result to replace our original image on the page
      // but you can set a different image or upload it to your server
      refAnnotatedImage.src = dataUrl;

      // save state
      markerAreaState.value = state;
    });

    // finally, call the show() method and marker.js UI opens
    markerArea.value.show();

    // if previous state is present - restore it
    if (markerAreaState.value) {
      markerArea.value.restoreState(markerAreaState.value);
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

    const refCroppedImage = finalImagePreview.value as HTMLImageElement;

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
  //     const refFinalImage = $refs.finalImagePreview as HTMLImageElement;
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

  const insightThumbnail = computed(() => finalImagePreview.value?.src);

  const annotationAndCropState = computed(() => ({
    markerAreaState: markerAreaState.value,
    cropAreaState: cropState.value,
    imagePreview:
      lastCroppedImage.value !== '' ? lastCroppedImage.value : originalImagePreview.value,
    originalImagePreview: originalImagePreview.value,
  }));

  return {
    finalImagePreview,
    onCancelEdit,
    cropImage,
    annotateImage,
    showCropInfoMessage,
    annotationAndCropState,
    insightThumbnail,
    setAnnotation,
  };
}
