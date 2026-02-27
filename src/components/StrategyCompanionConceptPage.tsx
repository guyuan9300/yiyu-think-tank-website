import { useMemo } from 'react';
import AdminStrategyCompanionConceptPage from './AdminStrategyCompanionConceptPage';

type ClientName = '蓝信封' | '日慈基金会';

function resolveClientNameFromUrl(): ClientName {
  try {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId');
    if (!clientId) return '蓝信封';

    const raw = localStorage.getItem('yiyu_client_projects');
    const list = raw ? JSON.parse(raw) : [];
    const matched = list.find((x: any) => x?.id === clientId);
    const name = (matched?.clientName || '').trim();
    if (name === '日慈基金会') return '日慈基金会';
    return '蓝信封';
  } catch {
    return '蓝信封';
  }
}

export function StrategyCompanionConceptPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const initialClient = useMemo(() => resolveClientNameFromUrl(), []);

  return (
    <AdminStrategyCompanionConceptPage
      onNavigate={onNavigate}
      showHeader={true}
      viewMode="frontend"
      initialClient={initialClient}
    />
  );
}
