import {
  deleteStrategyLearningResource,
  fetchStrategyLearningResources,
  fetchStrategyProjects,
  saveStrategyLearningResource,
  type StrategyLearningResource,
  type StrategyProjectSummary,
} from './strategyCompanionApi';

export interface ClientProject {
  id: string;
  clientName: string;
  projectName?: string;
  status: 'active' | 'completed' | 'paused';
  description?: string;
  logoUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRecommendation {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: 'internal' | 'external';
  internalType?: 'article' | 'report' | 'book' | 'methodology';
  internalId?: string;
  url?: string;
  sourceName?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapProject(project: StrategyProjectSummary): ClientProject {
  return {
    id: project.id,
    clientName: project.clientName,
    projectName: project.projectName,
    status: 'active',
    description: project.description,
    logoUrl: project.logoUrl,
    sortOrder: 0,
    isActive: project.isActive !== false,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
  };
}

function mapLearning(resource: StrategyLearningResource): CourseRecommendation {
  return {
    id: resource.id || '',
    projectId: resource.projectId || '',
    title: resource.title,
    description: resource.summary || '',
    type: resource.sourceType === 'internal' ? 'internal' : 'external',
    internalType: resource.internalType,
    internalId: resource.internalId,
    url: resource.link || '',
    sourceName: resource.projectName,
    sortOrder: resource.sortOrder || 0,
    isActive: resource.isActive !== false,
    createdAt: resource.createdAt || new Date().toISOString(),
    updatedAt: resource.updatedAt || new Date().toISOString(),
  };
}

export async function getClientProjects() {
  const result = await fetchStrategyProjects('admin');
  return result.ok && result.data ? result.data.map(mapProject) : [];
}

export async function getCourseRecommendations(projectId?: string) {
  const result = await fetchStrategyLearningResources();
  const list = result.ok && result.data ? result.data.map(mapLearning) : [];
  return projectId ? list.filter((item) => item.projectId === projectId) : list;
}

export async function saveCourseRecommendation(rec: Partial<CourseRecommendation>) {
  if (!rec.projectId || !rec.title) return null;
  const result = await saveStrategyLearningResource({
    id: rec.id,
    projectId: rec.projectId,
    title: rec.title,
    summary: rec.description || '',
    relation: '',
    detail: [],
    kind: '文章',
    link: rec.url || '',
    sourceType: rec.type === 'internal' ? 'internal' : 'manual',
    internalType: rec.internalType,
    internalId: rec.internalId,
    sortOrder: rec.sortOrder || 0,
    isActive: rec.isActive !== false,
  });
  return result.ok && result.data ? mapLearning(result.data) : null;
}

export async function deleteCourseRecommendation(id: string) {
  const result = await deleteStrategyLearningResource(id);
  return result.ok;
}
