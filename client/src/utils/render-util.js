
import { plot as Plot, addColorScale, renderColorScaleToCanvas } from 'plotty';
import { COLOR_SCHEME } from '@/utils/colors-util';

// Add custom color scales to plotty
addColorScale('wm-green', COLOR_SCHEME.WM_GREEN, [0, 1]);

// Ref for default plotty color scales: https://github.com/santilland/plotty/blob/98111105c68d928907c6b3f571b971b406f96b21/src/colorscales.js
export const COLOR_SCALES = Object.freeze({
  DEFAULT: 'turbo',
  TURBO: 'turbo',
  HOT: 'hot',
  WM_GREEN: 'wm-green'
});

export function createRasterPlot({
  data = [],
  noDataValue = -9999,
  domain = [0, 1],
  imageWidth = 0,
  imageHeight = 0,
  colorScale = COLOR_SCALES.DEFAULT
}) {
  const datasets = data.map((datum, index) => {
    return {
      id: index,
      data: datum,
      width: imageWidth,
      height: imageHeight
    };
  });

  const canvas = document.createElement('canvas');
  const plottyPlot = new Plot({
    canvas,
    datasets,
    width: imageWidth,
    height: imageHeight,
    domain,
    noDataValue,
    clampHigh: true,
    // clampLow: true,
    colorScale
  });

  return {
    numDataSets: data.length,
    render(dataIndex = 0) {
      plottyPlot.renderDataset(dataIndex);
      return this;
    },
    getCanvas() {
      return canvas;
    },
    toImageUrl () {
      return String(canvas.toDataURL());
    },
    getColorScaleImage() {
      return plottyPlot.getColorScaleImage();
    },
    atPoint (x, y) {
      return plottyPlot.atPoint(x, y);
    },
    getValuesWithinBounds() {
      // get all the raster values within the bounding box
      return 'NYI';
    }
  };
}

/**
 * Render color scale with given name to canvas and returns the canvas.
 * @param {string} name color scale name
 * @returns A canvas element rendered with the color scale
 */
export function createColorScaleCanvas(name = COLOR_SCALES.DEFAULT) {
  const canvas = document.createElement('canvas');
  renderColorScaleToCanvas(name, canvas);
  return canvas;
}
