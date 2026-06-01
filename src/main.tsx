import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { bootstrapFromPgApi, purgeLegacyReports } from './lib/dataService';
import { LangProvider } from './lib/i18n';

async function start() {
  await bootstrapFromPgApi();
  // 新解析机制: 清除旧报告痕迹, 只保留有 Markdown 解读稿的报告(断网时 bootstrap 失败也要清)。
  purgeLegacyReports();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <LangProvider>
        <App />
      </LangProvider>
    </React.StrictMode>,
  );
}

start();
