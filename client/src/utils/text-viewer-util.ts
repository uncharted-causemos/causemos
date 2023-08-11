/**
 * Provides utilities to process basic text data for a scrolling modal window.
 */

// Should be kept in sync with the styles in modal-document.vue
const SCROLL_ANCHOR_CLASS = 'paragraph-to-scroll-to';
// Should be kept in sync with the styles in documents.scss
export const HIGHLIGHTED_TEXT_CLASS = 'dojo-mark';
// How much space to leave above the anchor when scrolling to it.
const PIXEL_COUNT_FROM_ANCHOR_TO_TOP = 300;

// gradually loosen search requirements of a "regex and select punctuation"-sanitized
// search string by progressively adding regex wildcards to account for skipped
// characters, words and phrases in the text fragment being searched for.
const iterativeRegexSearch = (text: string, fragment: string) => {
  let sanitizedSearch = fragment
    // remove some special characters, may need adjustment for edge cases but some are regex reserved
    .replace(/[/\\[\].+*?^$(){}|,]/g, '')
    .split(/\s+/)
    .join(' ')
    .trim();

  const spaceTotal = sanitizedSearch.split(' ').length;
  let count = 0;

  while (count <= spaceTotal) {
    const searchRegEx = new RegExp(sanitizedSearch);
    const searchIndex = text.search(searchRegEx);

    if (searchIndex > -1) {
      return text.replace(searchRegEx, createSpanWithClass(fragment, SCROLL_ANCHOR_CLASS));
    }
    sanitizedSearch = sanitizedSearch.replace(' ', '\\b.*?\\b');

    count++;
  }
  return text;
};

// Run through a list of inexpensive, sucessive transforms to try to find the correct match
const lossySearch = (text: string, textFragment: string) => {
  let fragment = textFragment;

  const replacementElements: string[][] = [
    [' .', '.'],
    [' ;', ';'],
    [' ,', ','],
    [' )', ')'],
    ['( ', '('],
  ];

  for (let i = 0; i < replacementElements.length; i++) {
    fragment = fragment.replaceAll(replacementElements[i][0], replacementElements[i][1]);
    if (text.indexOf(fragment) >= 0) {
      return text.replace(fragment, createSpanWithClass(fragment, SCROLL_ANCHOR_CLASS));
    }
  }

  return text;
};

/**
 * Wraps a piece of text in a span element with the specified class name
 * @param text
 * @param className
 * @returns HTML string
 */
const createSpanWithClass = (text: string, className: string) =>
  `<span class='${className}'>${text}</span>`;

const scrollToAnchor = () => {
  const anchor = document.getElementsByClassName(SCROLL_ANCHOR_CLASS)[0] as HTMLElement;
  if (anchor) {
    const scroller = document.getElementsByClassName('modal-body')[0];
    scroller.scrollTop = anchor.offsetTop - PIXEL_COUNT_FROM_ANCHOR_TO_TOP;
  }
};

const applyHighlights = (text: string, highlights: string[]) => {
  let highlightContent = text;

  const highlightsDone: string[] = []; // ensure we don't double highlight
  highlights.forEach((highlight) => {
    if (!highlightsDone.includes(highlight.toUpperCase())) {
      highlightsDone.push(highlight.toUpperCase());
      const regex = new RegExp(highlight, 'ig');
      const matches = highlightContent.matchAll(regex);

      let accumulatedOffset = 0;
      for (const match of matches) {
        const offsetIndex = (match.index ?? 0) + accumulatedOffset; // track change in offset due to previous sub
        const beginning = highlightContent.slice(0, offsetIndex);
        const end = highlightContent.slice(offsetIndex + match[0].length);
        const substitutionText = createSpanWithClass(match[0], HIGHLIGHTED_TEXT_CLASS);
        highlightContent = beginning.concat(substitutionText, end);
        accumulatedOffset += substitutionText.length - match[0].length;
      }
    }
  });
  return highlightContent;
};

const replacePhraseWithScrollAnchorHTMLElement = (text: string, phrase: string): string => {
  let t = text;
  if (text.indexOf(phrase) >= 0) {
    t = t.replace(phrase, createSpanWithClass(phrase, SCROLL_ANCHOR_CLASS));
  } else {
    t = lossySearch(t, phrase);
  }
  // if all else fails, do this expensive regex search
  if (t === text) {
    t = iterativeRegexSearch(t, phrase);
  }
  return t;
};

const createTextViewer = () => {
  let currentText = '';
  const el = document.createElement('div');
  el.innerHTML = currentText;

  /**
   * @param text - text to be added.
   */
  const appendText = (text: string) => {
    currentText = currentText.concat(text);
    el.innerHTML = currentText;
  };

  return {
    scrollToAnchor,
    appendText,
    element: el,
  };
};

export { createTextViewer, applyHighlights, replacePhraseWithScrollAnchorHTMLElement };
