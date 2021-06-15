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
    ...field('_search', 'Keyword'),
    ...searchable('Keyword', false)
  }
};
export const CATEGORY = 'category';
export const TAGS = 'tags';
export const PARAMETERS = 'parameters';
export const VARIABLE_NAME = 'variableName';
export const VARIABLE_UNIT = 'variableUnit';
export const TEMPORAL_RESOLUTION = 'temporalResolution';
export const MAINTAINER_NAME = 'maintainerName';
export const MAINTAINER_ORG = 'maintainerOrg';



export const DISPLAY_NAMES: {[ key: string ]: string } = {
  category: 'Category',
  maintainerName: 'Maintainer',
  maintainerOrg: 'Organization',
  tags: 'Tags',
  temporalResolution: 'Temporal Resolution',
  type: 'Types',
  variableName: 'Output Name',
  variableUnit: 'Output Units'
};


export const FACET_FIELDS: string [] = [
  CATEGORY,
  TAGS,
  PARAMETERS,
  VARIABLE_NAME,
  VARIABLE_UNIT,
  TEMPORAL_RESOLUTION,
  MAINTAINER_NAME,
  MAINTAINER_ORG
];

export const datacubeKeys = (datacubeRow: Record<string, any>): string[] => {
  let keys = Object.keys(datacubeRow);
  keys = keys.filter((k) => DISPLAY_NAMES[k] !== undefined);
  keys.sort();
  return keys;
};


export default {
  CODE_TABLE,
  FACET_FIELDS,
  DISPLAY_NAMES,
  datacubeKeys
};
