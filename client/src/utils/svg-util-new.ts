// TODO: convert the remaining function in svg-util.js to TypeScript in this
//  file, then rename this file to `svg-util.ts` so that existing imports work
//  correctly.

import { D3Selection } from '@/types/D3';
import { translate } from './svg-util';

const BUTTON_PADDING = 10;

// TODO: document that existing children with the supplied classname will be replaced
// TODO: change default styles, consider which styling options need to be exposed
export const createOrUpdateButton = (
  text: string,
  className: string,
  parent: D3Selection,
  clickHandler: () => void
) => {
  // Create group to hold button
  const buttonSelection = parent
    .selectAll(`.${className}`)
    .data([text])
    .join('g')
    .classed(className, true)
    .style('cursor', 'pointer');
  // Create button label
  const label = buttonSelection
    .selectAll('text.button-label')
    .data(text => [text])
    .join('text')
    .classed('button-label', true)
    .attr('transform', translate(BUTTON_PADDING, 20))
    .text(text => text);
  // Get the text length in pixels to set the background width accordingly
  let labelWidth = 150;
  try {
    labelWidth = (label.node() as SVGTextContentElement).getComputedTextLength();
  } catch (e) {}
  // Create the button background
  const dynamicWidth = labelWidth + 2 * BUTTON_PADDING;
  buttonSelection
    .selectAll('rect.button-background')
    .data(text => [text])
    .join('rect')
    .classed('button-background', true)
    .attr('width', dynamicWidth)
    .attr('height', 30)
    .attr('rx', 2)
    .attr('ry', 2)
    .style('fill', 'white');
  // Move the label in front of the button background
  label.raise();

  buttonSelection.on('click', clickHandler);

  return { buttonSelection, dynamicWidth };
};
