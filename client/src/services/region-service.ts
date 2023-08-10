import API from '@/api/api';

const COUNTRY_LIST_PATH = 'gadm/countries';
export const getCountryList = async () => {
  const result = await API.get(COUNTRY_LIST_PATH);
  return result.data;
};
