import { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { InsightsPage } from './components/InsightsPage';
import { StrategyPage } from './components/StrategyPage';
import { AboutPage } from './components/AboutPage';
import { LibraryPage } from './components/LibraryPage';
import { BookLibraryPage } from './components/BookLibraryPage';
import { ReportLibraryPage } from './components/ReportLibraryPage';
import { ArticleCenterPage } from './components/ArticleCenterPage';
import { BookReaderPage } from './components/BookReaderPage';
import { ReportReaderPage } from './components/ReportReaderPage';
import { MyLearningPage } from './components/MyLearningPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ArticleDetailPage } from './components/ArticleDetailPage';
import { TopicDetailPage } from './components/TopicDetailPage';
import { CaseDetailPage } from './components/CaseDetailPage';
import { AdminDashboard } from './components/AdminDashboard';
import UserCenterPage from './components/UserCenterPage';
import { StrategyCompanionPage } from './components/StrategyCompanionPage';
import AdminStrategyCompanionPage from './components/AdminStrategyCompanionPage';
import { ConsultApplyPage } from './components/ConsultApplyPage';

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
  // P0-IX-10: route alias normalization. Keep backward compatibility for old links.
  // `?page=learning` should behave as `?page=library`.
  const initialPageRaw = initialParams.get('page') || 'home';
  const initialPage = initialPageRaw === 'learning' ? 'library' : initialPageRaw;
  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  const [selectedBookId, setSelectedBookId] = useState<string>('shimeshiquanli');
  const [selectedDetailId, setSelectedDetailId] = useState<string>(initialParams.get('id') || '');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialParams.get('id') || 'blue-letter');
  // Page switcher scaffolding (for building/testing). Default OFF, auto-ON for admin.
  const [showPageSwitcher, setShowPageSwitcher] = useState(false);

  // Read debug/admin-only scaffolding flags from URL/localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug');

    // Scaffolding controls:
    // - ?debug=1 forces the page switcher on
    // - Admin account sees it by default (until the site is fully built)
    if (debug === '1') {
      setShowPageSwitcher(true);
      return;
    }

    try {
      const userStr = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
      if (userStr) {
        const user = JSON.parse(userStr);
        const adminEmails = ['guyuan9300@gmail.com'];
        if (user?.email && adminEmails.includes(String(user.email).toLowerCase())) {
          setShowPageSwitcher(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 监听页面变化并更新URL（不刷新页面）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentPageParam = params.get('page');
    const currentIdParam = params.get('id');
    
    if (currentPage === 'home') {
      if (currentPageParam !== 'home') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (currentPage === 'login' || currentPage === 'register' || currentPage === 'forgot-password' || currentPage === 'reset-password') {
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    } else if (currentPage === 'article' || currentPage === 'report' || currentPage === 'topic') {
      if (currentPageParam !== currentPage || currentIdParam !== selectedDetailId) {
        window.history.replaceState({}, '', `?page=${currentPage}&id=${selectedDetailId}`);
      }
    } else if (currentPage === 'case') {
      if (currentPageParam !== currentPage || currentIdParam !== selectedCaseId) {
        window.history.replaceState({}, '', `?page=${currentPage}&id=${selectedCaseId}`);
      }
    } else if (currentPage === 'admin') {
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    } else if (currentPage === 'user-center') {
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    } else if (currentPage === 'strategy-companion') {
      // Preserve clientId so direct links and switching context won't be wiped by the global URL sync.
      const clientId = params.get('clientId');
      const next = clientId ? `?page=${currentPage}&clientId=${encodeURIComponent(clientId)}` : `?page=${currentPage}`;
      if (currentPageParam !== currentPage || (clientId && params.get('clientId') !== clientId)) {
        window.history.replaceState({}, '', next);
      }
    } else if (currentPage === 'consult-apply') {
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    } else if (currentPage === 'admin-strategy-companion') {
      // Keep admin page stable
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    } else if (currentPage === 'test') {
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    } else {
      if (currentPageParam !== currentPage) {
        window.history.replaceState({}, '', `?page=${currentPage}`);
      }
    }
  }, [currentPage, selectedDetailId, selectedCaseId]);

  const handleNavigate = (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'book-reader' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'case' | 'admin' | 'user-center' | 'test' | 'strategy-companion' | 'report-library' | 'article-center' | 'consult-apply', bookId?: string, caseId?: string) => {
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
    } else if (page === 'login' || page === 'register') {
      setCurrentPage(page);
    } else if (page === 'case') {
      setSelectedCaseId(caseId || 'blue-letter');
      setCurrentPage('case');
    } else if (page === 'admin') {
      setCurrentPage('admin');
    } else if (page === 'user-center') {
      setCurrentPage('user-center');
    } else if (page === 'report-library') {
      setCurrentPage('report-library');
    } else if (page === 'article-center') {
      setCurrentPage('article-center');
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

  const PageSwitcher = () => {
    if (!showPageSwitcher) return null;

    return (
      <div className="fixed bottom-8 right-8 z-50 glass rounded-2xl p-4 border border-primary/30 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">页面导航</h4>
          <button
            onClick={() => setShowPageSwitcher(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setCurrentPage('home')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'home' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            首页
          </button>
          <button
            onClick={() => setCurrentPage('login')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'login' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setCurrentPage('register')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'register' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            注册
          </button>
          <div className="border-t border-border/30 my-2" />
          <button
            onClick={() => setCurrentPage('insights')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'insights' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            洞察总页
          </button>
          <div className="border-t border-border/30 my-2" />
          <button
            onClick={() => setCurrentPage('library')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'library' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            学习中心 Hub
          </button>
          <button
            onClick={() => setCurrentPage('book-library')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ml-3 ${
              currentPage === 'book-library' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            书库
          </button>
          <button
            onClick={() => setCurrentPage('report-library')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ml-3 ${
              currentPage === 'report-library' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            报告库
          </button>
          <button
            onClick={() => setCurrentPage('article-center')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ml-3 ${
              currentPage === 'article-center' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            文章中心
          </button>
          <button
            onClick={() => setCurrentPage('book-reader')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ml-3 ${
              currentPage === 'book-reader' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            智慧书房
          </button>
          <button
            onClick={() => setCurrentPage('my-learning')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ml-3 ${
              currentPage === 'my-learning' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            我的学习
          </button>
          <div className="border-t border-border/30 my-2" />
          <button
            onClick={() => setCurrentPage('strategy')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'strategy' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            战略陪伴
          </button>
          <button
            onClick={() => setCurrentPage('case')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ml-3 ${
              currentPage === 'case' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            案例详情
          </button>
          <button
            onClick={() => setCurrentPage('about')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'about' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            关于我们
          </button>
          <button
            onClick={() => setCurrentPage('admin')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'admin' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            管理后台
          </button>
          <button
            onClick={() => setCurrentPage('user-center')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'user-center' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            会员中心
          </button>
          <button
            onClick={() => setCurrentPage('strategy-companion')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'strategy-companion' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            战略客户
          </button>
          <button
            onClick={() => setCurrentPage('admin-strategy-companion')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'admin-strategy-companion' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            战略客户后台
          </button>
          <button
            onClick={() => setCurrentPage('test')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === 'test' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/30'
            }`}
          >
            按钮测试
          </button>
        </div>
      </div>
    );
  };

  // Login Page
  if (currentPage === 'login') {
    return (
      <>
        <LoginPage 
          onNavigate={(page) => handleNavigate(page === 'login' ? 'home' : page as any)}
          onLoginSuccess={() => setCurrentPage('home')}
          onAdminLogin={() => setCurrentPage('admin')}
        />
        <PageSwitcher />
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
        <PageSwitcher />
      </>
    );
  }

  // Forgot Password Page
  if (currentPage === 'forgot-password') {
    return (
      <>
        <ForgotPasswordPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
      </>
    );
  }

  // Reset Password Page
  if (currentPage === 'reset-password') {
    return (
      <>
        <ResetPasswordPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
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
        <PageSwitcher />
      </>
    );
  }

  // Report Reader Page - 报告阅读器（16:9 PDF + AI对话）
  if (currentPage === 'report') {
    return (
      <>
        <ReportReaderPage reportId={selectedDetailId} />
        <PageSwitcher />
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
        <PageSwitcher />
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
        <PageSwitcher />
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
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'strategy') {
    return (
      <>
        <StrategyPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'about') {
    return (
      <>
        <AboutPage onNavigate={handleNavigate} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'library') {
    return (
      <>
        <LibraryPage onNavigate={handleNavigate} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'book-library') {
    return (
      <>
        <BookLibraryPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'report-library') {
    return (
      <>
        <ReportLibraryPage onNavigate={(page) => handleNavigate(page as any)} onNavigateToDetail={(type, id) => handleNavigateToDetail(type as any, id)} />
        <PageSwitcher />
      </>
    );
  }

  // Article Center Page - 文章中心
  if (currentPage === 'article-center') {
    return (
      <>
        <ArticleCenterPage onNavigate={(page) => handleNavigate(page as any)} onNavigateToDetail={(id) => handleNavigateToDetail('article', id)} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'book-reader') {
    return (
      <>
        <BookReaderPage bookId={selectedBookId} onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'my-learning') {
    return (
      <>
        <MyLearningPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
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
          <PageSwitcher />
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
            // 同时清理当前用户（管理员）
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
        <PageSwitcher />
      </>
    );
  }

  // User Center Page
  if (currentPage === 'user-center') {
    return (
      <>
        <UserCenterPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
      </>
    );
  }

  // Strategy Companion Page - 战略客户专属页面
  if (currentPage === 'strategy-companion') {
    return (
      <>
        <StrategyCompanionPage onNavigate={(page) => handleNavigate(page as any)} />
        <PageSwitcher />
      </>
    );
  }

  // Consult Apply Page - 申请战略咨询（高门槛表单）
  if (currentPage === 'consult-apply') {
    return (
      <>
        <ConsultApplyPage onBack={() => handleNavigate('home')} />
        <PageSwitcher />
      </>
    );
  }

  // Admin Strategy Companion Page - 战略客户后台管理页面
  if (currentPage === 'admin-strategy-companion') {
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
              localStorage.setItem('yiyu_is_admin', 'true');
              sessionStorage.setItem('yiyu_is_admin', 'true');
              window.location.reload();
            }}
          />
          <PageSwitcher />
        </>
      );
    }
    
    return (
      <>
        <AdminStrategyCompanionPage />
        <PageSwitcher />
      </>
    );
  }

  return (
    <>
      <HomePage onNavigate={handleNavigate} onNavigateToDetail={handleNavigateToDetail} />
      <PageSwitcher />
    </>
  );
}
