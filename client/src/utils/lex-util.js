import _ from 'lodash';
import { ValueStateValue } from '@uncharted.software/lex/dist/lex';

const SUGGESTIONS_LIMIT = 15;

/**
 * Suggestion builder for MappedOptionState
 *
 * @param {string} message - assistant message
 * @param {boolean} isMultiValue - if state allows multi value
 * @param {object} map - key/value map
 */
function mappedSuggestionBuilder(message, isMultiValue, map) {
  const states = Object.keys(map).map(key => {
    return new ValueStateValue(key, { key: key, searchKey: map[key] });
  });

  return {
    name: message,
    suggestionLimit: SUGGESTIONS_LIMIT,
    fetchSuggestions: function(hint = '') {
      return states.filter(d => {
        return d.meta.searchKey.includes(hint);
      });
    },
    multivalue: isMultiValue,
    allowUnknown: false,
    map: map
  };
}

function _matches(target, str) {
  return target.toLowerCase().replace(/_/g, ' ').includes(
    str.toLowerCase().replace(/_/g, ' ')
  );
}

/**
 * Suggestion builder for MappedOptionState where the states are dynamic
 *
 * @param {string} message - assistant message
 * @param {boolean} isMultiValue - if state allows multi value
 * @param {function} mapFn - a function that returns a key-value map
 */
function dynamicMappedSuggestionBuilder(message, isMultiValue, mapFn) {
  const createStates = (map) => {
    const list = Object.keys(map).map(key => {
      return new ValueStateValue(key, { key: key, searchKey: map[key] });
    });
    return list;
  };

  return {
    name: message,
    suggestionLimit: SUGGESTIONS_LIMIT,
    fetchSuggestions: function(hint = '') {
      const map = mapFn();
      const states = createStates(map);
      this.keyMap = map;
      return states.filter(d => {
        return d.meta.searchKey.includes(hint);
      });
    },
    multivalue: isMultiValue,
    allowUnknown: false
  };
}

/**
 * Suggestion builder for ValueState
 *
 * @param {string} message - assistant message
 * @param {boolean} isMultiValue - if state allows multi value
 * @param {array} suggestions - list of string suggestions
 */
function simpleSuggestionBuilder(message, isMultiValue, suggestions) {
  const states = suggestions.map(suggestion => {
    return new ValueStateValue(suggestion);
  });
  return {
    name: message,
    suggestionLimit: SUGGESTIONS_LIMIT,
    fetchSuggestions: function(hint = '') {
      return states.filter(d => _matches(d.key, hint));
    },
    multivalue: isMultiValue,
    allowUnknown: false
  };
}

/**
 * Suggestion builder for ValueState where the states are dynamic
 *
 * @param {string} message - assistant message
 * @param {boolean} isMultiValue - if state allows multi value
 * @param {function} suggestionFn - a function that returns a list of suggestion strings
 */
function dynamicSimpleSuggestionBuilder(message, isMultiValue, suggestionFn, customMatchFn = _matches) {
  const createStates = (suggestions) => {
    return suggestions.map(suggestion => {
      return new ValueStateValue(suggestion);
    });
  };

  return {
    name: message,
    suggestionLimit: SUGGESTIONS_LIMIT,
    fetchSuggestions: function(hint = '') {
      return new Promise((resolve) => {
        const states = createStates(suggestionFn());
        if (_.isEmpty(hint)) {
          resolve(states);
        }
        resolve(states.filter(d => customMatchFn(d.key, hint)));
      });
    },
    multivalue: isMultiValue,
    allowUnknown: false
  };
}

const convertToLex = (values, lexType) => {
  return _convertTo(values, lexType);
};

const convertFromLex = (values, baseType) => {
  const flattened = _.isArray(values) ? values.map(v => v.key) : [values.key];
  return _convertTo(flattened, baseType);
};

function _convertTo (values, convertType) {
  let result = values;

  if (convertType === 'integer') {
    result = values.map(r => +r);
  } else if (convertType === 'string') {
    result = values.map(r => '' + r);
  }
  return result;
}

export default {
  mappedSuggestionBuilder,
  simpleSuggestionBuilder,
  dynamicMappedSuggestionBuilder,
  dynamicSimpleSuggestionBuilder,
  convertToLex,
  convertFromLex
};
