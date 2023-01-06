/**
 * Detects the initial moment when the target element intersect with the viewport and become visible. When the target element becomes visible, it executes the provided callback.
 * An example usage can be detecting an image element that's entering the scrollable area and lazy loading the image src.
 * @param targetElement target element.
 * @param callback callback to be executed once target element is visible inside the viewport.
 */
export default function useVisibleElementDetector(targetElement: Element, callback: Function) {
  const options = {
    rootMargin: '0px',
    threshold: 0,
  };
  const observer = new IntersectionObserver((entries, ob) => {
    if (entries[0].isIntersecting) {
      callback();
      ob.unobserve(targetElement);
    }
  }, options);
  observer.observe(targetElement);
  return () => observer.disconnect();
}
