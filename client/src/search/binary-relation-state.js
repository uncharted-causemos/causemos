import { ValueStateValue, RelationState } from '@uncharted.software/lex/dist/lex';

const options = [
  ['is', 'is'],
  ['not', 'not'],
].map((o) => new ValueStateValue(o[0], {}, { displayKey: o[1] }));
// Adapted from pantera
export default class BinaryRelationState extends RelationState {
  /**
   * The "is" option.
   */
  static get IS() {
    return options[0];
  }

  /**
   * The "is not" option.
   */
  static get IS_NOT() {
    return options[1];
  }

  constructor(config) {
    if (config.name === undefined) config.name = 'Choose a search relation';
    config.options = function () {
      return options;
    };
    super(config);
  }
}
