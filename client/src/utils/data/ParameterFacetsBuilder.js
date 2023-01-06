import _ from 'lodash';

/**
 * Model run object
 * @typedef {Object} Run
 * @property {string} id
 * @property {string} model
 * @property {RunParameters[]} parameters
 **/

/**
 * Model run Parameter
 * @typedef {Object} RunParameters
 * @property {string} name
 * @property {string} value
 **/

/**
 * Parameter metadata
 * @typedef {Object} Parameter
 * @property {number} default
 * @property {string} description
 * @property {string[]} [choices]
 * @property {number} [maximum]
 * @property {number} [minimum]
 * @property {string} name
 * @property {string} type
 **/

/**
 * Facet
 * @typedef {Object} Facet
 * @property {number[]} [range] - [min, max]
 * @property {number|string} [value]
 * @property {number} count
 **/

export const PARAMETER_TYPES = Object.freeze({
  // Legacy parameter types (old maas)
  ChoiceParameter: 'ChoiceParameter',
  NumberParameter: 'NumberParameter',
  TimeParameter: 'TimeParameter',
  // New parameter types
  Str: 'str',
  // Int: 'int',
  Float: 'float',
  Date: 'date',
  String: 'string',

  // Datetime: 'datetime',
  // Time: 'time',
  // Longlat: 'longlat',
  // Binary: 'binary',
  // Boolean: 'boolean'
});
export const FACET_TYPES = Object.freeze({
  KEYWORD: 'KEYWORD',
  BAR: 'BAR',
  HISTOGRAM: 'HISTOGRAM',
});
const DEFAULT_PARAMETER_FACET_MAPPING = Object.freeze({
  [PARAMETER_TYPES.ChoiceParameter]: FACET_TYPES.KEYWORD,
  [PARAMETER_TYPES.NumberParameter]: FACET_TYPES.HISTOGRAM,
  [PARAMETER_TYPES.TimeParameter]: FACET_TYPES.BAR,

  [PARAMETER_TYPES.Str]: FACET_TYPES.KEYWORD,
  [PARAMETER_TYPES.Float]: FACET_TYPES.BAR,
  [PARAMETER_TYPES.Date]: FACET_TYPES.BAR,
  [PARAMETER_TYPES.String]: FACET_TYPES.BAR,

  // [PARAMETER_TYPES.Int]: FACET_TYPES.BAR, // Dates (year?) are typed as int for some model and it doesn't seem to match with parameter metadata. needs more investigation.
  // [PARAMETER_TYPES.Datetime]: FACET_TYPES.BAR,
  // [PARAMETER_TYPES.Time]: FACET_TYPES.BAR,
  // [PARAMETER_TYPES.Longlat]: FACET_TYPES.KEYWORD,
  // [PARAMETER_TYPES.Binary]: FACET_TYPES.KEYWORD,
  // [PARAMETER_TYPES.Boolean]: FACET_TYPES.KEYWORD
});

// Determines the number of buckets for number parameter facets
const NUM_NUMBER_BUCKETS = 5;

// Check if given val is numeric
const isNumeric = (val) => !isNaN(val);

// Get a value that is safe for comparison for the given val
const getSafeValue = (val) => {
  // check if number
  if (isNumeric(val)) {
    return +val;
  }
  // check if date
  const timestamp = Date.parse(val);
  if (isNumeric(timestamp)) {
    return timestamp;
  }
  // fall back to string value
  return '' + val;
};
const nToLabel = (n) => Number(n.toFixed(12)).toString();

// ParameterFacetsBuilder builds input parameter facets
export class ParameterFacetsBuilder {
  /**
   *
   * @param {Run[]} runs - Model runs
   * @param {Parameter[]} parameters - Model parameter metadata
   * @param {Object} options - Options
   * @param {Object} options.paramterFacetMapping - Parameter type to facet type mapping
   */
  constructor(runs, parameters, options) {
    this.reset(runs, parameters, options);
  }

  /**
   * Resets the builder with new data and options
   * @param {Run[]} runs - Model runs
   * @param {Parameter[]} parameters - Model parameter metadata
   * @param {Object} options - Options
   * @param {Object} options.paramterFacetMapping - Parameter type to facet type mapping
   */
  reset(runs = [], parameters = [], options = {}) {
    this._originalRuns = [];
    this._runs = [];
    this._facets = {};
    this._parameterFacetMapping = {
      ...DEFAULT_PARAMETER_FACET_MAPPING,
      ...options.paramterFacetMapping,
    };
    this.parameterLookup = {}; // Parameter metadata look up
    parameters.forEach((parameter) => {
      this.parameterLookup[parameter.name] = {
        ...parameter,
        facetType: this._parameterFacetMapping[parameter.type],
      };
      this._facets[parameter.name] = [];
    });
    this._runs = this._filterOutInvalidRuns(runs).map((run) => {
      const parameters = {};
      // Create parameters map for easy access by parameter name
      run.parameters.forEach((param) => {
        parameters[param.name] = param;
      });
      return { id: run.id, parameters };
    });
    this._originalRuns = this._runs;
    this._fixParameterMetadataStats();
    return this;
  }

  _filterOutInvalidRuns(runs) {
    // Hack: Some models have runs with no parameters and output (eg. population_model). Remove those.
    // TODO: Handle invalid data and normalize data in the backend
    return runs.filter((run) => {
      run.parameters = run.parameters.filter((param) => param.name && param.value !== undefined);
      return run.parameters.length;
    });
  }

  _fixParameterMetadataStats() {
    // Note: Parameters metadata and stats are appeared to be inaccurate for some data in a way some parameter values are omitted when min, max or choices are calculated.
    // Fix those issues here as a work around.
    // Fix parameter metadata stats
    const parameters = Object.values(this.parameterLookup);
    parameters.forEach((param) => {
      if (param.type === PARAMETER_TYPES.ChoiceParameter) {
        // Find and add missing choice value to the choices set
        const choices = this._runs.reduce((set, run) => {
          const runParam = run.parameters[param.name];
          runParam && set.add(runParam.value);
          return set;
        }, new Set(param.choices));
        param.choices = Array.from(choices);
      }
      if (param.type === PARAMETER_TYPES.NumberParameter) {
        // Adjust min and max by finding and including number that is out of given bounds
        const stats = this._runs.reduce(
          (acc, run) => {
            const runParam = run.parameters[param.name];
            const value = runParam ? +runParam.value : 0;
            return { minimum: Math.min(acc.minimum, value), maximum: Math.max(acc.maximum, value) };
          },
          { minimum: param.minimum, maximum: param.maximum }
        );
        Object.assign(param, stats);
      }
    });
  }

  /**
   * Build facets
   * @returns {ParameterFacetsBuilder}
   */
  build() {
    const parameters = Object.values(this.parameterLookup);
    const facets = {};
    parameters.forEach((param) => {
      switch (param.facetType) {
        case FACET_TYPES.KEYWORD:
          facets[param.name] = this._buildKeywordFacets(param);
          break;
        case FACET_TYPES.HISTOGRAM:
          facets[param.name] = this._buildHistogramFacets(param);
          break;
        case FACET_TYPES.BAR:
          facets[param.name] = this._buildBarFacets(param);
          break;
      }
    });
    // Ensure there are no empty facets or facets with single bucket
    for (const [key] of Object.entries(facets)) {
      if (_.isEmpty(facets) || facets[key].length <= 1) {
        delete facets[key];
      }
    }

    this._facets = facets;
    return this;
  }

  // Build keyword facets for string values
  _buildKeywordFacets(parameter) {
    const buckets = {};
    (parameter.choices || []).forEach(
      (choice) =>
        (buckets[choice] = {
          value: choice,
          count: 0,
        })
    );
    // Count and add to buckets
    this._runs.forEach((run) => {
      const runParam = run.parameters[parameter.name];
      if (!runParam) return;
      // Parameter types other than str doesn't have choices array, so build bucket on the fly
      if (!buckets[runParam.value]) {
        buckets[runParam.value] = {
          value: runParam.value,
          count: 0,
        };
      }
      runParam && (buckets[runParam.value].count += 1);
    });
    return _.orderBy(Object.values(buckets), ['value'], ['asc']);
  }

  // Build histogram facets with fixed number of bars for numeric variables
  _buildHistogramFacets(parameter, numBuckets = NUM_NUMBER_BUCKETS) {
    const min = Number(parameter.minimum);
    const max = Number(parameter.maximum);
    const step = (max - min) / numBuckets;
    const buckets = {};
    for (let i = 0; i < numBuckets; i++) {
      const range = [i * step + min, (i + 1) * step + min];
      buckets[i] = {
        range,
        count: 0,
      };
    }
    // Count and add to buckets
    this._runs.forEach((run) => {
      const runParam = run.parameters[parameter.name];
      if (!runParam) return;
      const value = Number(runParam.value);
      // Max value is included in the last bucket(bin)
      const bucketIndex = value === max ? NUM_NUMBER_BUCKETS - 1 : Math.floor((value - min) / step);
      buckets[bucketIndex].count += 1;
    });

    return Object.values(buckets);
  }

  // Build bar facets with parameters where its value can be any type (string date, number, string etc)
  _buildBarFacets(parameter) {
    const buckets = {};
    // Initialize buckets
    this._originalRuns.forEach((run) => {
      const runParam = run.parameters[parameter.name];
      if (!runParam) return;
      const value = String(runParam.value);
      buckets[value] = { value, count: 0 };
    });
    // Count and add to buckets
    this._runs.forEach((run) => {
      const runParam = run.parameters[parameter.name];
      if (!runParam) return;
      const value = String(runParam.value);
      buckets[value].count += 1;
    });
    return _.sortBy(Object.values(buckets), function (bucket) {
      return getSafeValue(bucket.value);
    });
  }

  /**
   * Apply selection filters to the runs based on the parameter values
   * @param {Object[]} filters - Filters
   * @param {string} filters[].paramName - Parameter name
   * @param {string} filters[].keyword - Keyword filter value
   * @param {Array} filters[].range - Range filter bound, [min, max)
   * @returns {ParameterFacetsBuilder}
   */
  applyFilters(filters = []) {
    const filteredRuns = this._originalRuns.filter((run) => {
      const matchAll = filters.every((filter) => {
        const param = run.parameters[filter.paramName];
        if (!param) return false;
        if (filter.keyword !== undefined) {
          return param.value === filter.keyword;
        }
        if (filter.range !== undefined) {
          // For BAR or HISTOGRAM FACETS
          const val = getSafeValue(param.value);
          const bound = filter.range.map(getSafeValue);
          const paramData = this.parameterLookup[filter.paramName];
          const inclusive =
            paramData.facetType === FACET_TYPES.BAR ||
            Number(paramData.maximum) === filter.range[1];
          return inclusive ? val >= bound[0] && val <= bound[1] : val >= bound[0] && val < bound[1];
        }
        return false;
      });
      return matchAll;
    });
    this._runs = filteredRuns;
    return this;
  }

  /**
   * Reset filters
   * @returns {ParameterFacetsBuilder}
   */
  resetFilters() {
    this._runs = this._originalRuns;
    return this;
  }

  /**
   * Get facets
   * @returns {Facet[]}
   */
  facets() {
    return this._facets;
  }

  /**
   * Get runs
   * @returns {Run[]}
   */
  runs() {
    return this._runs;
  }
}

// Parameter facets builder for stories facets (v1) component data
export class StoriesFacetsBuilder extends ParameterFacetsBuilder {
  /**
   * Return facets in the form of facets groups for stories facets component
   */
  toFacetsGroups() {
    const groups = Object.entries(this.facets()).map(([name, facets]) => {
      const groupLabel = name.split('_').join(' ');
      const type = this.parameterLookup[name].facetType;
      let facetsData = [];
      const baseFacet = { icon: { color: '#60B5E2' } };
      if (type === FACET_TYPES.KEYWORD) {
        facetsData = facets.map(({ value, count }) => {
          return { ...baseFacet, value, count };
        });
      }
      if (type === FACET_TYPES.HISTOGRAM) {
        facetsData = [
          {
            histogram: {
              slices: facets.map(({ range, count }) => {
                const [label, toLabel] = range.map(nToLabel);
                return { ...baseFacet, label, toLabel, count, metadata: { range } };
              }),
            },
          },
        ];
      }
      if (type === FACET_TYPES.BAR) {
        facetsData = [
          {
            histogram: {
              slices: facets.map(({ value, count }) => {
                const safeVal = getSafeValue(value);
                return {
                  ...baseFacet,
                  label: value,
                  count,
                  metadata: { range: [safeVal, safeVal] },
                };
              }),
            },
          },
        ];
      }
      return {
        label: groupLabel,
        key: name,
        facets: facetsData,
      };
    });
    return groups;
  }

  /**
   * Return facets in the form of facets selection groups for stories facets component
   */
  toFacetsSelection() {
    const selection = Object.entries(this.facets()).map(([name, facets]) => {
      const type = this.parameterLookup[name].facetType;
      if (type === FACET_TYPES.KEYWORD) {
        return {
          key: name,
          facets: facets.map((facet) => ({
            value: facet.value,
            selected: { count: String(facet.count), countLabel: String(facet.count) },
          })),
        };
      }
      if (type === FACET_TYPES.HISTOGRAM) {
        return {
          key: name,
          facets: [
            {
              value: name,
              selection: {
                slices: facets.reduce((acc, facet) => {
                  acc[nToLabel(facet.range[0])] = facet.count;
                  return acc;
                }, {}),
              },
            },
          ],
        };
      }
      if (type === FACET_TYPES.BAR) {
        return {
          key: name,
          facets: [
            {
              value: name,
              selection: {
                slices: facets.reduce((acc, facet) => {
                  acc[facet.value] = facet.count;
                  return acc;
                }, {}),
              },
            },
          ],
        };
      }
      return {}; // Shouldn't reach
    });
    return selection;
  }
}
