/**
 * Finds the sorted order of one axis of the matrix, in descending order by sum of values
 * @param {Array} rowsOrColumns - either the `rows` or `columns` property of the matrix
 * @param {Array} values - the `values` property of the matrix
 * @returns {Array} - the provided axis, sorted and without duplicate entries
 */
function getSortedOrder(rowsOrColumns, values) {
  if (
    rowsOrColumns === undefined ||
    values === undefined ||
    rowsOrColumns.length !== values.length ||
    rowsOrColumns.length === 0
  )
    return [];
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
 * Finds the sorted order of one axis of the matrix, based on the values in
 * the selected row or column
 * @param {Object} matrixData - the matrix in CSR format
 * @param {boolean} isRowSelected - whether the selection is a row or column
 * @param {string} selectedConcept - the label of the selected row or column
 * @returns {Array} - the provided axis, sorted and without duplicate entries
 */
function getSortedOrderBySelection(matrixData, isRowSelected, selectedConcept) {
  const selectedAxis = isRowSelected ? matrixData.rows : matrixData.columns;
  const crossAxis = isRowSelected ? matrixData.columns : matrixData.rows;
  // Fall back to default sort order if the selected row or column
  //  is missing values
  const fallbackOrder = getSortedOrder(crossAxis, matrixData.value);
  // Find all of the values that are in the selected row or column
  //  and sort them
  const valuesInSelection = {};
  matrixData.value.forEach((value, index) => {
    if (selectedAxis[index] === selectedConcept) {
      valuesInSelection[crossAxis[index]] = value;
    }
  });
  const conceptsInSelection = Object.keys(valuesInSelection);
  conceptsInSelection.sort((a, b) => valuesInSelection[b] - valuesInSelection[a]);
  // Fill in the rows that don't have values in the selected column from the
  //  fallback, maintaining their order
  const conceptsNotInSelection = fallbackOrder.filter(
    (concept) => !conceptsInSelection.includes(concept)
  );
  return [...conceptsInSelection, ...conceptsNotInSelection];
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
  Object.keys(experimentResults).forEach((sourceConcept) => {
    Object.keys(experimentResults[sourceConcept]).forEach((targetConcept) => {
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
  getSortedOrderBySelection,
  resultsToCsrFormat,
};
