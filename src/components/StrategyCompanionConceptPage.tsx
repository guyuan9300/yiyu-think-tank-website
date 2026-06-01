import { useEffect, useMemo, useState } from 'react';
import AdminStrategyCompanionConceptPage from './AdminStrategyCompanionConceptPage';
import { fetchStrategyAccess, type StrategyAccessMode } from '../lib/strategyCompanionApi';
import { useLang } from '../lib/i18n';

function resolveProjectIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId') || '';
  } catch {
    return '';
  }
}

export function StrategyCompanionConceptPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useLang();
  const [accessMode, setAccessMode] = useState<StrategyAccessMode>('public');
  const [initialProjectId, setInitialProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  const requestedProjectId = useMemo(() => resolveProjectIdFromUrl(), []);

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      setLoading(true);
      const result = await fetchStrategyAccess();
      if (canceled) return;

      if (!result.ok || !result.data) {
        setAccessMode('public');
        setInitialProjectId('');
        setLoading(false);
        return;
      }

      const data = result.data;
      setAccessMode(data.mode);
      if (data.mode === 'project') {
        setInitialProjectId(data.project?.id || '');
      } else if (data.mode === 'admin') {
        const publishedProjects = data.projects || [];
        const matched = publishedProjects.find((item) => item.id === requestedProjectId);
        setInitialProjectId(matched?.id || publishedProjects[0]?.id || '');
      } else {
        setInitialProjectId('');
      }
      setLoading(false);
    };

    void load();
    return () => {
      canceled = true;
    };
  }, [requestedProjectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center text-sm text-slate-500">
        {t({ zh: '正在加载战略陪伴页面…', en: 'Loading the Strategic Companionship page…' })}
      </div>
    );
  }

  return (
    <AdminStrategyCompanionConceptPage
      onNavigate={onNavigate}
      showHeader={true}
      viewMode="frontend"
      accessMode={accessMode}
      initialProjectId={initialProjectId}
    />
  );
}
