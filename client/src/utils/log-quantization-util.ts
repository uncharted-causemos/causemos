// for a given value between 0-1
export function rangeQuantizedLog(
  valueToQuantize: number,
  logBase: number,
  rangeMax: number
): number {
  const logRangeExpansion = Math.pow(logBase, rangeMax);
  const logNumerator = Math.log(valueToQuantize * logRangeExpansion);
  const logDenominator = Math.log(logBase);
  return Math.ceil(logNumerator / logDenominator);
}
