import { DatacubeFeature, Model, Indicator, Datacube } from '@/types/Datacube';
import { DatacubeType } from '@/types/Enums';
import { FieldMap, field, searchable } from './lex-util';

/**
 * Configures datacube metadata field attributes, determines how they are displayed and their search semantics
 *
 * Note lexType and baseType defines the value translation needed to go to/from LEX. LEX by default
 * uses string-types while fields can have heterogeneous types.
*/
export const CODE_TABLE: FieldMap = {
  CONCEPT_NAME: {
    ...field('concepts.name', 'Concept'),
    ...searchable('Concept', false)
  },
  PERIOD: {
    ...field('period', 'Period'),
    ...searchable('Period', true)
  },
  SEARCH: {
    // _search is hidden special datacube field that combines text/keyword field values. It's used for text searching.
    ...field('keyword', 'Keyword'),
    ...searchable('Keyword', false)
  }
};
export const CATEGORY = 'category';
export const TAGS = 'tags';
export const COUNTRY = 'country';
export const ADMIN1 = 'admin1';
export const ADMIN2 = 'admin2';
export const ADMIN3 = 'admin3';
export const PARAMETERS = 'parameters';
export const VARIABLE_NAME = 'variableName';
export const VARIABLE_UNIT = 'variableUnit';
export const TEMPORAL_RESOLUTION = 'temporalResolution';
export const MAINTAINER_NAME = 'maintainerName';
export const MAINTAINER_ORG = 'maintainerOrg';
export const TYPE = 'type';



export const DISPLAY_NAMES: {[ key: string ]: string } = {
  admin1: 'Administrative Area 1',
  admin2: 'Administrative Area 2',
  admin3: 'Administrative Area 3',
  category: 'Category',
  country: 'Country',
  maintainerName: 'Maintainer',
  maintainerOrg: 'Organization',
  tags: 'Tags',
  temporalResolution: 'Temporal Resolution',
  type: 'Datacube Types',
  variableName: 'Output Name',
  variableUnit: 'Output Units'
};


export const FACET_FIELDS: string [] = [
  TYPE,
  CATEGORY,
  TAGS,
  COUNTRY,
  ADMIN1,
  ADMIN2,
  ADMIN3,
  PARAMETERS,
  VARIABLE_NAME,
  VARIABLE_UNIT,
  TEMPORAL_RESOLUTION,
  MAINTAINER_NAME,
  MAINTAINER_ORG
];

export const getValidatedOutputs = (outputs: DatacubeFeature[]) => {
  // FIXME: only numeric outputs are currently supported
  return outputs.filter(o => o.type === 'int' || o.type === 'float');
};

export function isModel(datacube: Datacube): datacube is Model {
  return datacube.type === DatacubeType.Model;
}

export function isIndicator(datacube: Datacube): datacube is Indicator {
  return datacube.type === DatacubeType.Indicator;
}

export default {
  CODE_TABLE,
  FACET_FIELDS,
  DISPLAY_NAMES,
  getValidatedOutputs
};
