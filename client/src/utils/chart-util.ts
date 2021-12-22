
export function getHoverIdFromValue(hoverValue: string) {
  // remove dots/spaces from the string since it will conflict with the d3 selected later on
  let hoverValueNoDots = hoverValue.split('.').join('');
  hoverValueNoDots = hoverValueNoDots.split(',').join('');
  hoverValueNoDots = hoverValueNoDots.split('[').join('');
  hoverValueNoDots = hoverValueNoDots.split(']').join('');
  hoverValueNoDots = hoverValueNoDots.split('-').join('');
  hoverValueNoDots = hoverValueNoDots.split('\'').join('');
  return hoverValueNoDots.split(' ').join('');
}

