export enum ModelRunStatus {
  Deleted = 'DELETED',
  Draft = 'NOT SUBMITTED', // un-submitted
  Ready = 'READY',
  Submitted = 'SUBMITTED',
  Processing = 'PROCESSING',
  ExecutionFailed = 'EXECUTION FAILED',
  ProcessingFailed = 'PROCESSING FAILED',
  Test = 'TEST',
}

export enum DatacubeStatus {
  Ready = 'READY',
  Processing = 'PROCESSING',
  Registered = 'REGISTERED',
  ProcessingFailed = 'PROCESSING FAILED',
  Deprecated = 'DEPRECATED',
}

export enum DatacubeType {
  Model = 'model',
  Indicator = 'indicator',
}

export enum ProjectType {
  Model = 'model',
  Dataset = 'dataset',
  Analysis = 'analysis',
}

export enum FeatureQualifierRoles {
  Weight = 'weight',
  Statistics = 'statistics',
  Breakdown = 'breakdown',
  Tooltip = 'tooltip',
}

export enum DatacubeGeoAttributeVariableType {
  Country = 'country',
  Admin1 = 'admin1',
  Admin2 = 'admin2',
  Admin3 = 'admin3',
}

export type SpatialAggregation = DatacubeGeoAttributeVariableType | 'tiles';

export enum DatacubeGenericAttributeVariableType {
  Int = 'int',
  Float = 'float',
  String = 'str',
  Boolean = 'boolean',
  Date = 'date', // a model param (within a run) would only have a single date value
  DateRange = 'daterange', // a model param (within a run) would only have two date values
  Geo = 'geo',
}

// numeric params can be converted to another numeric param type (i.e., int <--> float)
//  and can have their min/max values updated
// also, numeric param can be discrete (data type: nominal|ordinal) or continuous (data type: numerical)
// can a numeric param be freeform?
//
// a string param can have its data type converted between nominal|ordinal to freeform
//  nominal|ordinal assumes a pre-defined list of options vs freeform

export type DatacubeAttributeVariableType =
  | DatacubeGeoAttributeVariableType
  | DatacubeGenericAttributeVariableType;

export enum GeoAttributeFormat {
  Full_GADM_PATH = 'full_gadm_path',
  GADM_Code = 'gadm_code',
  Bounding_Box = 'bounding_box',
}

export enum ModelParameterDataType {
  Nominal = 'nominal', // discrete; fixed set of choices edited only by the modeller
  Ordinal = 'ordinal', // discrete; fixed set of choices edited only by the modeller
  Numerical = 'numerical', // continuous; a numerical range is needed to render correctly
  Freeform = 'freeform', // discrete, dynmaic choices; the user can add new choices
}

export enum TemporalResolution {
  Annual = 'annual',
  Monthly = 'monthly',
  Dekad = 'dekad',
  Weekly = 'weekly',
  Daily = 'daily',
  Other = 'other',
}

export enum ModelPublishingStepID {
  Enrich_Description,
  Tweak_Visualization,
  Capture_Insight,
}

export enum AdminLevel {
  Country = 'country',
  Admin1 = 'admin1',
  Admin2 = 'admin2',
  Admin3 = 'admin3',
  Admin4 = 'admin4',
  Admin5 = 'admin5',
}

export enum TemporalAggregationLevel {
  Year = 'year',
}

export enum SpatialAggregationLevel {
  Region = 'region',
}

export enum AggregationOption {
  None = '',
  Mean = 'mean',
  Sum = 'sum',
  WeightedAverage = 'wavg',
}

export enum TemporalResolutionOption {
  None = '',
  Year = 'year',
  Month = 'month',
}

export enum TimeScale {
  Months = 'MONTHS',
  Years = 'YEARS',
}

export enum DataTransform {
  None = '',
  PerCapita = 'percapita',
  PerCapita1K = 'percapita1k',
  PerCapita1M = 'percapita1m',
  Normalization = 'normalization',
}

export enum ReferenceSeriesOption {
  AllYears = 'allYears',
  SelectYears = 'selectYears',
  AllRegions = 'allRegions',
  SelectRegions = 'selectRegions',
}

export enum ComparativeAnalysisMode {
  List = 'list',
  Overlay = 'overlay',
}

export enum DatacubeViewMode {
  Description = 'description',
  Data = 'data',
  Media = 'media',
}

export enum RegionRankingCompositionType {
  Union = 'union',
  Intersection = 'intersection',
}

export enum BinningOptions {
  Quantile = 'Quantile (equal counts)',
  Linear = 'linear',
}

export enum IncompleteDataCorrectiveAction {
  OutOfScopeData = 'Data is Out of Scope (No Change)',
  NotRequired = 'No Changes Required',
  CompleteData = 'Complete Data (No Change)',
  DataRemoved = ' Final data point was removed',
  DataExtrapolated = 'Final data point contains extrapolated data',
}

export enum LoadStatus {
  Loading = 'Loading',
  Loaded = 'Loaded',
}

export const SPLIT_BY_VARIABLE = 'variable';
export const TIMESERIES_HEADER_SEPARATOR = ' | ';

/** Scales with continuous input and discrete output */
export enum DiscreteOuputScale {
  Quantize = 'Quantize',
  Quantile = 'Quantile',
}

// Each dataset should have projectionAlgorithm: Auto by default, but this can be overridden
export enum ProjectionAlgorithm {
  Auto,
  Holt,
  HoltWinters,
}

export enum ProjectionPointType {
  Forecasted = 'forecasted',
  Backcasted = 'backcasted',
  Interpolated = 'interpolated',
  Historical = 'historical',
  Constraint = 'constraint',
}

/**
 * * Old data: datasets that have 5 or fewer points for the selected country after the projection start date
 * * Insufficient data: datasets that have 5 or fewer points for the selected country
 */
export enum ProjectionDataWarning {
  OldData = 'Old data',
  InsufficientData = 'Insufficient data',
  NoPatternDetected = 'No pattern detected',
}

export enum SortableTableHeaderState {
  Up = 'UP',
  Down = 'DOWN',
  None = 'NONE',
}
