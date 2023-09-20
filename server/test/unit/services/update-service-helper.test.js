const expect = require('chai').expect;
const helper = require('#@/services/update-service-helper.js');

describe('update-service', () => {
  let groundingInput = {};
  let polarityInput = {};

  beforeEach(() => {
    groundingInput = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        candidates: [],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        candidates: [],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'xyz///foobar',
        min_grounding_score: 0.5,
        is_selfloop: false,
        statement_polarity: 1,
      },
    };

    polarityInput = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        polarity: -1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'xyz///foobar',
        min_grounding_score: 0.5,
        statement_polarity: -1,
        is_selfloop: false,
      },
    };
  });

  it('discard statement', () => {
    const statement = {
      wm: { state: 1 },
    };
    helper.discardStatement(statement);
    expect(statement.wm.state).to.eql(3);
  });

  it('update grounding - subject', () => {
    const output = {
      subj: {
        concept: 'abc',
        concept_score: 1.0,
        candidates: [{ name: 'abc', score: 1.0 }],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        candidates: [],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'abc///foobar',
        min_grounding_score: 0.5,
        is_selfloop: false,
        statement_polarity: 1,
        edited: 1,
      },
    };
    helper.updateFactorGrounding(groundingInput, { subj: { oldValue: 'xyz', newValue: 'abc' } });
    expect(groundingInput).to.eql(output);
  });

  it('update grounding - object', () => {
    const output = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        candidates: [],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'abc',
        concept_score: 1.0,
        candidates: [{ name: 'abc', score: 1.0 }],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'xyz///abc',
        min_grounding_score: 0.5,
        is_selfloop: false,
        statement_polarity: 1,
        edited: 1,
      },
    };
    helper.updateFactorGrounding(groundingInput, { obj: { oldValue: 'foobar', newValue: 'abc' } });
    expect(groundingInput).to.eql(output);
  });

  it('update grounding - no effect', () => {
    const output = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        candidates: [],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        candidates: [],
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'xyz///foobar',
        min_grounding_score: 0.5,
        is_selfloop: false,
        statement_polarity: 1,
        edited: 1,
      },
    };
    helper.updateFactorGrounding(groundingInput, { obj: { oldValue: '11111', newValue: 'abc' } });
    expect(groundingInput).to.eql(output);
  });

  it('update polarity', () => {
    const output = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        polarity: -1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        polarity: -1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'xyz///foobar',
        min_grounding_score: 0.5,
        statement_polarity: 1,
        is_selfloop: false,
        edited: 1,
      },
    };
    helper.updateFactorPolarity(polarityInput, { obj: { oldValue: 1, newValue: -1 } });
    expect(polarityInput).to.eql(output);
  });

  it('update polarity - no effect', () => {
    const output = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        polarity: -1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'xyz///foobar',
        min_grounding_score: 0.5,
        statement_polarity: -1,
        is_selfloop: false,
        edited: 1,
      },
    };
    helper.updateFactorPolarity(polarityInput, { obj: { oldValue: -1, newValue: 1 } });
    expect(polarityInput).to.eql(output);
  });

  it('vetting', () => {
    const output = {
      subj: {
        concept: 'xyz',
        concept_score: 0.5,
        polarity: -1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      obj: {
        concept: 'foobar',
        concept_score: 0.5,
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 2,
        edge: 'xyz///foobar',
        min_grounding_score: 0.5,
        statement_polarity: -1,
        is_selfloop: false,
      },
    };
    helper.vetStatement(polarityInput, {});
    expect(polarityInput).to.eql(output);
  });

  it('reverse relation', () => {
    const output = {
      obj: {
        concept: 'xyz',
        concept_score: 0.5,
        polarity: -1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      subj: {
        concept: 'foobar',
        concept_score: 0.5,
        polarity: 1,
        theme: '',
        theme_property: '',
        process: '',
        process_property: '',
      },
      wm: {
        state: 3,
        edge: 'foobar///xyz',
        min_grounding_score: 0.5,
        statement_polarity: -1,
        is_selfloop: false,
        edited: 1,
      },
    };
    helper.reverseRelation(polarityInput);
    expect(polarityInput).to.eql(output);
  });
});
