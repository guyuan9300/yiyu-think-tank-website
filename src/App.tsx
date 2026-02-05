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
import { ArticleDetailPage } from './components/ArticleDetailPage';
import { TopicDetailPage } from './components/TopicDetailPage';
import { CaseDetailPage } from './components/CaseDetailPage';
import { AdminDashboard } from './components/AdminDashboard';
import UserCenterPage from './components/UserCenterPage';
import StrategyCompanionPage from './components/StrategyCompanionPage';
import AdminStrategyCompanionPage from './components/AdminStrategyCompanionPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedBookId, setSelectedBookId] = useState<string>('shimeshiquanli');
  const [selectedDetailId, setSelectedDetailId] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('blue-letter');
  const [showPageSwitcher, setShowPageSwitcher] = useState(true);

  // 从URL参数读取当前页面，并在页面变化时更新URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const detailId = params.get('id');
    if (page) {
      setCurrentPage(page);
      if (detailId) {
        setSelectedDetailId(detailId);
      }
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
    } else if (currentPage === 'login' || currentPage === 'register') {
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

  const handleNavigate = (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'book-reader' | 'login' | 'register' | 'case' | 'admin' | 'user-center' | 'test' | 'strategy-companion' | 'report-library' | 'article-center', bookId?: string, caseId?: string) => {
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
    } else {
      setCurrentPage(page);
    }
  };

  const handleNavigateToDetail = (type: 'article' | 'report' | 'topic', id: string) => {
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
        <InsightsPage />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'strategy') {
    return (
      <>
        <StrategyPage />
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
        <BookLibraryPage />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'report-library') {
    return (
      <>
        <ReportLibraryPage />
        <PageSwitcher />
      </>
    );
  }

  // Article Center Page - 文章中心
  if (currentPage === 'article-center') {
    return (
      <>
        <ArticleCenterPage />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'book-reader') {
    return (
      <>
        <BookReaderPage bookId={selectedBookId} />
        <PageSwitcher />
      </>
    );
  }

  if (currentPage === 'my-learning') {
    return (
      <>
        <MyLearningPage />
        <PageSwitcher />
      </>
    );
  }

  // Admin Dashboard - 需要登录验证
  if (currentPage === 'admin') {
    // 检查是否已登录管理员
    const isAdmin = localStorage.getItem('yiyu_is_admin') === 'true';
    
    if (!isAdmin) {
      // 未登录，重定向到登录页
      return (
        <>
          <LoginPage 
            onNavigate={(page) => handleNavigate(page === 'login' ? 'home' : page as any)}
            onLoginSuccess={() => setCurrentPage('home')}
            onAdminLogin={() => {
              localStorage.setItem('yiyu_is_admin', 'true');
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
        <StrategyCompanionPage />
        <PageSwitcher />
      </>
    );
  }

  // Admin Strategy Companion Page - 战略客户后台管理页面
  if (currentPage === 'admin-strategy-companion') {
    // 检查是否已登录管理员
    const isAdmin = localStorage.getItem('yiyu_is_admin') === 'true';
    
    if (!isAdmin) {
      // 未登录，重定向到登录页
      return (
        <>
          <LoginPage 
            onNavigate={(page) => handleNavigate(page === 'login' ? 'home' : page as any)}
            onLoginSuccess={() => setCurrentPage('home')}
            onAdminLogin={() => {
              localStorage.setItem('yiyu_is_admin', 'true');
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
