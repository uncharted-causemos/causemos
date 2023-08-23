import _ from 'lodash';

import modelService from '@/services/model-service';
import { CAGGraph } from '@/types/CAG';

const A: CAGGraph = {
  nodes: [
    { id: 'n1', concept: 'n1', label: 'n1', components: [] },
    { id: 'n2', concept: 'n2', label: 'n2', components: [] },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', reference_ids: ['s1'], user_polarity: null }],
};

const A_PRIME: CAGGraph = {
  nodes: [
    { id: 'n1', concept: 'n1', label: 'n1', components: [] },
    { id: 'n2', concept: 'n2', label: 'n2', components: [] },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', reference_ids: ['s3'], user_polarity: null }],
};

const B: CAGGraph = {
  nodes: [
    { id: 'c1', concept: 'c1', label: 'c1', components: [] },
    { id: 'c2', concept: 'c2', label: 'c2', components: [] },
  ],
  edges: [{ id: 'e1', source: 'c1', target: 'c2', reference_ids: ['s2'], user_polarity: null }],
};

describe('model-service', () => {
  it('cag basic merge - new nodes/edges', () => {
    const result = _.cloneDeep(A);
    modelService.mergeCAG(result, B, false);
    expect(result.nodes.length).to.equal(4);
    expect(result.edges.length).to.equal(2);
  });

  it('cag reference_ids merge', () => {
    const result = _.cloneDeep(A);
    modelService.mergeCAG(result, A_PRIME, false);
    expect(result.nodes.length).to.equal(2);
    expect(result.edges.length).to.equal(1);
    expect(result.edges[0].reference_ids.length).to.equal(2);
  });

  it('cag self merge', () => {
    const result = _.cloneDeep(A);
    modelService.mergeCAG(result, A, false);
    expect(result.nodes.length).to.equal(2);
    expect(result.edges.length).to.equal(1);
    expect(result.edges[0].reference_ids.length).to.equal(1);
  });
});
