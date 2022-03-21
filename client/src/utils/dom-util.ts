export const removeChildren = (parentElement: HTMLElement) => {
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }
  return parentElement;
};

/**
 * Check if two elements are sufficiently overlapped
 */
export function overlap (node1: HTMLElement, node2: HTMLElement, threshold: number) {
  const rec1 = node1.getBoundingClientRect();
  const rec2 = node2.getBoundingClientRect();

  const xover = Math.max(0,
    Math.min(rec1.left + rec1.width, rec2.left + rec2.width) - Math.max(rec1.left, rec2.left));

  const yover = Math.max(0,
    Math.min(rec1.top + rec1.height, rec2.top + rec2.height) - Math.max(rec1.top, rec2.top));

  const aover = xover * yover;
  const a1 = rec1.width * rec1.height;
  const a2 = rec2.width * rec2.height;
  const hasOverlap = ((aover / a1) >= threshold || (aover / a2) > threshold);
  return hasOverlap;
}


export const scrollToElementWithId = (id: string) => {
  const element = document.getElementById(id);
  if (element === null) {
    console.error(
      'Failed to scroll to element with ID "',
      id,
      '". Element not found.'
    );
    return;
  }
  scrollToElement(element);
};

type Behavior = 'auto' | 'smooth' | undefined;
export const scrollToElement = (element: Element, behavior:Behavior = 'smooth') => {
  const scrollViewOptions: ScrollIntoViewOptions = {
    behavior,
    block: 'start',
    inline: 'nearest'
  };
  element.scrollIntoView(scrollViewOptions);
};
