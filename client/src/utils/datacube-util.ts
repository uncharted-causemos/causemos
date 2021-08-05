import { DatacubeFeature, Model, Indicator, Datacube } from '@/types/Datacube';
import { DatacubeType } from '@/types/Enums';
import { Field, FieldMap, field, searchable } from './lex-util';

export interface SuggestionField extends Field {
  searchMessage: string;
  filterFunc?: Function;
}

export interface SuggestionFieldMap { [key: string]: SuggestionField }

// FIXME: Shouldn't need to do this filtering. ES should only return the relevant entries.
const filterArray = (result: string[], hint: string) => {
  const hints = hint
    .toLowerCase()
    .split(' ')
    .filter(el => el !== '');
  return result.filter(res => hints.every(h => res.toLowerCase().includes(h)));
};

/**
 * Configures datacube metadata field attributes, determines how they are displayed and their search semantics
 *
 * Note lexType and baseType defines the value translation needed to go to/from LEX. LEX by default
 * uses string-types while fields can have heterogeneous types.
*/
export const CODE_TABLE: FieldMap = {
  ONTOLOGY_MATCH: {
    ...field('conceptName', 'Concept'),
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

export const SUGGESTION_CODE_TABLE: SuggestionFieldMap = {
  COUNTRY: {
    ...field('country', 'Country'),
    ...searchable('Country', false),
    searchMessage: 'Select a country',
    filterFunc: filterArray
  },
  ADMIN1: {
    ...field('admin1', 'Administrative Area 1'),
    ...searchable('Administrative Area 1', false),
    searchMessage: 'Select an administrative area',
    filterFunc: filterArray
  },
  ADMIN2: {
    ...field('admin2', 'Administrative Area 2'),
    ...searchable('Administrative Area 2', false),
    searchMessage: 'Select an administrative area',
    filterFunc: filterArray
  },
  ADMIN3: {
    ...field('admin3', 'Administrative Area 3'),
    ...searchable('Administrative Area 3', false),
    searchMessage: 'Select an administrative area',
    filterFunc: filterArray
  },
  OUTPUT_NAME: {
    ...field('variableName', 'Output Name'),
    ...searchable('Output Name', false),
    searchMessage: 'Select an output name'
  },
  DATASET_NAME: {
    ...field('name', 'Dataset Name'),
    ...searchable('Dataset Name', false),
    searchMessage: 'Select a dataset name'
  },
  FAMILY_NAME: {
    ...field('familyName', 'Family Name'),
    ...searchable('Family Name', false),
    searchMessage: 'Select a family name'
  }
};

export const CATEGORY = 'category';
export const TAGS = 'tags';
export const COUNTRY = 'country';
export const ADMIN1 = 'admin1';
export const ADMIN2 = 'admin2';
export const ADMIN3 = 'admin3';
export const PARAMETERS = 'parameters';
export const DATASET_NAME = 'name';
export const VARIABLE_UNIT = 'variableUnit';
export const FAMILY_NAME = 'familyName';
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
  name: 'Dataset Name',
  variableUnit: 'Output Units',
  familyName: 'Family Name'
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
  DATASET_NAME,
  VARIABLE_UNIT,
  FAMILY_NAME,
  TEMPORAL_RESOLUTION,
  MAINTAINER_NAME,
  MAINTAINER_ORG
];

export const NODE_FACET_FIELDS: string [] = [
  TAGS,
  COUNTRY,
  ADMIN1,
  ADMIN2,
  ADMIN3,
  PARAMETERS,
  DATASET_NAME,
  VARIABLE_UNIT,
  FAMILY_NAME,
  TEMPORAL_RESOLUTION,
  MAINTAINER_NAME,
  MAINTAINER_ORG
];

export const getValidatedOutputs = (outputs: DatacubeFeature[]) => {
  // FIXME: only numeric outputs are currently supported
  const validOutputs = outputs.filter(o => o.type === 'int' || o.type === 'float' || o.type === 'boolean');
  // some datacubes do not have this flag being set initially (i.e., out of date metadata)
  // so ensure it is initialized first
  validOutputs.forEach(o => {
    if (o.is_visible === undefined) {
      o.is_visible = true;
    }
  });
  return validOutputs.filter(o => o.is_visible);
};

export function isModel(datacube: Datacube): datacube is Model {
  return datacube.type === DatacubeType.Model;
}

export function isIndicator(datacube: Datacube): datacube is Indicator {
  return datacube.type === DatacubeType.Indicator;
}

export default {
  CODE_TABLE,
  SUGGESTION_CODE_TABLE,
  DISPLAY_NAMES,
  FACET_FIELDS,
  NODE_FACET_FIELDS,
  getValidatedOutputs
};
