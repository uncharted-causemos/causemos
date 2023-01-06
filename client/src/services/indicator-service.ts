import API from '@/api/api';

export const fetchIndicator = async (variable: string, model: string, unit: string) => {
  const params = {
    indicator: variable,
    model,
  };
  if (unit) {
    Object.assign(params, { unit });
  }
  const result = await API.get('maas/indicator-data', { params });
  if (result.status !== 200) {
    console.error(`Failed to fetch data points for indicator "${variable}"`);
  }
  return result;
};
