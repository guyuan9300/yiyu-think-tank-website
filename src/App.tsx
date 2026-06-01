import { useState, useEffect, useRef, type ReactNode } from 'react';
// 2026-05-28 统一架构: 已删 HomePage/InsightsPage/StrategyPage/LibraryPage/
// BookLibraryPage/MethodologyLibraryPage/BookReaderPage/CaseDetailPage import
import { AboutPage } from './components/AboutPage';
import { ReportLibraryPage } from './components/ReportLibraryPage';
import { ArticleCenterPage } from './components/ArticleCenterPage';
import { ReportReaderPage } from './components/ReportReaderPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { LegalDocumentPage } from './components/LegalDocumentPage';
import { ArticleDetailPage } from './components/ArticleDetailPage';
import { buildAdminUrl, getAdminTabFromSearchParams } from './lib/adminConsole';
import { fetchCurrentSession, normalizeLoginUser } from './lib/authApi';
import { bootstrapFromPgApi } from './lib/dataService';
import {
  ADMIN_EMAIL_KEY,
  ADMIN_FLAG_KEY,
  AUTH_TOKEN_KEY,
  clearUser,
  getSavedAuthToken,
  getSavedItem,
  getSavedUserRaw,
  removeSavedItem,
  saveUserRaw,
  setSavedItem,
} from './lib/storage';

import UserCenterPage from './components/UserCenterPage';
import { StrategyCompanionConceptPage } from './components/StrategyCompanionConceptPage';
import AdminStrategyCompanionConceptPage from './components/AdminStrategyCompanionConceptPage';
import { ConsultApplyPage } from './components/ConsultApplyPage';
import { NotFoundPage } from './components/NotFoundPage';
// 已删: OpenSourceWorkbenchPage / DemandSubmit/Pool/Detail / VolunteerApply / StrategyModuleIntroPage
import { OpenSourceHomePage } from './components/open-source-home/OpenSourceHomePage';
import { WorkbenchPage } from './components/open-source-home/WorkbenchPage';
import { SceneCapturePage } from './components/open-source-home/demo/SceneCapturePage';
import { AdminV2Page } from './components/admin-v2/AdminV2Page';
import { LocalAdminGate } from './components/admin-v2/LocalAdminGate';
import { AiPreviewPage } from './components/AiPreviewPage';
import { FriendsLivePage } from './components/FriendsLivePage';
import { UnicornCompanionPage } from './components/UnicornCompanionPage';
import { WorkshopPage } from './components/WorkshopPage';
import { PlatformSupportPage } from './components/PlatformSupportPage';
import { BookDetailPage } from './components/BookDetailPage';
import { PaymentIntroPage } from './components/PaymentIntroPage';
import { PaymentCheckoutPage } from './components/PaymentCheckoutPage';
import { PaymentResultPage } from './components/PaymentResultPage';
import { YiyuTongAssistant } from './components/YiyuTongAssistant';
import { MobileTabBar } from './components/mobile/MobileTabBar';
import { MobileHomeScreen } from './components/mobile/screens/MobileHomeScreen';
import { useIsMobile } from './lib/useIsMobile';

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

function clearAdminMarkers() {
  removeSavedItem(ADMIN_FLAG_KEY);
  removeSavedItem(ADMIN_EMAIL_KEY);
}

function AdminAccessGate({
  onNavigate,
  onLoginSuccess,
  children,
}: {
  onNavigate: (page: 'home' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'terms-of-service' | 'privacy-policy' | 'admin') => void;
  onLoginSuccess?: () => void;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // 沙箱/本地 dev: 管理员鉴权直通, 方便优化网站(免登录直接进后台)。
    // ⚠️ 仅 import.meta.env.DEV 生效; 生产 build 此分支被 tree-shake, 线上仍走下方正经鉴权。
    if (import.meta.env.DEV) {
      setStatus('allowed');
      return;
    }

    let canceled = false;

    // 本地是否已是管理员: 有 token 且 (管理员标记=true 或 已存 user.adminRole=admin)
    const hasLocalAdmin = (): boolean => {
      if (!getSavedAuthToken()) return false;
      if (getSavedItem(ADMIN_FLAG_KEY) === 'true') return true;
      try {
        const raw = getSavedUserRaw();
        if (raw && JSON.parse(raw)?.adminRole === 'admin') return true;
      } catch {
        /* ignore parse error */
      }
      return false;
    };

    const verifyAdminSession = async () => {
      const token = getSavedAuthToken();
      const optimistic = hasLocalAdmin();

      // 已登录管理员 → 直接放行进入，不卡服务端往返(应直接跳转)
      if (optimistic) {
        if (!canceled) setStatus('allowed');
      } else if (!token) {
        clearAdminMarkers();
        if (!canceled) setStatus('denied');
        return;
      }

      // 后台静默校验: 仅当服务端"明确"回应才据此调整; 网络/代理失败不踢已登录的人
      const result = await fetchCurrentSession();
      if (canceled) return;

      if (result.ok && result.data?.user) {
        const remember = localStorage.getItem(AUTH_TOKEN_KEY) != null;
        saveUserRaw(JSON.stringify(normalizeLoginUser(result.data.user)), remember);
        window.dispatchEvent(new Event('yiyu_user_updated'));

        if (result.data.user.adminRole === 'admin') {
          setSavedItem(ADMIN_FLAG_KEY, 'true', remember);
          setSavedItem(ADMIN_EMAIL_KEY, result.data.user.email || '', remember);
          setStatus('allowed');
          return;
        }

        // 服务端明确返回"非管理员" → 降级登出
        clearAdminMarkers();
        setStatus('denied');
        return;
      }

      // 服务端没给出有效结论(网络/代理失败): 本地已是管理员则维持放行, 否则拒绝
      if (!optimistic) {
        clearAdminMarkers();
        setStatus('denied');
      }
    };

    setStatus('checking');
    void verifyAdminSession();

    return () => {
      canceled = true;
    };
  }, [version]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[28px] bg-white/80 backdrop-blur-xl border border-border/40 shadow-2xl shadow-black/[0.06] p-8 text-center">
          <div className="text-xl font-semibold text-foreground">正在验证管理员身份</div>
          <p className="mt-3 text-sm text-muted-foreground/70">请稍候，正在校验当前登录状态。</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <LoginPage
        onNavigate={(page) => onNavigate(page === 'login' ? 'home' : page)}
        onLoginSuccess={() => {
          onLoginSuccess?.();
        }}
        onAdminLogin={() => {
          setVersion((current) => current + 1);
        }}
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  // Avoid browser trying to restore scroll position across in-app navigation.
  // This app uses query-string based "routing" and React state, so we handle scroll ourselves.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    let refreshing = false;

    const refreshSnapshot = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        await bootstrapFromPgApi();
      } finally {
        refreshing = false;
      }
    };

    const handleFocus = () => {
      void refreshSnapshot();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshSnapshot();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleFocus);
    };
  }, []);

  // Initialize state from URL synchronously so we don't wipe query params (e.g. clientId)
  // before the first effect runs.
  const initialParams = new URLSearchParams(window.location.search);

  // P0-IX-12: handle unknown `?page=` gracefully.
  // If a user opens an old/typo link, show a friendly 404 page instead of silently rendering Home with a wrong URL.
  // 2026-05-28 4 项导航统一架构后 ALLOWED_PAGES 大幅瘦身.
  // 顶部导航只 4 项: home / articles(=article-center) / reports(=report-library) / about
  // 其余保留: 详情页 / 法务 / 登录注册 / 后台 / 会员付费 / 战略陪伴客户工作台 / 申请咨询 / 开源首页 / 404
  // 已砍: insights / library / book-library / methodology-library / book-reader / my-learning /
  //       strategy / strategy-path / business-design / org-effectiveness / digital-ai /
  //       case / demand-* / open-source-workbench / test
  const ALLOWED_PAGES = new Set([
    // 4 项导航
    'home',
    'articles',         // alias → article-center
    'reports',          // alias → report-library
    'about',

    // admin-v2 新统一后台
    'admin-v2',
    // AI 生成文章演示 (验收期)
    'ai-preview',

    // 内部 page key (新 URL alias 解析后会到这里)
    'article-center',
    'report-library',

    // 内容详情
    'article',
    'report',

    // 书籍销售
    'book-detail',

    // 用户/会员/法务
    'login',
    'register',
    'forgot-password',
    'reset-password',
    'terms-of-service',
    'privacy-policy',
    'user-center',
    'membership',
    'payment-checkout',
    'payment-result',

    // 战略陪伴客户工作台 (已签约) + 申请咨询 CTA
    'strategy-companion',
    'consult-apply',

    // 开源首页 + 后台 + 404
    'open-source-home',
    'workbench',
    'friends-live',
    'unicorn-companion',
    'digital-workshop',
    'platform-support',
    // GIF 录制专用最小页面 (scripts/capture-hero-gifs.mjs 调用)
    'hero-capture',
    'admin',
    'admin-legacy',
    'admin-strategy-companion',
    '404',
  ]);

  // Route alias normalization.
  // Canonical URL: `?page=learning` (we keep internal page key as `library`).
  const initialPageRaw = initialParams.get('page') || 'home';
  // alias 表: learning/my-learning → library, articles → article-center, reports → report-library
  const normalized = (() => {
    if (initialPageRaw === 'learning' || initialPageRaw === 'my-learning') return 'library';
    if (initialPageRaw === 'articles') return 'article-center';
    if (initialPageRaw === 'reports') return 'report-library';
    return initialPageRaw;
  })();
  const initialUnknown = ALLOWED_PAGES.has(normalized) ? null : normalized;
  const initialPage = initialUnknown ? '404' : normalized;

  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  const [unknownPage, setUnknownPage] = useState<string | null>(initialUnknown);
  const isMobile = useIsMobile();
  const [selectedBookId, setSelectedBookId] = useState<string>(initialParams.get('id') || initialParams.get('bookId') || 'shimeshiquanli');
  const [selectedDetailId, setSelectedDetailId] = useState<string>(initialParams.get('id') || '');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialParams.get('id') || 'case-1');
  const shouldShowYiyuTong = ![
    'admin',
    'admin-legacy',
    'admin-strategy-companion',
    'login',
    'register',
    'forgot-password',
    'reset-password',
    'terms-of-service',
    'privacy-policy',
    'payment-checkout',
    'payment-result',
    'strategy-companion',
    '404',
  ].includes(currentPage);

  const renderWithYiyuTong = (content: ReactNode, assistantPage = currentPage) => (
    <>
      {content}
      {shouldShowYiyuTong ? <YiyuTongAssistant currentPage={assistantPage} /> : null}
      <MobileTabBar currentPage={currentPage} onNavigate={(page) => handleNavigate(page as any)} />
    </>
  );

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

    if (page === 'article' || page === 'report') {
      return `?page=${page}&id=${encodeURIComponent(detailId || '')}`;
    }

    if (page === 'methodology-library') {
      // List page should not show a trailing `&id=` when no id selected.
      return detailId ? `?page=methodology-library&id=${encodeURIComponent(detailId)}` : `?page=methodology-library`;
    }

    if (page === 'case') {
      return `?page=case&id=${encodeURIComponent(caseId || '')}`;
    }

    if (page === 'book-reader') {
      return `?page=book-reader&id=${encodeURIComponent(detailId || '')}`;
    }

    if (page === 'payment-checkout' || page === 'payment-result') {
      return `?page=${page}&id=${encodeURIComponent(detailId || '')}`;
    }

    if (page === 'demand-detail') {
      return `?page=demand-detail&id=${encodeURIComponent(detailId || '')}`;
    }

    if (page === 'book-detail') {
      return `?page=book-detail&id=${encodeURIComponent(detailId || '')}`;
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
      const normalizedPage = pageRaw === 'learning' || pageRaw === 'my-learning' ? 'library' : pageRaw;
      const unknown = ALLOWED_PAGES.has(normalizedPage) ? null : normalizedPage;
      const page = unknown ? '404' : normalizedPage;
      const id = params.get('id') || '';

      return { page, unknown, id };
    };

    const onPopState = () => {
      const { page, unknown, id } = parseUrl();
      setUnknownPage(unknown);
      setCurrentPage(page);
      if (
        page === 'article' ||
        page === 'report' ||
        page === 'methodology-library' ||
        page === 'payment-checkout' ||
        page === 'payment-result' ||
        page === 'demand-detail' ||
        page === 'book-detail'
      ) {
        setSelectedDetailId(id);
      }
      if (page === 'book-reader') {
        setSelectedBookId(id || 'shimeshiquanli');
      }
      if (page === 'case') {
        setSelectedCaseId(id || 'case-1');
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

    const next = buildUrlForState(
      currentPage,
      currentPage === 'book-reader' ? selectedBookId : selectedDetailId,
      selectedCaseId
    );
    const current = window.location.pathname + window.location.search;
    const target = next.startsWith('?') ? (window.location.pathname + next) : next;

    if (current !== target) {
      window.history.pushState({}, '', next);
    }
  }, [currentPage, selectedBookId, selectedDetailId, selectedCaseId, unknownPage]);

  const handleNavigate = (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'book-reader' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'terms-of-service' | 'privacy-policy' | 'case' | 'admin' | 'user-center' | 'membership' | 'payment-checkout' | 'payment-result' | 'test' | 'my-learning' | 'strategy-companion' | 'report-library' | 'article-center' | 'articles' | 'reports' | 'consult-apply' | 'book-library' | 'methodology-library' | 'strategy-path' | 'business-design' | 'org-effectiveness' | 'digital-ai' | 'open-source-workbench' | 'demand-submit' | 'volunteer-apply' | 'demand-pool' | 'demand-detail' | 'book-detail', bookId?: string, caseId?: string) => {
    // Reset scroll on page-level navigation so detail pages always open from the top.
    // (Otherwise the browser may keep the previous scroll position and look like it jumped to the bottom.)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    if (page === 'home') {
      setCurrentPage('home');
    } else if (page === 'insights') {
      setCurrentPage('insights');
    } else if (page === 'learning') {
      setCurrentPage('library');
    } else if (page === 'articles') {
      // 新版 URL alias: articles → article-center
      setCurrentPage('article-center');
    } else if (page === 'reports') {
      // 新版 URL alias: reports → report-library
      setCurrentPage('report-library');
    } else if (page === 'about') {
      setCurrentPage('about');
    } else if (page === 'book-reader') {
      setSelectedBookId(bookId || 'shimeshiquanli');
      setCurrentPage('book-reader');
    } else if (page === 'login' || page === 'register' || page === 'forgot-password' || page === 'reset-password' || page === 'terms-of-service' || page === 'privacy-policy') {
      setCurrentPage(page);
    } else if (page === 'case') {
      setSelectedCaseId(caseId || 'case-1');
      setCurrentPage('case');
    } else if (page === 'admin') {
      setCurrentPage('admin');
    } else if (page === 'user-center') {
      setCurrentPage('user-center');
    } else if (page === 'membership') {
      setCurrentPage('membership');
    } else if (page === 'payment-checkout' || page === 'payment-result') {
      setSelectedDetailId(bookId || '');
      setCurrentPage(page);
    } else if (page === 'my-learning') {
      setCurrentPage('library');
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
    } else if (page === 'demand-submit' || page === 'volunteer-apply' || page === 'demand-pool') {
      setCurrentPage(page);
    } else if (page === 'demand-detail') {
      setSelectedDetailId(bookId || '');
      setCurrentPage(page);
    } else if (page === 'book-detail') {
      // 书籍详情页: planId (book_51 / book_org / book_bundle) 走 bookId 参数
      setSelectedDetailId(bookId || '');
      setCurrentPage('book-detail');
    } else {
      setCurrentPage(page);
    }
  };

  const handleNavigateToDetail = (type: 'article' | 'report', id: string) => {
    // Ensure detail pages start at the top.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    setSelectedDetailId(id);
    setCurrentPage(type);
  };

  useEffect(() => {
    window.__YIYU_TONG_APP__ = {
      getState: () => ({
        currentPage,
        currentUrl: window.location.pathname + window.location.search,
        selectedDetailId,
        selectedBookId,
        selectedCaseId,
      }),
      openInternalUrl: (target: string) => {
        const normalized = target.startsWith('?') ? target : target.replace(window.location.origin, '');
        const params = new URLSearchParams(normalized.startsWith('?') ? normalized.slice(1) : normalized.split('?')[1] || '');
        const page = params.get('page') || 'home';
        const id = params.get('id') || '';

        if (page === 'article' || page === 'report') {
          handleNavigateToDetail(page as 'article' | 'report', id);
          return;
        }

        if (page === 'case') {
          handleNavigate('case', undefined, id);
          return;
        }

        if (page === 'book-reader') {
          handleNavigate('book-reader', id);
          return;
        }

        if (page === 'payment-checkout' || page === 'payment-result' || page === 'methodology-library' || page === 'demand-detail') {
          handleNavigate(page as any, id);
          return;
        }

        handleNavigate(page as any);
      },
      navigate: (page: string, id?: string) => {
        if (page === 'article' || page === 'report') {
          handleNavigateToDetail(page as 'article' | 'report', id || '');
          return;
        }
        if (page === 'case') {
          handleNavigate('case', undefined, id);
          return;
        }
        if (page === 'book-reader') {
          handleNavigate('book-reader', id);
          return;
        }
        if (page === 'demand-detail') {
          handleNavigate('demand-detail', id);
          return;
        }
        handleNavigate(page as any, id);
      },
    };

    return () => {
      delete window.__YIYU_TONG_APP__;
    };
  }, [currentPage, selectedBookId, selectedCaseId, selectedDetailId]);

  // Not Found Page (unknown `?page=`)
  if (currentPage === '404') {
    return renderWithYiyuTong(
      <NotFoundPage
        unknownPage={unknownPage ?? undefined}
        onGoHome={() => {
          setUnknownPage(null);
          handleNavigate('home');
        }}
      />
    );
  }

  // Login Page
  if (currentPage === 'login') {
    return (
      <>
        <LoginPage 
          onNavigate={(page) => handleNavigate(page === 'login' ? 'home' : page as any)}
          onLoginSuccess={() => setCurrentPage('home')}
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
    return renderWithYiyuTong(
      <ArticleDetailPage
        articleId={selectedDetailId}
        onNavigate={(page, id) => handleNavigateToDetail(page as any, id || '')}
      />
    );
  }

  // Report Reader Page - 报告阅读器（16:9 PDF + AI对话）
  if (currentPage === 'report') {
    return renderWithYiyuTong(<ReportReaderPage reportId={selectedDetailId} />);
  }

  // 2026-05-28 砍掉 case/insights/strategy 分支 (page 已不在 ALLOWED_PAGES)
  if (currentPage === 'about') {
    return renderWithYiyuTong(<AboutPage onNavigate={(p) => handleNavigate(p as any)} />);
  }

  // 2026-05-28 砍掉 library/book-library/methodology-library 分支
  if (currentPage === 'report-library') {
    return renderWithYiyuTong(
      <ReportLibraryPage onNavigate={(page) => handleNavigate(page as any)} onNavigateToDetail={(type, id) => handleNavigateToDetail(type as any, id)} />
    );
  }

  // Article Center Page - 文章中心
  if (currentPage === 'article-center') {
    return renderWithYiyuTong(
      <ArticleCenterPage onNavigate={(page) => handleNavigate(page as any)} onNavigateToDetail={(id) => handleNavigateToDetail('article', id)} />
    );
  }

  // 2026-05-28 砍掉 book-reader 分支

  // 旧后台(iframe admin.html)已屏蔽 → 统一跳转到新后台 admin-v2
  if (currentPage === 'admin') {
    return <AdminRouteRedirect target="?page=admin-v2" />;
  }

  // 旧 Legacy 后台已屏蔽 → 统一跳转到新后台 admin-v2
  if (currentPage === 'admin-legacy') {
    return <AdminRouteRedirect target="?page=admin-v2" />;
  }

  // User Center Page
  if (currentPage === 'user-center') {
    return renderWithYiyuTong(<UserCenterPage onNavigate={(page) => handleNavigate(page as any)} />, 'user-center');
  }

  if (currentPage === 'membership') {
    return renderWithYiyuTong(<PaymentIntroPage onNavigate={(page, id) => handleNavigate(page as any, id)} />, 'membership');
  }

  if (currentPage === 'payment-checkout') {
    return (
      <>
        <PaymentCheckoutPage planId={selectedDetailId} onNavigate={(page, id) => handleNavigate(page as any, id)} />
      </>
    );
  }

  if (currentPage === 'payment-result') {
    return (
      <>
        <PaymentResultPage orderNo={selectedDetailId} onNavigate={(page, id) => handleNavigate(page as any, id)} />
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
    return renderWithYiyuTong(<ConsultApplyPage onBack={() => handleNavigate('home')} />, 'consult-apply');
  }

  // 书籍详情/购买页 (planId: book_51 / book_org / book_bundle)
  if (currentPage === 'book-detail') {
    return (
      <BookDetailPage
        planId={selectedDetailId}
        onNavigate={(page, id) => handleNavigate(page as any, id)}
      />
    );
  }

  // 2026-05-28 砍掉 open-source-workbench (新版整页转作首页) + demand-* 4 个
  if (currentPage === 'open-source-home') {
    return (
      <>
        {isMobile
          ? <MobileHomeScreen onNavigate={(page, id) => handleNavigate(page as any, id)} />
          : <OpenSourceHomePage onNavigate={(page, id) => handleNavigate(page as any, id)} />}
        <MobileTabBar currentPage={currentPage} onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  // 「益语的朋友们 · 直播讨论」介绍页(占位, 入口来自付费弹窗权益)
  if (currentPage === 'friends-live') {
    return <FriendsLivePage onNavigate={(page) => handleNavigate(page as any)} />;
  }

  // 独角兽战略陪伴项目 · 金句型详情页(入口来自首页项目卡片)
  if (currentPage === 'workbench') {
    return (
      <>
        <WorkbenchPage onNavigate={(page) => handleNavigate(page as any)} />
        <MobileTabBar currentPage={currentPage} onNavigate={(page) => handleNavigate(page as any)} />
      </>
    );
  }

  if (currentPage === 'unicorn-companion') {
    return <UnicornCompanionPage onNavigate={(page, id) => handleNavigate(page as any, id)} />;
  }

  // 数字化战略工作坊 · 项目介绍页(入口来自支持池卡片)
  if (currentPage === 'digital-workshop') {
    return <WorkshopPage onNavigate={(page, id) => handleNavigate(page as any, id)} />;
  }

  // 益语智库智能平台公益组织支持计划 · 项目介绍页(入口来自支持池卡片)
  if (currentPage === 'platform-support') {
    return <PlatformSupportPage onNavigate={(page, id) => handleNavigate(page as any, id)} />;
  }

  // GIF 录制专用最小页面 (?page=hero-capture&scene=calendar|workspace|growth)
  // 不挂 Header / Footer / YiyuTong, 只渲染单个 WindowCard, 供 playwright 录像
  if (currentPage === 'hero-capture') {
    return <SceneCapturePage />;
  }

  // admin-v2 新统一后台 (10 模块) — 验收期改用 LocalAdminGate:
  //   1. 顾源源 / 白名单邮箱 登录后凭 localStorage 凭据放行
  //   2. 未登录 / 非白名单 → 显示 LoginPage
  // 部署生产时, 把 LocalAdminGate 换回 AdminAccessGate (调后端 fetchCurrentSession).
  if (currentPage === 'admin-v2') {
    return (
      <LocalAdminGate onNavigate={(page) => handleNavigate(page as any)}>
        <AdminV2Page onNavigate={(page) => handleNavigate(page as any)} />
      </LocalAdminGate>
    );
  }

  // AI 生成文章预览 (验收期: 直接看 AI 封面 + AI 正文渲染到真实文章详情页效果)
  if (currentPage === 'ai-preview') {
    return <AiPreviewPage onNavigate={(page) => handleNavigate(page as any)} />;
  }

  // 2026-05-28 砍掉 demand-detail / strategy-path / business-design / org-effectiveness / digital-ai

  // Admin Strategy Companion Page - 战略客户后台管理页面
  if (currentPage === 'admin-strategy-companion') {
    return (
      <AdminAccessGate
        onNavigate={(page) => handleNavigate(page as any)}
        onLoginSuccess={() => setCurrentPage('home')}
      >
        <AdminStrategyCompanionConceptPage />
      </AdminAccessGate>
    );
  }

  // Default fallback (含 currentPage === 'home') 直接渲染新版开源首页 OpenSourceHomePage.
  // 老 HomePage 在 Step 10 物理删除前先保留 import 以便回滚;新首页不包 yiyuTong,
  // 与 line 782 open-source-home 分支一致.
  return (
    <>
      {isMobile
        ? <MobileHomeScreen onNavigate={(page, id) => handleNavigate(page as any, id)} />
        : <OpenSourceHomePage onNavigate={(page, id) => handleNavigate(page as any, id)} />}
      <MobileTabBar currentPage={currentPage} onNavigate={(page) => handleNavigate(page as any)} />
    </>
  );
}
