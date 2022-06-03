import API from '@/api/api';
import { DataAnalysisState } from '@/types/Analysis';
import { ComparativeAnalysisMode, ProjectType } from '@/types/Enums';

/**
 * Create new data analysis resource
 */
export const createAnalysis = async (
  title: string,
  description: string,
  projectId: string,
  state: DataAnalysisState | null
) => {
  // Initialize defaults if no state is provided
  const _state: DataAnalysisState = state ?? {
    analysisItems: [],
    activeTab: ComparativeAnalysisMode.List
  };
  const result = await API.post(
    'analyses',
    { title, description, project_id: projectId, state: _state },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return result.data;
};

export const openDatacubeDrilldown = async (id: string, itemId: string, router: any, project: string, analysisId: string) => {
  router.push({
    name: 'data',
    params: {
      project: project,
      analysisId: analysisId,
      projectType: ProjectType.Analysis
    },
    query: {
      datacube_id: id,
      item_id: itemId
    }
  }).catch(() => {});
};
