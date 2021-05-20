import { FieldMap, field, searchable } from './lex-util';

/**
 * Configures datacube metadata field attributes, determines how they are displayed and their search semantics
 *
 * Note lexType and baseType defines the value translation needed to go to/from LEX. LEX by default
 * uses string-types while fields can have heterogeneous types.
*/
export const DC_CODE_TABLE: FieldMap = {
  DC_CONCEPT_NAME: {
    ...field('concepts.name', 'Concept'),
    ...searchable('Concept', false)
  },
  DC_PERIOD: {
    ...field('period', 'Period'),
    ...searchable('Period', true)
  },
  DC_SEARCH: {
    // _search is hidden special datacube field that combines text/keyword field values. It's used for text searching.
    ...field('_search', 'Keyword'),
    ...searchable('Keyword', false)
  }
};

export const DC_DISPLAY_NAMES: {[ key: string ]: string } = {
  category: 'Category',
  model: 'Output Variable',
  output_name: 'Output Name',
  output_units: 'Output Units',
  parameters: 'Input Knobs',
  source: 'Source'
};

export const datacubeKeys = (datacubeRow: Record<string, any>): string[] => {
  let keys = Object.keys(datacubeRow);
  keys = keys.filter((k) => DC_DISPLAY_NAMES[k] !== undefined);
  keys.sort();
  return keys;
};


export default {
  DC_CODE_TABLE,
  DC_DISPLAY_NAMES,
  datacubeKeys
};
