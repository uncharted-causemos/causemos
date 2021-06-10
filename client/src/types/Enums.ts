export enum ModelRunStatus {
  Ready = 'READY',
  Submitted = 'SUBMITTED',
  Processing = 'PROCESSING',
  ExecutionFailed = 'EXECUTION FAILED'
}

export enum DatacubeStatus {
  Ready = 'READY',
  Processing = 'PROCESSING'
}

export enum DatacubeType {
  Model = 'model',
  Indicator = 'indicator'
}

export enum DatacubeAttributeVariableType {
  Int = 'int',
  Float = 'float',
  String = 'str',
  Boolean = 'boolean',
  Datetime = 'datetime',
  Latitude = 'lat',
  Longitude = 'lng'
}

export enum ModelParameterDataType {
  Nominal = 'nominal',
  Ordinal = 'ordinal',
  Numerical = 'numerical',
  Freeform = 'freeform'
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
