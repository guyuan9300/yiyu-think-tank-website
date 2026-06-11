import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { bootstrapFromPgApi, purgeLegacyReports } from './lib/dataService';
import { LangProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <LangProvider>
          <App />
        </LangProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

async function start() {
  try {
    await bootstrapFromPgApi();
    // 新解析机制: 清除旧报告痕迹, 只保留有 Markdown 解读稿的报告(断网时 bootstrap 失败也要清)。
    purgeLegacyReports();
  } catch (e) {
    // 启动数据拉取失败也要把应用渲染出来(读本地镜像降级),绝不白屏。
    console.error('[start] 启动数据初始化失败,降级渲染:', e);
  }
  renderApp();
}

start();
