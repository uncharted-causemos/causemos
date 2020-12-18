import _ from 'lodash';
import { ValueState } from '@uncharted.software/lex/dist/lex';

/**
 * Leverage boxed/unboxed values to do key=>value maps
 *
 * Takes in an additional config.map to perform lookups
 */
export default class MappedOptionState extends ValueState {
  constructor(config) {
    super(config);

    this.keyMap = config.map ? config.map : {};
  }

  unformatUnboxedValue (displayKey, context = []) { // eslint-disable-line no-unused-vars
    return _.invert(this.keyMap)[displayKey] || displayKey;
  }

  formatUnboxedValue (key, context = []) { // eslint-disable-line no-unused-vars
    return this.keyMap[key] || key;
  }
}
