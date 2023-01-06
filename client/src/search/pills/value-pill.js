import { Lex, TransitionFactory, ValueState } from '@uncharted.software/lex/dist/lex';

import BinaryRelationState from '@/search/binary-relation-state';
import BasePill from '@/search/pills/base-pill';

import lexUtil from '@/search/lex-util';

/**
 * Used for static suggestions in list format. For example readers.
 */
export default class ValuePill extends BasePill {
  constructor(config, list, msg) {
    super(config);
    this.branchConfig = lexUtil.dynamicSimpleSuggestionBuilder(msg, true, () => list);
  }

  makeBranch() {
    return Lex.from(
      'relation',
      BinaryRelationState,
      TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    ).to('value', ValueState, this.branchConfig);
  }
}
