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
 * - filterFn(d, i): filter
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

export interface AggChild<T> {
  key: string;
  count: number;
  dataArray: T[];
  meta?: any;
  children?: AggChild<T>[];
}

interface AggConfig<T> {
  keyFn: (arg1: T) => string | number;
  filterFn?: (arg1: T, arg2: number) => boolean;
  metaFn?: (arg1: AggChild<T>, arg2: number) => any; // FIXME
  sortFn?: (arg1: AggChild<T>) => number | string;
}

const groupDataArray = <T>(dataArray: T[], configs: AggConfig<T>[]) => {
  const config = configs.splice(0, 1)[0];

  // Filter
  const filtered = config.filterFn ? dataArray.filter(config.filterFn) : dataArray;

  // Regular group by
  const grouped = _.groupBy<T>(filtered, config.keyFn);

  const children: AggChild<T>[] = [];
  _.forEach(grouped, (v, k) => {
    children.push({
      key: k,
      count: v.length,
      dataArray: v,
    });
  });

  // Embed any additional meta infomration
  children.forEach((c, idx) => {
    if (config.metaFn) {
      c.meta = config.metaFn(c, idx);
    }
  });

  // Recurse down configuration list, if applicable
  if (configs.length > 0) {
    children.forEach((c) => {
      c.children = groupDataArray(c.dataArray, _.cloneDeep(configs));
      // delete c.dataArray; // FIXME: should make this optional to allow keeping intermediate results
      c.dataArray = [];
    });
  }
  return config.sortFn ? _.sortBy(children, config.sortFn) : children;
};

/**
 * Less general variation on groupDataArray with a lighter-weight output structure
 *
 * @param {array} dataArray - an array of objects, e.g. array of timeseries values
 * @param {array} groupingFunctions - functions determining how to group each level
 *
 * Each function should be of the form
 *  (dataPoint) => dataPoint.country
 *
 * Result data struture will look something like:
 * {
 *  'Ethiopia': {
 *    'Oromia': {
 *      'Oromia L2 Region A': [ *timeseries values* ],
 *      'Oromia L2 Region B': [ *timeseries values* ],
 *      ...
 *    },
 *    'Amhara': { ... },
 *    ...
 *  },
 *  'South Sudan': { ... },
 *  ...
 * }
 */
const groupRepeatedly = (dataArray: any, groupingFunctions: any) => {
  if (groupingFunctions.length === 0) return dataArray;
  const [groupingFunction, ...remainingFunctions] = groupingFunctions;
  const grouped = _.groupBy(dataArray, groupingFunction);
  Object.keys(grouped).forEach((key) => {
    const subArray = grouped[key];
    grouped[key] = groupRepeatedly(subArray, remainingFunctions);
  });
  return grouped;
};

// const getMostFrequentPolarityPair = (statements) => {
//   const groupedPolaritiesByFactor = _.groupBy(statements, s => {
//     return s.subj_polarity + '///' + s.obj_polarity;
//   });
//   const maxKey = _.maxBy(
//     _.map(groupedPolaritiesByFactor, (v, k) => ({ key: k, value: v })),
//     entry => {
//       return entry.value.length;
//     });
//   const polarityPair = maxKey.key.split('///');
//   const mostFrequentPolarityPair = {
//     subj_polarity: polarityPair[0],
//     obj_polarity: polarityPair[1]
//   };
//   return mostFrequentPolarityPair;
// };

export default {
  groupDataArray,
  groupRepeatedly,
  // getMostFrequentPolarityPair
};
