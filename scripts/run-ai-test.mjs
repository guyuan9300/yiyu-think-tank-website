// AI 功能实测脚本 —— 对本地 dev server 跑"封面+插图"和"综述+总结"各一篇, 打印结果。
// 必须在"能连豆包(ark.cn)"的网络 + dev server 已起 的环境跑(你自己的终端)。
//
// 用法:
//   1) 先在一个终端起 dev:   npm run dev
//   2) 另开终端跑本脚本:      node scripts/run-ai-test.mjs
//   可选: 指定文章 id          node scripts/run-ai-test.mjs <articleId>
//   可选: 换端口              BASE=http://localhost:5174 node scripts/run-ai-test.mjs

const BASE = (process.env.BASE || 'http://localhost:5173').replace(/\/$/, '');
const argId = process.argv[2];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(path) {
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
async function jpost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

async function pollTask(taskId, label) {
  process.stdout.write(`  [${label}] 运行中`);
  for (let i = 0; i < 120; i++) {
    await sleep(3000);
    const t = await jget(`/api/admin-ai/task/${taskId}`);
    process.stdout.write(`.(${t.done || 0}/${t.total || 0})`);
    if (t.status !== 'running') {
      console.log(`\n  [${label}] 结束: status=${t.status} done=${t.done} errors=${t.errors}`);
      (t.log || []).slice(-6).forEach((l) => console.log(`     · ${l}`));
      return t;
    }
  }
  console.log(`\n  [${label}] 超时(6分钟未结束)`);
}

async function main() {
  console.log(`== AI 实测 @ ${BASE} ==\n`);

  // 1. 选一篇文章
  const list = await jget('/api/admin-ai/list-articles');
  const articles = list.articles || [];
  console.log(`文章列表: 共 ${articles.length} 篇`);
  if (articles.length === 0) throw new Error('无文章 —— 先在本机 node scripts/pull-content.mjs 拉内容, 并重启 dev');
  const target = argId ? articles.find((a) => a.id === argId) : articles[0];
  if (!target) throw new Error(`找不到 id=${argId}`);
  console.log(`选中: ${target.id}  《${target.title}》\n`);

  // 2. 封面 + 插图
  console.log('① 封面 + 插图 生成 (/regenerate)');
  try {
    const { taskId } = await jpost('/api/admin-ai/regenerate', { ids: [target.id] });
    await pollTask(taskId, '生图');
  } catch (e) { console.log('  ❌ 生图失败:', e.message); }

  // 3. 综述 + 总结
  console.log('\n② 综述 + 总结 生成 (/generate-summaries)');
  try {
    const { taskId } = await jpost('/api/admin-ai/generate-summaries', { ids: [target.id] });
    await pollTask(taskId, '综述总结');
  } catch (e) { console.log('  ❌ 综述总结失败:', e.message); }

  console.log(`\n== 完成。刷新这篇文章详情页查看效果: ==`);
  console.log(`${BASE}/?page=article&id=${encodeURIComponent(target.id)}`);
}

main().catch((e) => { console.error('\n致命错误:', e.message); process.exit(1); });
