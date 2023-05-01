/**
 * Moved from modal-document.vue
 *
 * Provides utilities to process basic text data for a scrolling modal window.
 */

import { SELECTED_COLOR } from '@/utils/colors-util';
import { Highlight } from '@/types/IndexDocuments';

// gradually loosen search requirements of a "regex and select punctuation"-sanitized
// search string by progressively adding regex wildcards to account for skipped
// characters, words and phrases in the text fragment being searched for.
const iterativeRegexSearch = (text: string, fragment: string, useWhitespace = false) => {
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
      return text.replace(searchRegEx, reformat(fragment));
    }

    if (useWhitespace) {
      sanitizedSearch = sanitizedSearch.replace(' ', '\\w+');
    } else {
      sanitizedSearch = sanitizedSearch.replace(' ', '\\b.*?\\b');
    }

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
      return text.replace(fragment, reformat(fragment));
    }
  }

  return text;
};

const reformat = (v: string) => {
  return `<span class='extract-text-anchor' style='border-bottom: 2px solid${SELECTED_COLOR}'>${v}</span>`;
};

const applyHighlights = (text: string, highlights: Highlight[]) => {
  let highlightContent = text;

  if (highlights !== null) {
    const highlightsDone: string[] = []; // ensure we don't double highlight
    highlights.forEach((highlight) => {
      if (!highlightsDone.includes(highlight.text.toUpperCase())) {
        highlightsDone.push(highlight.text.toUpperCase());
        const regex = new RegExp(highlight.text, 'ig');
        const matches = highlightContent.matchAll(regex);

        let accumulatedOffset = 0;
        for (const match of matches) {
          const offsetIndex = (match.index ?? 0) + accumulatedOffset; // track change in offset due to previous sub
          const beginning = highlightContent.slice(0, offsetIndex);
          const end = highlightContent.slice(offsetIndex + match[0].length);
          const substitutionText = `<span class="dojo-mark">${match[0]}</span>`;
          highlightContent = beginning.concat(substitutionText, end);
          accumulatedOffset += substitutionText.length - match[0].length;
        }
      }
    });
  }
  return highlightContent;
};

const combinedSearch = (text: string, phrase: string, useWhitespace = false): string => {
  let t = text;
  if (text.indexOf(phrase) >= 0) {
    t = t.replace(phrase, reformat(phrase));
  } else {
    t = lossySearch(t, phrase);
  }
  // if all else fails, do this expensive regex search
  if (t === text) {
    t = iterativeRegexSearch(t, phrase, useWhitespace);
  }
  return t;
};

const scrollToAnchor = () => {
  const anchor: HTMLElement = document.getElementsByClassName(
    'extract-text-anchor'
  )[0] as HTMLElement;

  if (anchor) {
    const scroller = document.getElementsByClassName('modal-body')[0];
    scroller.scrollTop = anchor.offsetTop - 100;
  }
};

const updateElement = (element: HTMLElement, updatedText: string, needsScrollTo = true) => {
  element.innerHTML = updatedText;
  if (needsScrollTo) {
    scrollToAnchor();
  }
};

/**
 *
 * @param element
 * @param bodyText
 * @param textFragment
 * @param useWhitespace
 */
export const textSearch = (
  element: HTMLElement,
  bodyText: string,
  textFragment: string,
  useWhitespace = false
): boolean => {
  let t = bodyText;
  if ((bodyText ?? null) !== null && (textFragment ?? null) !== null) {
    t = combinedSearch(bodyText, textFragment, useWhitespace);
  }
  const textFound = !(t === bodyText);
  updateElement(element, t, textFound);

  return textFound;
};

const createTextViewer = (text = '', snippet: string | null = null, doSearch = false) => {
  let phraseFound = false;
  const phrase = snippet;
  let originalText = text;
  const el = document.createElement('div');
  el.style.paddingTop = '30px';
  el.style.paddingLeft = '15px';
  el.style.paddingRight = '15px';
  el.style.paddingBottom = '15px';

  /**
   * Original search of entire document body text (non scroll loading).
   *
   * @param textFragment
   * @param useWhitespace
   */
  const search = (textFragment: string, useWhitespace = false) => {
    phraseFound = textSearch(el, text, textFragment, useWhitespace);
  };

  /**
   * Used when data scrolling is enabled
   *
   * @param partialText
   * @param useWhitespace
   */
  const partialSearch = (partialText: string, useWhitespace = false) => {
    if (phrase !== null) {
      const t = combinedSearch(partialText, phrase, useWhitespace);
      phraseFound = t !== partialText;
      return t;
    } else {
      return partialText;
    }
  };

  const phraseWasFound = () => {
    return phraseFound;
  };
  /**
   * Interface may be in a scrolling data mode (partial loads in response to the user interaction)
   * subsequent data is added to the view here.
   *
   * Search required parameter may only be required for a single addition (phrase anchor).  Disable searching
   * as a default for all other appends.
   *
   * @param additionalBodyText - text to be added.
   * @param useWhitespace - regex search to use simple whitespace
   * @param searchRequired - is search required
   */
  const appendText = (
    additionalBodyText: string,
    useWhitespace = true,
    searchRequired = true,
    highlightFragment = true
  ) => {
    if (searchRequired) {
      originalText = originalText.concat(partialSearch(additionalBodyText, useWhitespace));
    } else {
      originalText = originalText.concat(additionalBodyText);
    }
    updateElement(el, originalText, highlightFragment);
    // partialSearch(additionalBodyText, useWhitespace);
  };

  el.innerHTML = originalText;

  if (doSearch && phrase !== null) {
    search(phrase);
  }

  return {
    scrollToAnchor,
    phraseWasFound,
    appendText,
    search,
    element: el,
  };
};

export { createTextViewer, applyHighlights };
