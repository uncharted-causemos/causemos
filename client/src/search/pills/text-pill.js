import { Lex, TransitionFactory, TextEntryState } from '@uncharted.software/lex/dist/lex';
import BasePill from '@/search/pills/base-pill';
import SingleRelationState from '@/search/single-relation-state';

export default class TextPill extends BasePill {
  constructor(config) {
    super(config);
    this.branchConfig = { multivalue: true };
  }

  makeBranch() {
    return Lex.from(
      'relation',
      SingleRelationState,
      TransitionFactory.valueMetaCompare({ searchKey: this.searchKey })
    ).branch(Lex.from('value', TextEntryState, this.branchConfig));
  }
}
