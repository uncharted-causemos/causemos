import { ValueStateValue, RelationState } from '@uncharted.software/lex/dist/lex';
const options = [['from', 'from']].map((o) => new ValueStateValue(o[0], {}, { displayKey: o[1] }));
// Adapted from binary relations
export default class EdgeRelationState extends RelationState {
  /**
   * The "from" option.
   */
  static get SOURCE_IS() {
    return options[0];
  }

  constructor(config) {
    if (config.name === undefined) config.name = 'Choose a search option';
    config.options = function () {
      return options;
    };
    super(config);
  }
}
