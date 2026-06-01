// 内容同步脚本 —— 把"原有库"的文章(insights)和报告(reports)同步进"现在的库"。
//
// 原理: 走应用层, 不碰 psql。
//   1. GET  <源>/api/content-snapshot        → 拿原有 insights / reports
//   2. GET  <目标>/api/content-snapshot       → 拿目标现有内容(可能为空)
//   3. 按 id 合并(源覆盖同 id, 保留目标独有, 绝不删目标内容)
//   4. POST <目标>/api/content-sync {key,data} → UPSERT 进目标库
//
// 安全:
//   - 默认 DRY-RUN(只打印, 不写)。确认无误后加 --apply 才真正写入。
//   - 合并保留目标已有内容(content-sync 会删"不在列表里的行", 所以发"并集"避免误删)。
//   - 同步前建议先在目标库 pg_dump 备份。
//
// 用法(在能访问两个库 API 的环境/服务器上跑):
//   SOURCE_BASE=https://yiyu.love \
//   TARGET_BASE=http://127.0.0.1:8790 \
//   node scripts/sync-content.mjs                 # dry-run, 看会同步多少
//
//   ...同上... node scripts/sync-content.mjs --apply   # 真正写入目标库
//
//   可选: KEYS=insights,reports (默认就这两个; 可加 books,methodologies)

const SOURCE_BASE = (process.env.SOURCE_BASE || 'https://yiyu.love').replace(/\/$/, '');
const TARGET_BASE = (process.env.TARGET_BASE || '').replace(/\/$/, '');
const APPLY = process.argv.includes('--apply');
const KEYS = (process.env.KEYS || 'insights,reports')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

// 内存 key → content-sync 的 key (见 pg-content-api.mjs syncKey 映射)
const SYNC_KEY = {
  insights: 'yiyu_insights',
  reports: 'yiyu_reports',
  books: 'yiyu_books',
  methodologies: 'yiyu_methodologies',
};

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function getSnapshot(base, label) {
  const url = `${base}/api/content-snapshot`;
  let res;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (e) {
    die(`${label} 拉取失败 (${url}): ${e.message}`);
  }
  if (!res.ok) die(`${label} 返回 HTTP ${res.status} (${url})`);
  const data = await res.json();
  if (!data || data.ok === false) die(`${label} 快照无效 (${url})`);
  return data;
}

// 源覆盖同 id, 保留目标独有 —— 返回并集 + 统计
function mergeById(targetArr, sourceArr) {
  const map = new Map();
  for (const it of targetArr || []) if (it && it.id) map.set(it.id, it);
  let added = 0;
  let updated = 0;
  for (const it of sourceArr || []) {
    if (!it || !it.id) continue;
    if (map.has(it.id)) updated += 1;
    else added += 1;
    map.set(it.id, it); // 源覆盖
  }
  return { merged: [...map.values()], added, updated };
}

async function postSync(key, data) {
  const url = `${TARGET_BASE}/api/content-sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data }),
  });
  if (!res.ok) die(`写入失败 ${key} → HTTP ${res.status} (${await res.text().catch(() => '')})`);
  return res.json().catch(() => ({}));
}

async function main() {
  console.log('========== 内容同步 ==========');
  console.log(`源  SOURCE_BASE = ${SOURCE_BASE}`);
  console.log(`目标 TARGET_BASE = ${TARGET_BASE || '(未设置!)'}`);
  console.log(`同步表 KEYS = ${KEYS.join(', ')}`);
  console.log(`模式 = ${APPLY ? '✍️  APPLY (真正写入)' : '🔍 DRY-RUN (只预览, 加 --apply 才写)'}`);
  console.log('');

  if (!TARGET_BASE) die('请用环境变量 TARGET_BASE 指定"现在的数据库"的 content API 地址, 例如 TARGET_BASE=http://127.0.0.1:8790');
  for (const k of KEYS) if (!SYNC_KEY[k]) die(`未知的表 key: ${k} (支持: ${Object.keys(SYNC_KEY).join(', ')})`);

  const src = await getSnapshot(SOURCE_BASE, '源');
  const tgt = await getSnapshot(TARGET_BASE, '目标');

  for (const k of KEYS) {
    const { merged, added, updated } = mergeById(tgt[k], src[k]);
    const srcN = (src[k] || []).length;
    const tgtN = (tgt[k] || []).length;
    console.log(`【${k}】源 ${srcN} 条 · 目标原有 ${tgtN} 条 → 合并后 ${merged.length} 条 (新增 ${added}, 更新 ${updated})`);
    if (APPLY) {
      await postSync(SYNC_KEY[k], merged);
      console.log(`   ✅ 已写入目标库 (${SYNC_KEY[k]})`);
    }
  }

  console.log('');
  if (APPLY) console.log('✅ 同步完成。建议刷新目标站点 /api/content-snapshot 核对。');
  else console.log('🔍 DRY-RUN 结束。确认数字无误后, 重跑并加 --apply 真正写入。');
}

main().catch((e) => die(e.stack || e.message));
