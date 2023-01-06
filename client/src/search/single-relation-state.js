import { ValueStateValue, RelationState } from '@uncharted.software/lex/dist/lex';
const options = [['is', 'is']].map((o) => new ValueStateValue(o[0], {}, { displayKey: o[1] }));
// Adapted from binary relations
export default class SingleRelationState extends RelationState {
  /**
   * The "is" option.
   */
  static get IS() {
    return options[0];
  }

  constructor(config) {
    if (config.name === undefined) config.name = 'Choose a search option';
    config.options = function () {
      return options;
    };
    config.autoAdvanceDefault = true;
    config.defaultValue = options[0];
    super(config);
  }
}
