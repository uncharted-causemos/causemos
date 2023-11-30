import {
  DatacubeFeature,
  Model,
  Indicator,
  Datacube,
  ModelParameter,
  DimensionInfo,
  BreakdownState,
  BreakdownStateNone,
  BreakdownStateOutputs,
  BreakdownStateRegions,
  BreakdownStateYears,
  BreakdownStateQualifiers,
} from '@/types/Datacube';
import {
  AggregationOption,
  DatacubeGenericAttributeVariableType,
  DatacubeGeoAttributeVariableType,
  DatacubeStatus,
  DatacubeType,
  DataTransform,
  ModelParameterDataType,
} from '@/types/Enums';
import { Field, FieldMap, field, searchable } from './lex-util';
import { getDatacubeById, updateDatacube } from '@/services/datacube-service';
import { ModelRun } from '@/types/ModelRun';
import { RegionAgg, RegionalAggregations } from '@/types/Outputdata';
import { DATA_LAYER_TRANSPARENCY } from './map-util-new';
import { BarData } from '@/types/BarChart';
import { adminLevelToString } from './admin-level-util';
import { normalize } from './value-util';
import _ from 'lodash';
import * as d3 from 'd3';

export const DEFAULT_DATE_RANGE_DELIMETER = '__';

export interface SuggestionField extends Field {
  searchMessage: string;
  filterFunc?: Function;
}

export interface SuggestionFieldMap {
  [key: string]: SuggestionField;
}

// FIXME: Shouldn't need to do this filtering. ES should only return the relevant entries.
const filterArray = (result: string[], hint: string) => {
  const hints = hint
    .toLowerCase()
    .split(' ')
    .filter((el) => el !== '');
  return result.filter((res) => hints.every((h) => res.toLowerCase().includes(h)));
};

/**
 * Configures datacube metadata field attributes, determines how they are displayed and their search semantics
 *
 * Note lexType and baseType defines the value translation needed to go to/from LEX. LEX by default
 * uses string-types while fields can have heterogeneous types.
 */
export const CODE_TABLE: FieldMap = {
  ID: {
    ...field('id', 'Id'),
    ...searchable('Id', false),
  },
  PERIOD: {
    ...field('period', 'Period'),
    ...searchable('Included Years', true),
  },
  SEARCH: {
    // _search is hidden special datacube field that combines text/keyword field values. It's used for text searching.
    ...field('keyword', 'Keyword'),
    ...searchable('Keyword', false),
  },
};

export const SUGGESTION_CODE_TABLE: SuggestionFieldMap = {
  COUNTRY: {
    ...field('country', 'Country'),
    ...searchable('Country', false),
    searchMessage: 'Select a country',
    filterFunc: filterArray,
  },
  ADMIN1: {
    ...field('admin1', 'Administrative Area 1'),
    ...searchable('Administrative Area 1', false),
    searchMessage: 'Select an administrative area',
    filterFunc: filterArray,
  },
  ADMIN2: {
    ...field('admin2', 'Administrative Area 2'),
    ...searchable('Administrative Area 2', false),
    searchMessage: 'Select an administrative area',
    filterFunc: filterArray,
  },
  ADMIN3: {
    ...field('admin3', 'Administrative Area 3'),
    ...searchable('Administrative Area 3', false),
    searchMessage: 'Select an administrative area',
    filterFunc: filterArray,
  },
  GEO_GRANULARITY: {
    ...field('geoGranularity', 'Geo Granularity'),
    ...searchable('Geo Granularity', false),
    searchMessage: 'Select a level',
    filterFunc: filterArray,
  },
  OUTPUT_NAME: {
    ...field('variableName', 'Output Name'),
    ...searchable('Output Name', false),
    searchMessage: 'Select an output name',
  },
  DATASET_NAME: {
    ...field('name', 'Dataset Name'),
    ...searchable('Dataset Name', false),
    searchMessage: 'Select a dataset name',
  },
  FAMILY_NAME: {
    ...field('familyName', 'Family Name'),
    ...searchable('Family Name', false),
    searchMessage: 'Select a family name',
  },
};

export const CATEGORY = 'category';
export const DOMAIN = 'domain';
export const TAGS = 'tags';
export const COUNTRY = 'country';
export const ADMIN1 = 'admin1';
export const ADMIN2 = 'admin2';
export const ADMIN3 = 'admin3';
export const GEO_GRANULARITY = 'geoGranularity';
export const PERIOD = 'period';
export const PARAMETERS = 'parameters';
export const DATASET_NAME = 'name';
export const VARIABLE_UNIT = 'variableUnit';
export const FAMILY_NAME = 'familyName';
export const TEMPORAL_RESOLUTION = 'temporalResolution';
export const MAINTAINER_NAME = 'maintainerName';
export const MAINTAINER_ORG = 'maintainerOrg';
export const TYPE = 'type';
export const STATUS = 'status';

export const DISPLAY_NAMES: { [key: string]: string } = {
  admin1: 'Administrative Area 1',
  admin2: 'Administrative Area 2',
  admin3: 'Administrative Area 3',
  category: 'Category',
  domain: 'Domain',
  country: 'Country',
  geoGranularity: 'Geo Granularity',
  period: 'Included Years',
  maintainerName: 'Maintainer',
  maintainerOrg: 'Source',
  tags: 'Tags',
  temporalResolution: 'Temporal Resolution',
  type: 'Datacube Type',
  status: 'Datacube Status',
  name: 'Dataset Name',
  variableUnit: 'Variable Unit',
  familyName: 'Family Name',
};

export const FACET_FIELDS: string[] = [
  TYPE,
  DOMAIN,
  COUNTRY,
  GEO_GRANULARITY,
  PERIOD,
  TEMPORAL_RESOLUTION,
  MAINTAINER_ORG,
  VARIABLE_UNIT,
  STATUS,
];

export const NUMERICAL_FACETS: string[] = [PERIOD];

export const getDatacubeStatusInfo = (status: DatacubeStatus) => {
  switch (status) {
    case DatacubeStatus.Ready:
      return { label: 'Published', color: 'lightgreen' };
    case DatacubeStatus.Registered:
      return { label: 'Registered', color: 'lightgray' };
    case DatacubeStatus.Processing:
      return { label: 'Processing', color: 'lightgray' };
    case DatacubeStatus.ProcessingFailed:
      return { label: 'Processing Failed', color: 'red' };
    case DatacubeStatus.Deprecated:
      return { label: 'Deprecated', color: 'lightblue' };
    default:
      return { label: status, color: 'red' };
  }
};

export const getValidatedOutputs = (outputs: DatacubeFeature[]) => {
  // FIXME: only numeric outputs are currently supported
  const validOutputs = outputs.filter(
    (o) => o.type === 'int' || o.type === 'float' || o.type === 'boolean'
  );
  // some datacubes do not have this flag being set initially (i.e., out of date metadata)
  // so ensure it is initialized first
  validOutputs.forEach((o) => {
    if (o.is_visible === undefined) {
      o.is_visible = true;
    }
  });
  return validOutputs.filter((o) => o.is_visible);
};

export function isModel(datacube: Datacube | null): datacube is Model {
  return datacube !== null && datacube.type === DatacubeType.Model;
}

export function isIndicator(datacube: Datacube | null): datacube is Indicator {
  return datacube !== null && datacube.type === DatacubeType.Indicator;
}

export function getOutputs(metadata: Datacube) {
  if (metadata.validatedOutputs && metadata.validatedOutputs.length > 0) {
    return metadata.validatedOutputs;
  }
  return metadata.outputs;
}

export function getOutput(metadata: Datacube, name: string) {
  const outputs = getOutputs(metadata) || [];
  return outputs.find((output) => output.name === name);
}

export const getOutputDescription = (outputs: DatacubeFeature[], outputName: string) =>
  outputs.find((output) => output.name === outputName)?.description ?? '';

export function getSelectedOutput(metadata: Datacube, index: number) {
  const outputs = getOutputs(metadata);
  if (index >= 0 && index < outputs.length) {
    return outputs[index];
  }
  return outputs.find((o: DatacubeFeature) => o.name === metadata.default_feature) ?? outputs[0];
}

export function getUnitString(unit: string | null, transform: DataTransform) {
  if (!unit) {
    unit = '???';
  }
  switch (transform) {
    case DataTransform.PerCapita:
      return unit + ' per capita';
    case DataTransform.PerCapita1K:
      return unit + ' per 1000 people';
    case DataTransform.PerCapita1M:
      return unit + ' per 1M people';
    case DataTransform.Normalization:
      return unit + ' (normalized 0-1)';
    case DataTransform.None:
    default:
      return unit;
  }
}

// provide mime types for the image extensions listed below
// taken from https://github.com/jshttp/mime-db/blob/master/db.json
export function getImageMime(url: string) {
  const extension = url.toLowerCase().split('.').pop();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
    case 'jfif':
    case 'pjpeg':
    case 'pjp':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'apng':
      return 'image/apng';
    case 'avif':
      return 'image/avif';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'bmp';
    default:
      return undefined;
  }
}

// supported pre-rendered datacube images
export function isImage(url: string) {
  url = url.toLowerCase();
  return (
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.gif') ||
    url.endsWith('.apng') ||
    url.endsWith('.avif') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.jfif') ||
    url.endsWith('.pjpeg') ||
    url.endsWith('.pjp') ||
    url.endsWith('.svg') ||
    url.endsWith('.webp') ||
    url.endsWith('.bmp')
  );
}
export function isVideo(url: string) {
  url = url.toLowerCase();
  return (
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.mov') ||
    url.endsWith('.ogv') ||
    url.endsWith('.ogg') ||
    url.endsWith('.m4v') ||
    url.endsWith('.m4p') ||
    url.endsWith('.mpg') ||
    url.endsWith('.mpeg') ||
    url.endsWith('.3gp')
  );
}

export function isWebContent(url: string) {
  url = url.toLowerCase();
  return url.endsWith('.html') || url.endsWith('.htm');
}

export function getAggregationKey(spatial: AggregationOption, temporal: AggregationOption) {
  return `s_${spatial}_t_${temporal}`;
}

export const isGeoParameter = (type: string) => {
  return (
    type === DatacubeGenericAttributeVariableType.Geo ||
    (Object.values(DatacubeGeoAttributeVariableType) as Array<string>).includes(type)
  );
};
export const isCategoricalAxis = (name: string, dimensions: DimensionInfo[]) => {
  const dim = dimensions.find((d) => d.name === name) as ModelParameter;
  return (
    dim.type.startsWith('str') ||
    isGeoParameter(dim.type) ||
    dim.data_type === ModelParameterDataType.Ordinal ||
    dim.data_type === ModelParameterDataType.Nominal
  );
};

export const unpublishDatacube = async (datacubeId: string) => {
  const rawMetadata = await getDatacubeById(datacubeId);
  if (rawMetadata) {
    await unpublishDatacubeInstance(rawMetadata as Model);
  }
};

export const unpublishDatacubeInstance = async (instance: Model) => {
  // unpublish the datacube instance
  instance.status = DatacubeStatus.Registered;
  const delta = { id: instance.id, status: instance.status };
  await updateDatacube(instance.id, delta);
};

export const getFilteredScenariosFromIds = (scenarioIds: string[], allModelRunData: ModelRun[]) => {
  const filteredScenarios = scenarioIds.reduce((filteredRuns: ModelRun[], runId) => {
    allModelRunData.some((run) => {
      return runId === run.id && filteredRuns.push(run);
    });
    return filteredRuns;
  }, []);

  return filteredScenarios;
};

/**
 * If there is one or more model run with is_default_run === true, returns the first.
 * Otherwise, returns the first entry in the array if there is at least one entry.
 * Useful for selecting a default run even when there isn't exactly one run with is_default_run.
 * @param modelRuns a list of model run data to search
 * @returns a ModelRun if modelRuns.length > 0, otherwise returns `undefined`
 */
export const getFirstDefaultModelRun = (modelRuns: ModelRun[]) => {
  return modelRuns.find((run) => run.is_default_run === true) ?? modelRuns[0];
};

export const hasRegionLevelData = (regionLevelData: RegionAgg[] | undefined): boolean => {
  return (
    regionLevelData?.reduce((acc: boolean, region: RegionAgg) => {
      return acc || Object.keys(region.values).length > 0;
    }, false) ?? false
  );
};

export const AVAILABLE_DOMAINS = [
  'Logic',
  'Mathematics',
  'Astronomy and astrophysics',
  'Physics',
  'Chemistry',
  'Life Sciences',
  'Earth and Space Sciences',
  'Agricultural Sciences',
  'Medical Sciences',
  'Technological Sciences',
  'Anthropology',
  'Demographics',
  'Economic Sciences',
  'Geography',
  'History',
  'Juridical Sciences and Law',
  'Linguistics',
  'Pedagogy',
  'Political Science',
  'Psychology',
  'Science of Arts and Letters',
  'Sociology',
  'Ethics',
  'Philosophy',
];

export const convertRegionalDataToBarData = (
  regionalData: RegionalAggregations | null,
  selectedAdminLevel: number,
  // regionalData contains a nested list of regions. timeseriesKey is used to
  //  identify the correct entry in a region's `values` object.
  timeseriesKey: string,
  numberOfColorBins: number,
  colorScheme: string[],
  selectedDataLayerTransparency: DATA_LAYER_TRANSPARENCY
): BarData[] => {
  if (regionalData === null) return [];
  // Pull out the regions at the given admin level
  const adminLevelAsString = adminLevelToString(selectedAdminLevel) as keyof RegionalAggregations;
  const regionLevelData = regionalData[adminLevelAsString];
  const hasValues = hasRegionLevelData(regionLevelData);
  if (regionLevelData === undefined || !hasValues) {
    return [];
  }
  // Each region has a list of values, one for each timeseries (for example,
  //  each selected feature). Pull the value for the selected timeseries out of
  //  each region.
  const data = regionLevelData.map(({ id, values }) => {
    return {
      name: id,
      value: values[timeseriesKey] ?? 0,
    };
  });
  // Calculate normalized value and color based on supplied color scheme
  const extent = d3.extent(data.map(({ value }) => value));
  const scale = d3.scaleLinear().domain(extent[0] === undefined ? [0, 0] : extent);
  const dataExtent = scale.domain();
  // @REVIEW
  // Normalization is a transform performed by wm-go: https://gitlab.uncharted.software/WM/wm-go/-/merge_requests/64
  // To receive normalized data, send transform=normalization when fetching regional data
  return data.map((dataItem, index) => {
    const normalizedValue = normalize(dataItem.value, dataExtent[0], dataExtent[1]);
    // Linear binning
    const colorIndex = Math.trunc(normalizedValue * numberOfColorBins);
    // REVIEW: is the calculation of map colors consistent with how the datacube-card map is calculating colors?
    const clampedColorIndex = _.clamp(colorIndex, 0, colorScheme.length - 1);
    const regionColor = colorScheme[clampedColorIndex];
    return {
      // adjust the ranking so that the highest value will be ranked 1st
      // REVIEW: do we need this in the Overlay mode?
      name: (data.length - index).toString(),
      label: dataItem.name,
      value: dataItem.value,
      normalizedValue,
      color: regionColor,
      opacity: Number(selectedDataLayerTransparency),
    };
  });
};

export const isBreakdownStateNone = (
  breakdownState: BreakdownState
): breakdownState is BreakdownStateNone => {
  return (breakdownState as BreakdownStateNone).modelRunIds !== undefined;
};
export const isBreakdownStateOutputs = (
  breakdownState: BreakdownState
): breakdownState is BreakdownStateOutputs => {
  return (breakdownState as BreakdownStateOutputs).outputNames !== undefined;
};
export const isBreakdownStateRegions = (
  breakdownState: BreakdownState
): breakdownState is BreakdownStateRegions => {
  return (breakdownState as BreakdownStateRegions).regionIds !== undefined;
};
export const isBreakdownStateYears = (
  breakdownState: BreakdownState
): breakdownState is BreakdownStateYears => {
  return (breakdownState as BreakdownStateYears).years !== undefined;
};
export const isBreakdownStateQualifiers = (
  breakdownState: BreakdownState
): breakdownState is BreakdownStateQualifiers => {
  return (breakdownState as BreakdownStateQualifiers).qualifier !== undefined;
};

export const getRegionIdsFromBreakdownState = (breakdownState: BreakdownState | null) => {
  if (breakdownState === null) return [];
  if (isBreakdownStateRegions(breakdownState)) {
    return breakdownState.regionIds;
  }
  return (isBreakdownStateQualifiers(breakdownState) || isBreakdownStateYears(breakdownState)) &&
    breakdownState.regionId !== null
    ? [breakdownState.regionId]
    : [];
};

export default {
  CODE_TABLE,
  SUGGESTION_CODE_TABLE,
  DISPLAY_NAMES,
  FACET_FIELDS,
  NUMERICAL_FACETS,
  getValidatedOutputs,
  hasRegionLevelData,
  unpublishDatacube,
  unpublishDatacubeInstance,
};
