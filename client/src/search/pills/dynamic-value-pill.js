import _ from 'lodash';
import { Lex, TransitionFactory, ValueState } from '@uncharted.software/lex/dist/lex';
import BasePill from '@/search/pills/base-pill';
import lexUtil from '@/utils/lex-util';

// HACK
class ConceptValueState extends ValueState {
  unformatUnboxedValue (displayKey, context = []) { // eslint-disable-line no-unused-vars
    return displayKey;
  }

  formatUnboxedValue (key, context = []) { // eslint-disable-line no-unused-vars
    return _.last(key.split('/'));
  }
}

const conceptMatch = (target, str) => {
  return _.last(target.split('/')).toLowerCase().replace(/_/g, ' ').includes(
    str.toLowerCase().replace(/_/g, ' ')
  );
};

/**
 * Used for suggestions that can change during the user session.
 * For example additional concepts can be added by the user.
 */
export default class DynamicValuePill extends BasePill {
  constructor(config, suggestionFn, msg, isMultiValue, relation) {
    super(config);
    this.relation = relation;

    if (['topic', 'subjConcept', 'objConcept'].includes(config.field)) {
      this.valueState = ConceptValueState;
      this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, isMultiValue, suggestionFn, conceptMatch);
    } else {
      this.valueState = ValueState;
      this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, isMultiValue, suggestionFn);
    }
  }

  makeBranch() {
    return Lex.from('relation', this.relation, {
      defaultValue: this.relation.IS,
      ...TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    }).to('value', this.valueState, this.branchConfig);
  }
}

