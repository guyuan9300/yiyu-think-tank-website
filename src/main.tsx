import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { bootstrapFromPgApi, purgeLegacyReports } from './lib/dataService';
import { LangProvider } from './lib/i18n';

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Root render failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#f7f3ea] px-6 py-16 text-[#1f2f3f]">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold text-[#2c6fd0]">益语智库</p>
            <h1 className="mt-4 font-serif text-4xl font-semibold">页面正在恢复</h1>
            <p className="mt-5 text-base leading-8 text-[#53606f]">
              当前浏览器环境加载页面时遇到异常。请刷新页面重试，或稍后再次访问。
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root element');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <LangProvider>
          <App />
        </LangProvider>
      </RootErrorBoundary>
    </React.StrictMode>,
  );
}

async function refreshContentSnapshot() {
  // 新解析机制: 清除旧报告痕迹, 只保留有 Markdown 解读稿的报告(断网时也要先清)。
  purgeLegacyReports();
  await bootstrapFromPgApi();
  purgeLegacyReports();
}

function start() {
  renderApp();
  void refreshContentSnapshot();
}

start();
