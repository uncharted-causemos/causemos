import _ from 'lodash';
import { expect } from 'chai';
import modelService from '@/services/model-service';
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

  it('projection expandExtentForDyseProjections', () => {
    const LEVELS = 31;
    let range = null;

    range = modelService.expandExtentForDyseProjections([0, 10], LEVELS);
    expect(range).to.deep.equal([-10, 20]);

    range = modelService.expandExtentForDyseProjections([-1, 0], LEVELS);
    expect(range).to.deep.equal([-2, 1]);

    range = modelService.expandExtentForDyseProjections([-0.1, 0.1], LEVELS);
    expect(range).to.deep.equal([-0.3, 0.3]);

    range = modelService.expandExtentForDyseProjections([4.0, 4.2], LEVELS);
    expect(range[0]).to.be.approximately(3.8, 0.001);
    expect(range[1]).to.be.approximately(4.4, 0.001);
  });
});
