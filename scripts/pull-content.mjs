// 线上 → 本地 dev: 把 yiyu.love 的真实文章/报告快照拉到本地缓存文件。
// dev server (vite-plugin-admin-ai.mjs) 会优先读这个缓存来服务 /api/content-snapshot
// 与 /api/admin-ai/list-articles —— 于是本地预览有真内容, 也能在真文章上跑 AI 功能。
//
// 用法(在能访问 yiyu.love 的机器上跑, 比如你本机):
//   node scripts/pull-content.mjs
//   SOURCE_BASE=https://yiyu.love node scripts/pull-content.mjs   # 同上, 可换源
//
// 产物: .content-cache/content-snapshot.json (已 gitignore, 不入库)
// 拉完重启 / 刷新 dev server 即可看到真实文章与报告。

import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_BASE = (process.env.SOURCE_BASE || 'https://yiyu.love').replace(/\/$/, '');
const OUT_DIR = path.resolve(process.cwd(), '.content-cache');
const OUT_FILE = path.join(OUT_DIR, 'content-snapshot.json');

async function main() {
  const url = `${SOURCE_BASE}/api/content-snapshot`;
  console.log(`拉取线上内容快照: ${url}`);

  // 兜底: 若域名被 DNS 劫持/不可达, 可用 SOURCE_IP + SOURCE_HOST 直连真实 IP。
  //   SOURCE_IP=134.175.96.251 SOURCE_HOST=yiyu.love node scripts/pull-content.mjs
  const SOURCE_IP = process.env.SOURCE_IP || '';
  const SOURCE_HOST = process.env.SOURCE_HOST || '';
  let res;
  try {
    if (SOURCE_IP) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // IP 直连证书 CN 不匹配, 仅本地拉取用
      res = await fetch(`https://${SOURCE_IP}/api/content-snapshot`, {
        cache: 'no-store',
        headers: SOURCE_HOST ? { Host: SOURCE_HOST } : {},
      });
    } else {
      res = await fetch(url, { cache: 'no-store' });
    }
  } catch (e) {
    console.error(`\n❌ 无法访问内容源: ${e.message}`);
    console.error('   若是域名 DNS 问题, 可直连真实 IP:');
    console.error('   SOURCE_IP=134.175.96.251 SOURCE_HOST=yiyu.love node scripts/pull-content.mjs');
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`\n❌ ${url} 返回 HTTP ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  if (!data || data.ok === false) {
    console.error('\n❌ 快照内容无效 (ok=false 或空)');
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(data, null, 2), 'utf8');

  const n = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
  console.log('\n✅ 已写入本地缓存:', path.relative(process.cwd(), OUT_FILE));
  console.log(`   文章(insights) ${n('insights')} · 报告(reports) ${n('reports')} · 书籍 ${n('books')} · 方法论 ${n('methodologies')}`);
  console.log('\n现在刷新 / 重启本地 dev server, 文章中心与报告库就会显示真实内容。');
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
