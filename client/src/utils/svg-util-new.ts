// TODO: convert the remaining function in svg-util.js to TypeScript in this
//  file, then rename this file to `svg-util.ts` so that existing imports work
//  correctly.

import * as d3 from 'd3';
import { D3Selection } from '@/types/D3';
import { translate } from './svg-util';

const BUTTON_PADDING = 10;

export enum SVG_BUTTON_STYLES {
  DEFAULT = 'DEFAULT',
  PRIMARY = 'PRIMARY'
}

const STYLES = {
  [SVG_BUTTON_STYLES.DEFAULT]: {
    fill: '#dedede',
    hoverFill: '#e8e8e8',
    textColor: 'black'
  },
  [SVG_BUTTON_STYLES.PRIMARY]: {
    fill: '#2255BB',
    hoverFill: '#4c7fe6',
    textColor: 'white'
  }
};

/**
 * Creates a button with a dynamically calculated width based on the button text.
 * If an element with class name `className` already exists, it will be updated.
 * @param parent the D3Selection to add the button to
 * @param style one of SVG_BUTTON_STYLES
 * @returns an object with the `buttonSelection` and `dynamicWidth`
 */
export const createOrUpdateButton = (
  text: string,
  className: string,
  parent: D3Selection,
  clickHandler: (event: any) => void,
  style = SVG_BUTTON_STYLES.DEFAULT
) => {
  const selectedStyle = STYLES[style];
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
    .style('fill', selectedStyle.textColor)
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
    .style('fill', selectedStyle.fill);
  // Hover styles
  buttonSelection
    .on('mouseenter', function() {
      d3.select(this).select('.button-background')
        .style('fill', selectedStyle.hoverFill);
    })
    .on('mouseleave', function() {
      d3.select(this).select('.button-background')
        .style('fill', selectedStyle.fill);
    });
  // Move the label in front of the button background
  label.raise();
  buttonSelection.on('click', clickHandler);
  return { buttonSelection, dynamicWidth };
};
