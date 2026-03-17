import { authRequest, type ApiResult } from './authHttp';

export type CoverPresetContentType = 'insight' | 'methodology';

export interface CoverPreset {
  id: string;
  contentType: CoverPresetContentType;
  title: string;
  imageUrl: string;
  sourceType?: 'seed' | 'upload';
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchCoverPresets(contentType: CoverPresetContentType) {
  return authRequest<CoverPreset[]>(`/cover-presets?contentType=${encodeURIComponent(contentType)}`);
}

export async function createCoverPreset(params: {
  contentType: CoverPresetContentType;
  title?: string;
  imageUrl: string;
  sourceType?: 'seed' | 'upload';
}) {
  return authRequest<CoverPreset>('/cover-presets', {
    method: 'POST',
    body: JSON.stringify(params),
  }, { withAuth: true });
}

export async function deleteCoverPreset(id: string): Promise<ApiResult<{ deleted: boolean }>> {
  return authRequest<{ deleted: boolean }>(`/cover-presets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, { withAuth: true });
}
