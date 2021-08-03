import { selectAdminLevel } from '@/utils/map-util-new';
import { expect } from 'chai';
import { DatacubeStatus, DatacubeType } from '@/types/Enums';

describe('map-util', () => {
  const metadata = {
    id: '',
    data_id: '',
    name: '',
    family_name: '',
    description: '',
    created_at: 0,
    type: DatacubeType.Indicator,
    category: [],
    maintainer: {
      name: '',
      organization: '',
      email: '',
      website: ''
    },
    tags: [],
    ontology_matches: [],
    data_paths: [],
    period: {
      gte: 0,
      lte: 0
    },
    outputs: [],
    validatedOutputs: [],
    default_feature: '',
    status: DatacubeStatus.Ready,
    _search: '',
    default_view: null
  };
  it('Every region category contains more than 1 value', () => {
    const testMetadata = {
      ...metadata,
      geography: {
        country: ['country_1', 'country_2'],
        admin1: ['admin1_1', 'admin1_2'],
        admin2: ['admin2_2', 'admin2_2'],
        admin3: ['admin3_1', 'admin3_2']
      }
    };
    expect(selectAdminLevel(testMetadata)).to.equal(0);
  });
  it('Every region category contains more than 1 value', () => {
    const testMetadata = {
      ...metadata,
      geography: {
        country: ['country_1'],
        admin1: ['admin1_1', 'admin1_2'],
        admin2: ['admin2_2', 'admin2_2'],
        admin3: ['admin3_1', 'admin3_2']
      }
    };
    expect(selectAdminLevel(testMetadata)).to.equal(1);
  });
  it('Every region category contains more than 1 value', () => {
    const testMetadata = {
      ...metadata,
      geography: {
        country: ['country_1'],
        admin1: ['admin1_1'],
        admin2: ['admin2_2'],
        admin3: ['admin3_1']
      }
    };
    expect(selectAdminLevel(testMetadata)).to.equal(0);
  });
  it('Every region category contains more than 1 value', () => {
    const testMetadata = {
      ...metadata,
      geography: {
        country: [],
        admin1: ['admin1_1', 'admin1_2', 'admin1_3'],
        admin2: [],
        admin3: ['admin3_1']
      }
    };
    expect(selectAdminLevel(testMetadata)).to.equal(1);
  });
});
