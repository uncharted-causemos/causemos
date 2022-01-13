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
  Indicator = 'indicator'
}

export enum ProjectType {
  Model = 'model',
  Indicator = 'indicator',
  Analysis = 'analysis'
}

export enum FeatureQualifierRoles {
  Weight = 'weight',
  Statistics = 'statistics',
  Breakdown = 'breakdown',
  Tooltip = 'tooltip'
}

export enum DatacubeGeoAttributeVariableType {
  Country = 'country',
  Admin1 = 'admin1',
  Admin2 = 'admin2',
  Admin3 = 'admin3'
}

export enum DatacubeGenericAttributeVariableType {
  Int = 'int',
  Float = 'float',
  String = 'str',
  Boolean = 'boolean',
  Date = 'date', // a model param (within a run) would only have a single date value
  DateRange = 'daterange', // a model param (within a run) would only have two date values
  Geo = 'geo'
}

export type DatacubeAttributeVariableType = DatacubeGeoAttributeVariableType | DatacubeGenericAttributeVariableType;

export enum GeoAttributeFormat {
  Full_GADM_PATH = 'full_gadm_path',
  GADM_Code = 'gadm_code',
  Bounding_Box = 'bounding_box'
}

export enum ModelParameterDataType {
  Nominal = 'nominal', // discrete
  Ordinal = 'ordinal', // discrete
  Numerical = 'numerical', // continuous
  Freeform = 'freeform' // discrete, dynmaic choices
}

export enum TemporalResolution {
  Annual = 'annual',
  Monthly = 'monthly',
  Dekad = 'dekad',
  Weekly = 'weekly',
  Daily = 'daily',
  Other = 'other'
}

export enum ModelPublishingStepID {
  Enrich_Description,
  Tweak_Visualization,
  Capture_Insight
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
  Year = 'year'
}

export enum SpatialAggregationLevel {
  Region = 'region'
}

export enum AggregationOption {
  None = '',
  Mean = 'mean',
  Sum = 'sum'
}

export enum TemporalResolutionOption {
  None = '',
  Year = 'year',
  Month = 'month'
}

export enum TimeScale {
  Months = 'MONTHS',
  Years = 'YEARS'
}

export enum ReferenceSeriesOption {
  AllYears = 'allYears',
  SelectYears = 'selectYears',
  AllRegions = 'allRegions',
  SelectRegions = 'selectRegions'
}

export enum ComparativeAnalysisMode {
  List = 'list',
  SyncTime = 'sync time',
  RegionRanking = 'region ranking'
}

export enum RegionRankingCompositionType {
  Union = 'union',
  Intersection = 'intersection'// ,
  // specific-region-selection // a potential 3rd option to only consider bars for selection regions
}

export enum BinningOptions {
  Quantile = 'Quantile (equal counts)',
  Linear = 'linear'
}
