import { expect } from 'chai';
import {
  ParameterFacetsBuilder,
  FACET_TYPES,
  PARAMETER_TYPES,
} from '@/utils/data/ParameterFacetsBuilder';

// Default test data
const parametersData = [
  {
    default: 0,
    description:
      'Multiplier applied to daily rainfall in every day of the climate record in the counterfactual',
    maximum: 1.5,
    minimum: 0,
    name: 'rainfall',
    type: 'NumberParameter',
  },
  {
    choices: ['warm,wet', 'midrange', 'warm,dry', 'cool,wet', 'cool,dry'],
    default: 'midrange',
    description:
      'One of 5 classes based on the mean 2018-19 cropping-year (March-February) rainfall and temperature anomalies in the climate ensemble member. Ensemble members where the root-mean-square anomaly of temperature and precipitation are within 0.9 standard deviations are "midrange"; otherwise ensemble members are classified according to the quadrant in which they fall.',
    name: 'climate_anomalies',
    type: 'ChoiceParameter',
  },
];
const runsData = [
  {
    id: '062d9473d76a01db9f255e0807ce91b1f3ca6caba81b92a53ae530da9b6e2d78',
    model: 'G-Range',
    parameters: [
      {
        name: 'climate_anomalies',
        value: 'warm,dry',
      },
      {
        name: 'rainfall',
        value: '0.0',
      },
    ],
  },
  {
    id: '096e87ef787f7e576586b2b4a5b457465b55ec092c6ac68a58d8061a3735bc77',
    model: 'G-Range',
    parameters: [
      {
        name: 'climate_anomalies',
        value: 'warm,dry',
      },
      {
        name: 'rainfall',
        value: '0.75',
      },
    ],
  },
  {
    id: '0cda3c746b3a2486a8d301490ba0425f094c6c1fcd3cc26f7f2cc94af448964f',
    model: 'G-Range',
    parameters: [
      {
        name: 'climate_anomalies',
        value: 'cool,wet',
      },
      {
        name: 'rainfall',
        value: '0.0',
      },
    ],
  },
  {
    id: '12a664edacb2022257629b7256eb3e9b7eaf37141823937531694d832ebf7c1b',
    model: 'G-Range',
    parameters: [
      {
        name: 'climate_anomalies',
        value: 'cool,dry',
      },
      {
        name: 'rainfall',
        value: '1.5',
      },
    ],
  },
  {
    id: '1510d2bda57c10f220f2c590d43d813af3bc5d6e4bcd6cda17777f792f4f05f9',
    model: 'G-Range',
    parameters: [
      {
        name: 'climate_anomalies',
        value: 'midrange',
      },
      {
        name: 'rainfall',
        value: '1.5',
      },
    ],
  },
];
describe('utils/data/ParameterFacetsBuilder', () => {
  it('should initialize with with default param values', () => {
    const facetsBuilder = new ParameterFacetsBuilder();
    expect(facetsBuilder.facets()).to.deep.equal({});
    expect(facetsBuilder.facets()).to.deep.equal({});
  });
  it('should initialize with empty facets', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    expect(facetsBuilder.facets()).to.deep.equal({ climate_anomalies: [], rainfall: [] });
  });
  it('should build facets for choice parameters', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const facets = facetsBuilder.build().facets().climate_anomalies;
    expect(facets).to.deep.equal([
      {
        value: 'cool,dry',
        count: 1,
      },
      {
        value: 'cool,wet',
        count: 1,
      },
      {
        value: 'midrange',
        count: 1,
      },
      {
        value: 'warm,dry',
        count: 2,
      },
      {
        value: 'warm,wet',
        count: 0,
      },
    ]);
  });
  it('should build facets with fixed number of histogram buckets', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const facets = facetsBuilder.build().facets().rainfall;
    facets.forEach((facet) => {
      // round floats (eg. 0.8999999999999999 -> 0.9)
      facet.range = facet.range.map((v) => Number(v.toFixed(12)));
    });
    expect(facets).to.deep.equal([
      {
        range: [0, 0.3],
        count: 2,
      },
      {
        range: [0.3, 0.6],
        count: 0,
      },
      {
        range: [0.6, 0.9],
        count: 1,
      },
      {
        range: [0.9, 1.2],
        count: 0,
      },
      {
        range: [1.2, 1.5],
        count: 2,
      },
    ]);
  });
  it('should build histogram facets for number parameters with non zero min value', () => {
    const parametersData = [
      {
        default: 0,
        description: 'This is the number, in days, that the planting window was shifted',
        maximum: 30,
        minimum: -30,
        name: 'planting_window_shift',
        type: 'NumberParameter',
      },
    ];
    const runsData = [
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'planting_window_shift',
            value: -30,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'planting_window_shift',
            value: 0,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'planting_window_shift',
            value: -25,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'planting_window_shift',
            value: 25,
          },
        ],
      },
    ];
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const facets = facetsBuilder.build().facets().planting_window_shift;
    expect(facets).to.deep.equal([
      {
        range: [-30, -18],
        count: 2,
      },
      {
        range: [-18, -6],
        count: 0,
      },
      {
        range: [-6, 6],
        count: 1,
      },
      {
        range: [6, 18],
        count: 0,
      },
      {
        range: [18, 30],
        count: 1,
      },
    ]);
  });
  it('should build facets for time parameters with numeric values', () => {
    const parametersData = [
      {
        default: 0,
        maximum: 0,
        minimum: 30,
        name: 'param',
        type: 'TimeParameter',
      },
    ];
    const runsData = [
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 1,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 30,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 30,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 5,
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 1,
          },
        ],
      },
    ];
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const facets = facetsBuilder.build().facets().param;
    expect(facets).to.deep.equal([
      {
        value: '1',
        count: 2,
      },
      {
        value: '5',
        count: 1,
      },
      {
        value: '30',
        count: 2,
      },
    ]);
  });
  it('should build facets for time parameters with dates', () => {
    const parametersData = [
      {
        default: 0,
        maximum: '05-01',
        minimum: '01-01',
        name: 'param',
        type: 'TimeParameter',
      },
    ];
    const runsData = [
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: '05-01',
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: '05-01',
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: '01-01',
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: '05-02',
          },
        ],
      },
    ];
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const facets = facetsBuilder.build().facets().param;
    expect(facets).to.deep.equal([
      {
        value: '01-01',
        count: 1,
      },
      {
        value: '05-01',
        count: 2,
      },
      {
        value: '05-02',
        count: 1,
      },
    ]);
  });
  it('should build facets for time parameters with NaN strings as fall back', () => {
    const parametersData = [
      {
        default: 0,
        name: 'param',
        type: 'TimeParameter',
      },
    ];
    const runsData = [
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 'a',
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 'a',
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 'c',
          },
        ],
      },
      {
        id: 'fakerunID',
        parameters: [
          {
            name: 'param',
            value: 'b',
          },
        ],
      },
    ];
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const facets = facetsBuilder.build().facets().param;
    expect(facets).to.deep.equal([
      {
        value: 'a',
        count: 2,
      },
      {
        value: 'b',
        count: 1,
      },
      {
        value: 'c',
        count: 1,
      },
    ]);
  });
  // ------- Test filters -------
  it('should apply keyword filter', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const filters = [
      {
        paramName: 'climate_anomalies',
        keyword: 'warm,dry',
      },
    ];
    const facets = facetsBuilder.applyFilters(filters).build().facets();
    facets.rainfall.forEach((facet) => {
      // round floats (eg. 0.8999999999999999 -> 0.9)
      facet.range = facet.range.map((v) => Number(v.toFixed(12)));
    });
    expect(facets).to.deep.equal({
      climate_anomalies: [
        {
          value: 'cool,dry',
          count: 0,
        },
        {
          value: 'cool,wet',
          count: 0,
        },
        {
          value: 'midrange',
          count: 0,
        },
        {
          value: 'warm,dry',
          count: 2,
        },
        {
          value: 'warm,wet',
          count: 0,
        },
      ],
      rainfall: [
        {
          range: [0, 0.3],
          count: 1,
        },
        {
          range: [0.3, 0.6],
          count: 0,
        },
        {
          range: [0.6, 0.9],
          count: 1,
        },
        {
          range: [0.9, 1.2],
          count: 0,
        },
        {
          range: [1.2, 1.5],
          count: 0,
        },
      ],
    });
  });
  it('should apply range filter', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const filters = [
      {
        paramName: 'climate_anomalies',
        keyword: 'warm,dry',
      },
      {
        paramName: 'rainfall',
        range: ['0.3', '0.9'],
      },
    ];
    const facets = facetsBuilder.applyFilters(filters).build().facets();
    facets.rainfall.forEach((facet) => {
      // round floats (eg. 0.8999999999999999 -> 0.9)
      facet.range = facet.range.map((v) => Number(v.toFixed(12)));
    });
    expect(facets).to.deep.equal({
      climate_anomalies: [
        {
          value: 'cool,dry',
          count: 0,
        },
        {
          value: 'cool,wet',
          count: 0,
        },
        {
          value: 'midrange',
          count: 0,
        },
        {
          value: 'warm,dry',
          count: 1,
        },
        {
          value: 'warm,wet',
          count: 0,
        },
      ],
      rainfall: [
        {
          range: [0, 0.3],
          count: 0,
        },
        {
          range: [0.3, 0.6],
          count: 0,
        },
        {
          range: [0.6, 0.9],
          count: 1,
        },
        {
          range: [0.9, 1.2],
          count: 0,
        },
        {
          range: [1.2, 1.5],
          count: 0,
        },
      ],
    });
  });
  // ------- Test Other Behaviour -------
  it('should return filtered runs', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const filters = [
      {
        paramName: 'climate_anomalies',
        keyword: 'warm,dry',
      },
    ];
    const runIds = facetsBuilder
      .applyFilters(filters)
      .runs()
      .map((run) => run.id);
    expect(runIds).to.deep.equal([
      '062d9473d76a01db9f255e0807ce91b1f3ca6caba81b92a53ae530da9b6e2d78',
      '096e87ef787f7e576586b2b4a5b457465b55ec092c6ac68a58d8061a3735bc77',
    ]);
  });
  it('should reset filters', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData);
    const builder = facetsBuilder.applyFilters([
      {
        paramName: 'climate_anomalies',
        keyword: 'warm,dry',
      },
    ]);
    expect(builder.runs().length).to.equal(2);
    builder.applyFilters([
      {
        paramName: 'rainfall',
        range: ['0', '0.3'],
      },
    ]);
    expect(builder.runs().length).to.equal(2);
    expect(builder.resetFilters().runs().length).to.equal(5);
  });
  it('should be able change facets type for the parameter type', () => {
    const facetsBuilder = new ParameterFacetsBuilder(runsData, parametersData, {
      paramterFacetMapping: {
        [PARAMETER_TYPES.NumberParameter]: FACET_TYPES.BAR,
        [PARAMETER_TYPES.ChoiceParameter]: FACET_TYPES.BAR,
      },
    });
    const facets = facetsBuilder.build().facets();
    expect(facets).to.deep.equal({
      climate_anomalies: [
        {
          value: 'cool,dry',
          count: 1,
        },
        {
          value: 'cool,wet',
          count: 1,
        },
        {
          value: 'midrange',
          count: 1,
        },
        {
          value: 'warm,dry',
          count: 2,
        },
      ],
      rainfall: [
        {
          value: '0.0',
          count: 2,
        },
        {
          value: '0.75',
          count: 1,
        },
        {
          value: '1.5',
          count: 2,
        },
      ],
    });
  });
});
