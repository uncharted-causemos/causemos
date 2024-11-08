import API from '@/api/api';

const COUNTRY_LIST_PATH = 'gadm/countries';
const GADM_NAME_TO_ISO_2_PATH = 'gadm/gadmNameToISO2Map';
export const getCountryList = async () => {
  const result = await API.get(COUNTRY_LIST_PATH);
  return result.data;
};

export const getGadmNameToIso2Map = async () => {
  const result = await API.get(GADM_NAME_TO_ISO_2_PATH);
  return result.data;
};
