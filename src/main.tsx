import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { bootstrapFromPgApi, purgeLegacyReports } from './lib/dataService';
import { LangProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root element');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <LangProvider>
          <App />
        </LangProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

async function refreshContentSnapshot() {
  // 新解析机制: 清除旧报告痕迹, 只保留有 Markdown 解读稿的报告(断网时也要先清)。
  // 整段兜底: 后台取数失败也不抛未处理 rejection, 应用已先渲染、读本地镜像降级。
  try {
    purgeLegacyReports();
    await bootstrapFromPgApi();
    purgeLegacyReports();
  } catch (e) {
    console.error('[start] 启动数据初始化失败,降级渲染:', e);
  }
}

function start() {
  // 先渲染再异步取数: 根治弱网/代理下白屏(渲染不阻塞在网络上);
  // 渲染期异常由 ErrorBoundary 兜底, 取数异常由 refreshContentSnapshot 内 catch 兜底。
  renderApp();
  void refreshContentSnapshot();
}

start();
