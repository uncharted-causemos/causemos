import { ValueStateValue, RelationState } from '@uncharted.software/lex/dist/lex';

const options = [['between', 'between']].map(
  (o) => new ValueStateValue(o[0], {}, { displayKey: o[1] })
);

export default class NumericBetweenState extends RelationState {
  /**
   * The "between" option.
   */
  static get BETWEEN() {
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
