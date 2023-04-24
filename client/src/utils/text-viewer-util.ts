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

const createTextViewer = (text: string, isHTML = false) => {
  const el = document.createElement('div');
  const originalText = text;

  function search(textFragment: string, useWhitespace = false) {
    let t = originalText;

    if (textFragment) {
      if (text.indexOf(textFragment) >= 0) {
        t = t.replace(textFragment, reformat(textFragment));
      } else {
        t = lossySearch(t, textFragment);
      }
      // if all else fails, do this expensive regex search
      if (t === text) {
        t = iterativeRegexSearch(t, textFragment, useWhitespace);
      }

      el.innerHTML = t;
      const anchor: HTMLElement = document.getElementsByClassName(
        'extract-text-anchor'
      )[0] as HTMLElement;

      if (anchor) {
        const scroller = document.getElementsByClassName('modal-body')[0];
        scroller.scrollTop = anchor.offsetTop - 100;
      }
    }
  }

  if (isHTML) {
    const parsedText = new DOMParser().parseFromString(originalText, 'text/html');
    el.appendChild(parsedText.body);
  } else {
    el.innerHTML = originalText;
  }
  el.style.paddingTop = '30px';
  el.style.paddingLeft = '15px';
  el.style.paddingRight = '15px';
  el.style.paddingBottom = '15px';

  return {
    search,
    element: el,
  };
};

export { createTextViewer };
