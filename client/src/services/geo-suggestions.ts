import API from '@/api/api';
import _ from 'lodash';

export const searchGADM = _.debounce(async (field: string, query: string) => {
  const result = await API.get('gadm-names', { params: { field, q: query } });
  return result.data;
}, 500);


export default {
  searchGADM
};
