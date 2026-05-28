import { useEffect, useMemo, useState } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';
import { getDemandPoolSeed } from '../lib/coBuild';
import { ContributionLayersSection } from './open-source-workbench/ContributionLayersSection';
import { DataCenterCoreSection } from './open-source-workbench/DataCenterCoreSection';
import { DemandIncubatorSection } from './open-source-workbench/DemandIncubatorSection';
import { ExistingShowroomsSection } from './open-source-workbench/ExistingShowroomsSection';
import { FinalActionSection } from './open-source-workbench/FinalActionSection';
import { OpenSourceWorkbenchClassicPage } from './OpenSourceWorkbenchClassicPage';
import { ProblemWithoutDataCenter } from './open-source-workbench/ProblemWithoutDataCenter';
import { RoleWorkbenchPossibilitiesSection } from './open-source-workbench/RoleWorkbenchPossibilitiesSection';
import { SocialResourceSection } from './open-source-workbench/SocialResourceSection';
import { WorkbenchGenerationSection } from './open-source-workbench/WorkbenchGenerationSection';
import { WorkbenchHero } from './open-source-workbench/WorkbenchHero';
import { RoleEntryGateway } from './open-source-workbench/RoleEntryGateway';
import { ScenarioDiagnostic } from './open-source-workbench/ScenarioDiagnostic';
import { VolunteerTaskMatcher } from './open-source-workbench/VolunteerTaskMatcher';
import { CollaborationFlowPreview } from './open-source-workbench/CollaborationFlowPreview';
import { RoleAwareStickyCTA } from './open-source-workbench/RoleAwareStickyCTA';
import type { ParticipationRole } from '../content/roleParticipationPaths';

interface OpenSourceWorkbenchPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

const IMG_BASE = `${import.meta.env.BASE_URL}images/workbench`;
const OPEN_SOURCE_IMG_BASE = `${import.meta.env.BASE_URL}images/open-source`;
const GITHUB_URL = 'https://github.com/guyuan9300/yiyu-thinktank-workbench';
const SHOW_CLASSIC_OPEN_SOURCE_WORKBENCH = true;

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? window.scrollY / total : 0);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[70] h-[2px]">
      <div
        className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-[width] duration-75"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

function getElementTop(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: 'smooth' });
}

function navigateByHref(href: string, onNavigate?: (page: string, id?: string) => void) {
  if (/^https?:\/\//.test(href)) {
    window.open(href, '_blank');
    return;
  }

  if (href.startsWith('?')) {
    const target = `${window.location.pathname}${href}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    return;
  }

  onNavigate?.(href);
}

export function OpenSourceWorkbenchPage({ onNavigate }: OpenSourceWorkbenchPageProps) {
  if (SHOW_CLASSIC_OPEN_SOURCE_WORKBENCH) {
    return <OpenSourceWorkbenchClassicPage onNavigate={onNavigate} />;
  }

  const demandCards = useMemo(() => getDemandPoolSeed(8), []);
  const [selectedRole, setSelectedRole] = useState<ParticipationRole | null>(null);

  const onHrefNavigate = (href: string) => navigateByHref(href, onNavigate);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Header onNavigate={onNavigate as any} />

      <main className="pt-20 sm:pt-24">
        <WorkbenchHero
          onNavigate={onNavigate}
          onJumpCost={() => getElementTop('showrooms-section')}
          onJumpPool={() => getElementTop('co-issue-pool-section')}
          githubUrl={GITHUB_URL}
          visualBase={OPEN_SOURCE_IMG_BASE}
        />

        <RoleEntryGateway onNavigate={onHrefNavigate} onRoleChange={setSelectedRole} />
        <ProblemWithoutDataCenter onNavigate={onNavigate} />
        <DataCenterCoreSection />
        <WorkbenchGenerationSection imgBase={IMG_BASE} visualBase={OPEN_SOURCE_IMG_BASE} onNavigate={onNavigate} />
        <RoleWorkbenchPossibilitiesSection onNavigate={onNavigate} />
        <SocialResourceSection visualBase={OPEN_SOURCE_IMG_BASE} onNavigate={onNavigate} />
        <ExistingShowroomsSection imgBase={OPEN_SOURCE_IMG_BASE} />

        <DemandIncubatorSection
          cards={demandCards}
          onNavigate={onNavigate}
          visualBase={OPEN_SOURCE_IMG_BASE}
          title="共建议题池：把真实组织场景整理成公共工具。"
          description="当现有样板间还不能覆盖你的场景，可以把真实问题提交到共建议题池。社区会把它整理成流程、工作台、报表或 AI 总结能力。"
        />
        <ScenarioDiagnostic onNavigate={onHrefNavigate} />
        <VolunteerTaskMatcher cards={demandCards} onNavigate={onHrefNavigate} />
        <CollaborationFlowPreview />

        <ContributionLayersSection visualBase={OPEN_SOURCE_IMG_BASE} onNavigate={onNavigate} />
        <FinalActionSection onNavigate={onNavigate} githubUrl={GITHUB_URL} />
      </main>

      <RoleAwareStickyCTA selectedRole={selectedRole} onNavigate={onHrefNavigate} />
      <Footer onNavigate={onNavigate as any} />
    </div>
  );
}
