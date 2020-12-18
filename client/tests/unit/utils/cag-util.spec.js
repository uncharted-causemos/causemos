import _ from 'lodash';
import { expect } from 'chai';
import cagUtil from '@/utils/cag-util';

const A = {
  nodes: [
    { id: 'n1', concept: 'n1' }, { id: 'n2', concept: 'n2' }
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', reference_ids: ['s1'] }
  ]
};

const A_PRIME = {
  nodes: [
    { id: 'n1', concept: 'n1' }, { id: 'n2', concept: 'n2' }
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', reference_ids: ['s3'] }
  ]
};

const B = {
  nodes: [
    { id: 'c1', concept: 'c1' }, { id: 'c2', concept: 'c2' }
  ],
  edges: [
    { id: 'e1', source: 'c1', target: 'c2', reference_ids: ['s2'] }
  ]
};

describe('cag-util', () => {
  it('basic merge - new nodes/edges', () => {
    const result = _.cloneDeep(A);
    cagUtil.mergeCAG(result, B);
    expect(result.nodes.length).to.equal(4);
    expect(result.edges.length).to.equal(2);
  });

  it('reference_ids merge', () => {
    const result = _.cloneDeep(A);
    cagUtil.mergeCAG(result, A_PRIME);
    expect(result.nodes.length).to.equal(2);
    expect(result.edges.length).to.equal(1);
    expect(result.edges[0].reference_ids.length).to.equal(2);
  });

  it('self merge', () => {
    const result = _.cloneDeep(A);
    cagUtil.mergeCAG(result, A);
    expect(result.nodes.length).to.equal(2);
    expect(result.edges.length).to.equal(1);
    expect(result.edges[0].reference_ids.length).to.equal(1);
  });
});
