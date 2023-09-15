// import API from '@/api/api';

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
  console.log(cagIds);
  // As CAG specific 'bibliography/cag-bibliography' endpoint is removed from the server, return empty object for now.
  return {};
};
