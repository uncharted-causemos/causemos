/**
 * Finds the sorted order of one axis of the matrix, in descending order by sum of values
 * @param {Array} rowsOrColumns - either the `rows` or `columns` property of the matrix
 * @param {Array} values - the `values` property of the matrix
 * @returns {Array} - the provided axis, sorted and without duplicate entries
 */
function getSortedOrder(rowsOrColumns, values) {
  if (rowsOrColumns === undefined ||
    values === undefined ||
    rowsOrColumns.length !== values.length ||
    rowsOrColumns.length === 0
  ) return [];
  const sums = {};
  values.forEach((value, index) => {
    const entry = rowsOrColumns[index];
    if (sums[entry] === undefined) {
      sums[entry] = value;
    } else {
      sums[entry] += value;
    }
  });
  const result = Object.keys(sums);
  result.sort((a, b) => {
    // If A has a greater sum, it should be sorted earlier
    //  than B
    return sums[b] - sums[a];
  });
  return result;
}

/**
 * Converts the sensitivity analysis experiment results format to CSR
 *
 * @param {object} experimentResults - results in a hierarchical format
 */
const resultsToCsrFormat = (experimentResults) => {
  const rows = [];
  const columns = [];
  const value = [];
  Object.keys(experimentResults).forEach(sourceConcept => {
    Object.keys(experimentResults[sourceConcept]).forEach(targetConcept => {
      const _value = experimentResults[sourceConcept][targetConcept];
      // Don't add entries where the value is 0
      if (_value !== 0) {
        rows.push(sourceConcept);
        columns.push(targetConcept);
        value.push(_value);
      }
    });
  });
  return { rows, columns, value };
};

export default {
  getSortedOrder,
  resultsToCsrFormat
};
