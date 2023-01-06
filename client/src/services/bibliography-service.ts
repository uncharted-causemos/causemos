import API from '@/api/api';

export interface PubDate {
  date: number;
  month: number;
  year: number;
  day: number;
}

export interface Bibliography {
  doc_id: string;
  author: string;
  title: string;
  publisher_name: string;
  publication_date: PubDate;
}

export const getBibiographyFromCagIds = async (cagIds: string[]) => {
  const payload = {
    ids: `["${cagIds.join('","')}"]`,
  };

  const result = await API.get('bibliography/cag-bibliography', { params: payload });
  return result;
};
