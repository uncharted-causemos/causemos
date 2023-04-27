/**
 * Moved from modal-document.vue
 *
 * Provides utilities to process basic text data for a scrolling modal window.
 */

import { SELECTED_COLOR } from '@/utils/colors-util';

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

const updateElement = (element: HTMLElement, updatedText: string) => {
  element.innerHTML = updatedText;
  const anchor: HTMLElement = document.getElementsByClassName(
    'extract-text-anchor'
  )[0] as HTMLElement;

  if (anchor) {
    const scroller = document.getElementsByClassName('modal-body')[0];
    scroller.scrollTop = anchor.offsetTop - 100;
  }
};
export const textSearch = (
  element: HTMLElement,
  bodyText: string,
  textFragment: string,
  useWhitespace = false
): boolean => {
  let t = bodyText;

  if ((bodyText ?? null) !== null && (textFragment ?? null) === null) {
    element.innerHTML = bodyText;
  } else {
    if ((textFragment ?? null) !== null) {
      t = combinedSearch(bodyText, textFragment, useWhitespace);
      updateElement(element, t);
    }
  }
  return t === bodyText;
};

export const parseHtmlString = (textToParse: string): HTMLElement => {
  const parsedText = new DOMParser().parseFromString(textToParse, 'text/html').body;
  return parsedText;
};

const createTextViewer = (text = '', snippet: string | null = null, isHTML = false) => {
  let phraseFound = false;
  const phrase = snippet;
  let originalText = text;
  const el = document.createElement('div');
  el.style.paddingTop = '30px';
  el.style.paddingLeft = '15px';
  el.style.paddingRight = '15px';
  el.style.paddingBottom = '15px';

  const search = (textFragment: string, useWhitespace = false) => {
    phraseFound = textSearch(el, text, textFragment, useWhitespace);
  };

  const partialSearch = (partialText: string, useWhitespace = false) => {
    if (phrase !== null) {
      const t = combinedSearch(partialText, phrase, useWhitespace);
      phraseFound = t !== partialText;
      if (phraseFound) {
        updateElement(el, t);
      }
      el.innerHTML = el.innerHTML.concat(partialText);
    }
  };

  const phraseWasFound = () => {
    return phraseFound;
  };

  const appendText = (additionalBodyText: string, useWhitespace = true) => {
    originalText = originalText.concat(additionalBodyText);
    partialSearch(additionalBodyText, useWhitespace);
  };

  if (isHTML) {
    const parsed = parseHtmlString(originalText);
    for (let i = 0; i < parsed.children.length; i++) {
      el.append(parsed.children[i]);
    }
  } else {
    el.innerHTML = originalText;
  }

  return {
    phraseWasFound,
    appendText,
    search,
    element: el,
  };
};

export { createTextViewer };
