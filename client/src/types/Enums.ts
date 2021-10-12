export enum ModelRunStatus {
  Deleted = 'DELETED',
  Draft = 'NOT SUBMITTED', // un-submitted
  Ready = 'READY',
  Submitted = 'SUBMITTED',
  Processing = 'PROCESSING',
  ExecutionFailed = 'EXECUTION FAILED',
  Test = 'TEST'
}

export enum DatacubeStatus {
  Ready = 'READY',
  Processing = 'PROCESSING',
  Registered = 'REGISTERED'
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

export enum DatacubeAttributeVariableType {
  Int = 'int',
  Float = 'float',
  String = 'str',
  Boolean = 'boolean',
  Datetime = 'datetime',
  Latitude = 'lat',
  Longitude = 'lng',
  Country = 'country',
  Admin1 = 'admin1',
  Admin2 = 'admin2',
  Admin3 = 'admin3'
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

export const DefaultAggreggations = [
  TemporalAggregationLevel.Year.toString(),
  SpatialAggregationLevel.Region.toString()
];
