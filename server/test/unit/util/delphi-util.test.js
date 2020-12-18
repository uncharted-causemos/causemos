const expect = require('chai').expect;

const delphiUtil = require('../../../src/util/delphi-util');

const timeseries = [{
  'year': 2014,
  'month': 1,
  'value': 1,
  'timestamp': 1388552400000
}, {
  'year': 2014,
  'month': 2,
  'value': 2,
  'timestamp': 1391230800000
}, {
  'year': 2014,
  'month': 3,
  'value': 3,
  'timestamp': 1393650000000
}, {
  'year': 2014,
  'month': 4,
  'value': 4,
  'timestamp': 1396324800000
}];

const timeseriesNegativeValues = [{
  'year': 2014,
  'month': 1,
  'value': -1,
  'timestamp': 1388552400000
}, {
  'year': 2014,
  'month': 2,
  'value': 2,
  'timestamp': 1391230800000
}, {
  'year': 2014,
  'month': 3,
  'value': -3,
  'timestamp': 1393650000000
}, {
  'year': 2014,
  'month': 4,
  'value': 40.8,
  'timestamp': 1396324800000
}]

const sampleModelOutputArr = [
  {
    month: 1,
    value: 1,
    year: 2020
  },
  {
    month: 2,
    value: 2,
    year: 2020
  },
  {
    month: 3,
    value: 3,
    year: 2020
  },
  {
    month: 4,
    value: 4,
    year: 2020
  }
]

const expectedTimestamp = [
  {
    value: 1,
    timestamp: 1577836800000 // jan 1st 2020
  },
  {
    value: 2,
    timestamp: 1580515200000 // feb 1st 2020
  },
  {
    value: 3,
    timestamp: 1583020800000 // march 1st 2020
  },
  {
    value: 4,
    timestamp: 1585699200000 // april 1st 2020
  }
]

describe('delphi-util', function () {
  it('calculate initial perturbation with array length > 2', function () {
    const initialPerturbation = delphiUtil.calculateInitialPerturbation(timeseries);
    expect(initialPerturbation).to.equal(0.3);
  });
  it('calculate initial perturbation with array length < 2', function () {
    const initialPerturbation1 = delphiUtil.calculateInitialPerturbation(timeseries.slice(0, 1));
    expect(initialPerturbation1).to.equal(0);
  });
  it('calculate initial perturbation with positive and negative values', function () {
    const initialPerturbation2 = delphiUtil.calculateInitialPerturbation(timeseriesNegativeValues);
    expect(initialPerturbation2).to.equal(1);
  });
  it('transforms delphi date output to timestamp', function () {
    const transformed = delphiUtil.convertToTimestamp(sampleModelOutputArr);
    expect(transformed).to.eql(expectedTimestamp);
  })
});
