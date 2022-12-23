import { Lex, TransitionFactory, ValueState } from '@uncharted.software/lex/dist/lex';
import BasePill from '@/search/pills/base-pill';
import lexUtil from '@/search/lex-util';

/**
 * Used for suggestions that can change during the user session.
 * For example additional concepts can be added by the user.
 */
export default class DynamicValuePill extends BasePill {
  constructor(config, suggestionFn, msg, isMultiValue, relation) {
    super(config);
    this.relation = relation;

    const getFormatterFn = () => this.displayFormatter;

    // HACK
    class ConceptValueState extends ValueState {
      unformatUnboxedValue(displayKey /* , context = [] */) {
        return displayKey;
      }

      formatUnboxedValue(key /* , context = [] */) {
        return getFormatterFn()(key);
      }
    }

    if (['topic', 'subjConcept', 'objConcept'].includes(config.field)) {
      this.valueState = ConceptValueState;
      this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, isMultiValue, suggestionFn);
    } else {
      this.valueState = ValueState;
      this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, isMultiValue, suggestionFn);
    }
  }

  makeBranch() {
    return Lex.from('relation', this.relation, {
      defaultValue: this.relation.IS,
      ...TransitionFactory.valueMetaCompare({ searchKey: this.searchKey }),
    }).to('value', this.valueState, this.branchConfig);
  }
}
