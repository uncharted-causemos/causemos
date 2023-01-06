export interface Field {
  field: string;
  display: string;
  icon: string;
  iconText: string;

  // FIXME: lexType/baseType are kind of weird
  baseType?: string;
  lexType?: string;

  searchable?: boolean;
  ranged?: boolean;
  searchDisplay?: string;
}

export interface FieldMap {
  [key: string]: Field;
}

/**
 * Marking a field as searchable makes known to LEX.
 * Note a ranged search is more restrictive as the application allows one
 * ranged term per field. This is due to synchronizing against the facets,
 * which only allows a single range.
 *
 * @param {string} searchDisplay - text display
 * @param {boolean} ranged - if the search is ranged or not
 */
export const searchable = (searchDisplay: string, ranged: boolean) => {
  return {
    searchable: true,
    ranged,
    searchDisplay,
  };
};

/**
 * This tags the code constant with the API field.
 *
 * Note the field is not the actual DB field but is the abstraction layer field.
 *
 * @param {string} field - field name
 * @param {string} display - human readable display
 */

export const field = (field: string, display: string, icon = '', iconText = '') => {
  return { field, display, icon, iconText };
};

export default {
  searchable,
  field,
};
