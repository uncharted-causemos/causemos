// TODO: convert the remaining function in svg-util.js to TypeScript in this
//  file, then rename this file to `svg-util.ts` so that existing imports work
//  correctly.

import { D3Selection } from '@/types/D3';
import { translate } from './svg-util';

// TODO: document that existing children with the supplied classname will be replaced
// TODO: change default styles, consider which styling options need to be exposed
export const createOrUpdateButton = (
  text: string,
  className: string,
  parent: D3Selection,
  clickHandler: () => void
) => {
  const buttonSelection = parent
    .selectAll(`.${className}`)
    .data([text])
    .join('g')
    .classed(className, true)
    .style('cursor', 'pointer');

  buttonSelection
    .selectAll('rect.button-background')
    .data(text => [text])
    .join('rect')
    .classed('button-background', true)
    .attr('width', 150) // TODO: dynamic based on text width
    .attr('height', 30)
    .style('fill', 'white');

  buttonSelection
    .selectAll('text.button-label')
    .data(text => [text])
    .join('text')
    .classed('button-label', true)
    .attr('transform', translate(10, 20))
    .text(text => text);

  buttonSelection.on('click', clickHandler);

  return buttonSelection;
};
