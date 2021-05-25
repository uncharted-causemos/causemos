export const removeChildren = (parentElement: HTMLElement) => {
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }
  return parentElement;
};
