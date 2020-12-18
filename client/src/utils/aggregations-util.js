import _ from 'lodash';

/**
 * Operations for statements-related aggregations for the side panel
 *
*/


/**
 * Generalized multi-level data aggregation
 *
 * @param {array} dataArray - an array of objects, eg array of Indra statements
 * @param {array} configs - configuration objects determining the aggregation at each level
 *
 * Each config object must define a set of functions
 * - keyFn(d, i): key
 * - filerFn(d, i): filter
 * - sortFn(d): determines the children order
 * - metaFn(d, i): optional, embeds additional information at each level if needed, has access to
 *   d.key, d.count, and d.dataArray
 *
 * Result data struture will look something like
 * [
 *   {
 *     key:
 *     count:
 *     meta: {
 *     },
 *     children: [
 *       {
 *         key:
 *         count:
 *         children: [
 *           ...
 *         ]
 *       }
 *     ]
 *   }
 * ]
 */
const groupDataArray = (dataArray, configs) => {
  const config = configs.splice(0, 1)[0];

  // Filter
  const filtered = config.filterFn ? dataArray.filter(config.filterFn) : dataArray;

  // Regular group by
  const grouped = _.groupBy(filtered, config.keyFn);

  // Reformat output
  const children = [];
  _.forEach(grouped, (v, k) => {
    children.push({
      key: k,
      count: v.length,
      dataArray: v
    });
  });

  // Embed any additional meta infomration
  if (config.metaFn) {
    children.forEach((c, idx) => {
      c.meta = config.metaFn(c, idx);
    });
  }

  // Recurse down configuration list, if applicable
  if (configs.length > 0) {
    children.forEach(c => {
      c.children = groupDataArray(c.dataArray, _.cloneDeep(configs));
      delete c.dataArray; // FIXME: should make this optional to allow keeping intermediate results
    });
  }

  return config.sortFn ? _.sortBy(children, config.sortFn) : children;
};

const getMostFrequentPolarityPair = (statements) => {
  const groupedPolaritiesByFactor = _.groupBy(statements, s => {
    return s.subj_polarity + '///' + s.obj_polarity;
  });
  const maxKey = _.maxBy(
    _.map(groupedPolaritiesByFactor, (v, k) => ({ key: k, value: v })),
    entry => {
      return entry.value.length;
    });
  const polarityPair = maxKey.key.split('///');
  const mostFrequentPolarityPair = {
    subj_polarity: polarityPair[0],
    obj_polarity: polarityPair[1]
  };
  return mostFrequentPolarityPair;
};

export default {
  groupDataArray,
  getMostFrequentPolarityPair
};
