import { useState, useEffect, useRef } from 'react';
import { HomePage } from './components/HomePage';
import { InsightsPage } from './components/InsightsPage';
import { StrategyPage } from './components/StrategyPage';
import { AboutPage } from './components/AboutPage';
import { LibraryPage } from './components/LibraryPage';
import { BookLibraryPage } from './components/BookLibraryPage';
import { MethodologyLibraryPage } from './components/MethodologyLibraryPage';
import { ReportLibraryPage } from './components/ReportLibraryPage';
import { ArticleCenterPage } from './components/ArticleCenterPage';
import { BookReaderPage } from './components/BookReaderPage';
import { ReportReaderPage } from './components/ReportReaderPage';
import { MyLearningPage } from './components/MyLearningPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { LegalDocumentPage } from './components/LegalDocumentPage';
import { ArticleDetailPage } from './components/ArticleDetailPage';
import { TopicDetailPage } from './components/TopicDetailPage';
import { CaseDetailPage } from './components/CaseDetailPage';
import { AdminDashboard } from './components/AdminDashboard';
import { buildAdminUrl, getAdminTabFromSearchParams } from './lib/adminConsole';

import UserCenterPage from './components/UserCenterPage';
import { StrategyCompanionConceptPage } from './components/StrategyCompanionConceptPage';
import { ConsultApplyPage } from './components/ConsultApplyPage';
import { NotFoundPage } from './components/NotFoundPage';
import { StrategyModuleIntroPage } from './components/StrategyModuleIntroPage';
import { AboutPremiumPage } from './components/AboutPremiumPage';

function AdminRouteRedirect({ target }: { target: string }) {
  useEffect(() => {
    const absoluteTarget = target.startsWith('?') ? `${window.location.pathname}${target}` : target;
    const current = window.location.pathname + window.location.search;

    if (current !== absoluteTarget) {
      window.history.replaceState({}, '', target);
    }

    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [target]);

  return null;
}

export default function App() {
  // Avoid browser trying to restore scroll position across in-app navigation.
  // This app uses query-string based "routing" and React state, so we handle scroll ourselves.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Initialize state from URL synchronously so we don't wipe query params (e.g. clientId)
  // before the first effect runs.
  const initialParams = new URLSearchParams(window.location.search);

  // P0-IX-12: handle unknown `?page=` gracefully.
  // If a user opens an old/typo link, show a friendly 404 page instead of silently rendering Home with a wrong URL.
  const ALLOWED_PAGES = new Set([
    'home',
    'insights',
    'library',
    'report-library',
    'article-center',
    'book-reader',
    'report',
    'my-learning',
    'strategy',
    'about',
    'login',
    'register',
    'forgot-password',
    'reset-password',
    'terms-of-service',
    'privacy-policy',
    'article',
    'topic',
    'case',
    'admin',
    'admin-legacy',
    'user-center',
    'strategy-companion',
    'consult-apply',
    'admin-strategy-companion',
    'test',
    'methodology-library',
    'book-library',

    // Strategy module intro pages (from Home "战略陪伴" cards)
    'strategy-path',
    'business-design',
    'org-effectiveness',
    'digital-ai',

    // standalone landing pages
    'about-premium',

    '404',
  ]);

  // Route alias normalization.
  // Canonical URL: `?page=learning` (we keep internal page key as `library`).
  const initialPageRaw = initialParams.get('page') || 'home';
  // `learning` is an alias for `library`.
  const normalized = initialPageRaw === 'learning' ? 'library' : initialPageRaw;
  const initialUnknown = ALLOWED_PAGES.has(normalized) ? null : normalized;
  const initialPage = initialUnknown ? '404' : normalized;

  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  const [unknownPage, setUnknownPage] = useState<string | null>(initialUnknown);
  const [selectedBookId, setSelectedBookId] = useState<string>('shimeshiquanli');
  const [selectedDetailId, setSelectedDetailId] = useState<string>(initialParams.get('id') || '');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialParams.get('id') || 'blue-letter');

  const buildUrlForState = (page: string, detailId?: string, caseId?: string) => {
    const basePath = window.location.pathname;

    if (page === 'home') return basePath;
    // Canonicalize: keep `?page=learning` as the only public URL for learning center.
    // Internally we still use `currentPage='library'`.
    if (page === 'library') return `?page=learning`;
    if (page === '404') {
      const from = unknownPage;
      return from ? `?page=404&from=${encodeURIComponent(from)}` : `?page=404`;
    }

    if (page === 'article' || page === 'report' || page === 'topic') {
      return `?page=${page}&id=${encodeURIComponent(detailId || '')}`;
    }

    if (page === 'methodology-library') {
      // List page should not show a trailing `&id=` when no id selected.
      return detailId ? `?page=methodology-library&id=${encodeURIComponent(detailId)}` : `?page=methodology-library`;
    }

    if (page === 'case') {
      return `?page=case&id=${encodeURIComponent(caseId || '')}`;
    }

    if (page === 'strategy-companion') {
      // Preserve clientId from current URL if present.
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get('clientId');
      return clientId ? `?page=strategy-companion&clientId=${encodeURIComponent(clientId)}` : `?page=strategy-companion`;
    }

    if (page === 'admin') {
      return buildAdminUrl(getAdminTabFromSearchParams(new URLSearchParams(window.location.search)));
    }

    return `?page=${page}`;
  };

  // Proper browser back/forward support (pushState + popstate).
  // This avoids full-page navigations (which can show stale cached pages after deploy).
  useEffect(() => {
    const parseUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const pageRaw = params.get('page') || 'home';
      const normalizedPage = (pageRaw === 'learning') ? 'library' : pageRaw;
      const unknown = ALLOWED_PAGES.has(normalizedPage) ? null : normalizedPage;
      const page = unknown ? '404' : normalizedPage;
      const id = params.get('id') || '';

      return { page, unknown, id };
    };

    const onPopState = () => {
      const { page, unknown, id } = parseUrl();
      setUnknownPage(unknown);
      setCurrentPage(page);
      if (page === 'article' || page === 'report' || page === 'topic' || page === 'methodology-library') {
        setSelectedDetailId(id);
      }
      if (page === 'case') {
        setSelectedCaseId(id || 'blue-letter');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Push a new history entry on in-app page changes.
  const didMountRef = useRef(false);
  useEffect(() => {
    // Skip the very first render (URL already reflects initial state).
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const next = buildUrlForState(currentPage, selectedDetailId, selectedCaseId);
    const current = window.location.pathname + window.location.search;
    const target = next.startsWith('?') ? (window.location.pathname + next) : next;

    if (current !== target) {
      window.history.pushState({}, '', next);
    }
  }, [currentPage, selectedDetailId, selectedCaseId, unknownPage]);

  const handleNavigate = (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'book-reader' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'terms-of-service' | 'privacy-policy' | 'case' | 'admin' | 'user-center' | 'test' | 'my-learning' | 'strategy-companion' | 'report-library' | 'article-center' | 'consult-apply' | 'book-library' | 'methodology-library' | 'strategy-path' | 'business-design' | 'org-effectiveness' | 'digital-ai' | 'about-premium', bookId?: string, caseId?: string) => {
    // Reset scroll on page-level navigation so detail pages always open from the top.
    // (Otherwise the browser may keep the previous scroll position and look like it jumped to the bottom.)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    if (page === 'home') {
      setCurrentPage('home');
    } else if (page === 'insights') {
      setCurrentPage('insights');
    } else if (page === 'learning') {
      setCurrentPage('library');
    } else if (page === 'about') {
      setCurrentPage('about');
    } else if (page === 'book-reader') {
      setSelectedBookId(bookId || 'shimeshiquanli');
      setCurrentPage('book-reader');
    } else if (page === 'login' || page === 'register' || page === 'forgot-password' || page === 'reset-password' || page === 'terms-of-service' || page === 'privacy-policy') {
      setCurrentPage(page);
    } else if (page === 'case') {
      setSelectedCaseId(caseId || 'blue-letter');
      setCurrentPage('case');
    } else if (page === 'admin') {
      setCurrentPage('admin');
    } else if (page === 'user-center') {
      setCurrentPage('user-center');
    } else if (page === 'my-learning') {
      setCurrentPage('my-learning');
    } else if (page === 'report-library') {
      setCurrentPage('report-library');
    } else if (page === 'article-center') {
      setCurrentPage('article-center');
    } else if (page === 'book-library') {
      setCurrentPage('book-library');
    } else if (page === 'methodology-library') {
      setSelectedDetailId(bookId || '');
      setCurrentPage('methodology-library');
    } else if (page === 'strategy-companion') {
      setCurrentPage('strategy-companion');
    } else if (page === 'consult-apply') {
      setCurrentPage('consult-apply');
    } else {
      setCurrentPage(page);
    }
  };

  const handleNavigateToDetail = (type: 'article' | 'report' | 'topic', id: string) => {
    // Ensure detail pages start at the top.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    setSelectedDetailId(id);
    setCurrentPage(type);
  };

  // Not Found Page (unknown `?page=`)
  if (currentPage === '404') {
    return (
      <>
        <NotFoundPage
          unknownPage={unknownPage ?? undefined}
          onGoHome={() => {
            setUnknownPage(null);
            handleNavigate('home');
          }}
        />
      </>
    );
  }

  // Login Page
  if (currentPage === 'login') {
    return (
      <>
        <LoginPage 
          onNavigate={(page) => handleNavigate(page === 'login' ? 'home' : page as any)}
          onLoginSuccess={() => setCurrentPage('home')}
          onAdminLogin={() => setCurrentPage('admin')}
        />
      </>
    );
  }

  // Register Page
  if (currentPage === 'register') {
    return (
      <>
        <RegisterPage 
          onNavigate={(page) => handleNavigate(page === 'register' ? 'home' : page as any)}
          onRegisterSuccess={() => setCurrentPage('home')}
        />
      </>
    );
  }

  // Forgot Password Page
  if (currentPage === 'forgot-password') {
    return (
      <>
        <ForgotPasswordPage onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  // Reset Password Page
  if (currentPage === 'reset-password') {
    return (
      <>
        <ResetPasswordPage onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  if (currentPage === 'terms-of-service') {
    return (
      <>
        <LegalDocumentPage documentType="terms" onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  if (currentPage === 'privacy-policy') {
    return (
      <>
        <LegalDocumentPage documentType="privacy" onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  // Article Detail Page
  if (currentPage === 'article') {
    return (
      <>
        <ArticleDetailPage 
          articleId={selectedDetailId}
          onNavigate={(page, id) => handleNavigateToDetail(page as any, id || '')}
        />
      </>
    );
  }

  // Report Reader Page - 报告阅读器（16:9 PDF + AI对话）
  if (currentPage === 'report') {
    return (
      <>
        <ReportReaderPage reportId={selectedDetailId} />
      </>
    );
  }

  // Topic Detail Page
  if (currentPage === 'topic') {
    return (
      <>
        <TopicDetailPage 
          topicId={selectedDetailId}
          onNavigate={(page, id) => handleNavigateToDetail(page as any, id || '')}
        />
      </>
    );
  }

  // Case Detail Page
  if (currentPage === 'case') {
    return (
      <>
        <CaseDetailPage 
          caseId={selectedCaseId}
          onNavigate={(page, id) => {
            if (page === 'case') {
              handleNavigate('case', undefined, id);
            } else {
              handleNavigate(page as any);
            }
          }}
        />
      </>
    );
  }

  if (currentPage === 'insights') {
    return (
      <>
        <InsightsPage
          onNavigate={(page, id) => {
            if ((page === 'article' || page === 'report' || page === 'topic') && id) {
              handleNavigateToDetail(page as any, id);
              return;
            }
            handleNavigate(page as any, id);
          }}
        />
      </>
    );
  }

  if (currentPage === 'strategy') {
    return (
      <>
        <StrategyPage onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  if (currentPage === 'about') {
    return (
      <>
        <AboutPage onNavigate={handleNavigate} />
      </>
    );
  }

  if (currentPage === 'about-premium') {
    return (
      <>
        <AboutPremiumPage onNavigate={(p) => handleNavigate(p as any)} />
      </>
    );
  }

  if (currentPage === 'library') {
    return (
      <>
        <LibraryPage onNavigate={handleNavigate} />
      </>
    );
  }

  if (currentPage === 'book-library') {
    return (
      <>
        <BookLibraryPage onNavigate={(p, id) => handleNavigate(p as any, id)} />
      </>
    );
  }

  if (currentPage === 'methodology-library') {
    return (
      <>
        <MethodologyLibraryPage
          onNavigate={(p, id) => handleNavigate(p as any, id)}
          methodologyId={selectedDetailId}
        />
      </>
    );
  }

  // book-library page is deprecated (redirected to library)

  if (currentPage === 'report-library') {
    return (
      <>
        <ReportLibraryPage onNavigate={(page) => handleNavigate(page as any)} onNavigateToDetail={(type, id) => handleNavigateToDetail(type as any, id)} />
      </>
    );
  }

  // Article Center Page - 文章中心
  if (currentPage === 'article-center') {
    return (
      <>
        <ArticleCenterPage onNavigate={(page) => handleNavigate(page as any)} onNavigateToDetail={(id) => handleNavigateToDetail('article', id)} />
      </>
    );
  }

  if (currentPage === 'book-reader') {
    return (
      <>
        <BookReaderPage bookId={selectedBookId} onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  if (currentPage === 'my-learning') {
    return (
      <>
        <MyLearningPage onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  // Admin Dashboard - 需要登录验证
  if (currentPage === 'admin') {
    // 检查是否已登录管理员
    const isAdmin = (localStorage.getItem('yiyu_is_admin') ?? sessionStorage.getItem('yiyu_is_admin')) === 'true';
    
    if (!isAdmin) {
      // 未登录，重定向到登录页
      return (
        <>
          <LoginPage 
            onNavigate={(page) => handleNavigate(page === 'login' ? 'home' : page as any)}
            onLoginSuccess={() => setCurrentPage('home')}
            onAdminLogin={() => {
              // Fallback: ensure admin flag is set even if parent only reacts after reload.
              localStorage.setItem('yiyu_is_admin', 'true');
              sessionStorage.setItem('yiyu_is_admin', 'true');
              // 强制刷新页面以确保状态更新
              window.location.reload();
            }}
          />
        </>
      );
    }
    
    return (
      <>
        <AdminDashboard
          onNavigateHome={() => handleNavigate('home')}
          onLogout={() => {
            localStorage.removeItem('yiyu_is_admin');
            sessionStorage.removeItem('yiyu_is_admin');
            localStorage.removeItem('yiyu_admin_email');
            sessionStorage.removeItem('yiyu_admin_email');
            const u = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
            if (u) {
              try {
                const parsed = JSON.parse(u);
                if (parsed?.id === 'admin') {
                  localStorage.removeItem('yiyu_current_user');
                  sessionStorage.removeItem('yiyu_current_user');
                }
              } catch {}
            }
            window.dispatchEvent(new Event('yiyu_user_updated'));
            handleNavigate('login');
          }}
        />
      </>
    );
  }

  // Legacy Admin Dashboard（旧后台真实管理页）
  if (currentPage === 'admin-legacy') {
    return <AdminRouteRedirect target={buildAdminUrl(getAdminTabFromSearchParams(new URLSearchParams(window.location.search)))} />;
  }

  // User Center Page
  if (currentPage === 'user-center') {
    return (
      <>
        <UserCenterPage onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  // Strategy Companion Page - 战略客户专属页面
  if (currentPage === 'strategy-companion') {
    return (
      <>
        <StrategyCompanionConceptPage onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  // Consult Apply Page - 申请战略咨询（高门槛表单）
  if (currentPage === 'consult-apply') {
    return (
      <>
        <ConsultApplyPage onBack={() => handleNavigate('home')} />
      </>
    );
  }

  // Strategy Module Intro Pages
  if (currentPage === 'strategy-path' || currentPage === 'business-design' || currentPage === 'org-effectiveness' || currentPage === 'digital-ai') {
    return (
      <>
        <StrategyModuleIntroPage module={currentPage as any} onNavigate={(p: any) => handleNavigate(p)} />
      </>
    );
  }

  // Admin Strategy Companion Page - 战略客户后台管理页面
  if (currentPage === 'admin-strategy-companion') {
    return <AdminRouteRedirect target={buildAdminUrl()} />;
  }

  return (
    <>
      <HomePage onNavigate={handleNavigate} onNavigateToDetail={handleNavigateToDetail} />
    </>
  );
}
