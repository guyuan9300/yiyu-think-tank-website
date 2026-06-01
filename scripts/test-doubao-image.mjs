#!/usr/bin/env node
/**
 * 一次性测试脚本: 调豆包图像生成 API.
 *
 * 用法 (API Key 不写入文件, 仅通过 env 传):
 *   ARK_API_KEY="ark-..." node scripts/test-doubao-image.mjs
 *
 * 可选: 自定义 model / prompt / size
 *   ARK_API_KEY="..." ARK_IMAGE_MODEL="doubao-seedream-3-0-t2i-250415" \
 *     node scripts/test-doubao-image.mjs "为益语智库文章《XX》生成封面图..."
 *
 * 输出: 调用结果 + 图片下载到 public/test-output/ (.gitignore 已忽略)
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.ARK_API_KEY;
const BASE_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com').replace(/\/$/, '');
const PROMPT = process.argv[2] ||
  '为益语智库文章《组织经营是一个整体》生成封面图。深蓝紫主色 (#16265E 到 #7C3AED), 现代中国风, 抽象象征, 留白多, 不要任何文字, 16:9 横版构图';
const SIZE = process.env.ARK_IMAGE_SIZE || '1024x1024';

if (!API_KEY) {
  console.error('❌ 缺少 ARK_API_KEY 环境变量');
  console.error('   用法: ARK_API_KEY="ark-..." node scripts/test-doubao-image.mjs');
  process.exit(1);
}

// 候选 model ID 顺序: 用户传的 > 主流默认
const MODEL_CANDIDATES = [
  process.env.ARK_IMAGE_MODEL,
  'doubao-seedream-3-0-t2i-250415',
  'doubao-seedream-3.0-t2i',
  'doubao-seedream-2.0-t2i',
  'doubao-image-pro',
].filter(Boolean);

const masked = (s) => s ? `${s.slice(0, 8)}…${s.slice(-4)}` : '';

console.log('========================================');
console.log('  豆包图像生成 · 连通性测试');
console.log('========================================');
console.log(`  Endpoint:  ${BASE_URL}`);
console.log(`  API Key:   ${masked(API_KEY)} (${API_KEY.length} 字符)`);
console.log(`  Size:      ${SIZE}`);
console.log(`  候选模型:  ${MODEL_CANDIDATES.join(' / ')}`);
console.log(`  Prompt:    ${PROMPT.slice(0, 80)}${PROMPT.length > 80 ? '...' : ''}`);
console.log('');

// ============================================================
// 尝试 1: 同步 OpenAI 兼容路径 /api/v3/images/generations
// ============================================================
async function trySyncGeneration(model) {
  const url = `${BASE_URL}/api/v3/images/generations`;
  const body = { model, prompt: PROMPT, size: SIZE, n: 1, response_format: 'url' };

  console.log(`→ [同步] POST ${url}`);
  console.log(`  model: ${model}`);
  const t0 = Date.now();
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - t0;
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (resp.ok) {
    console.log(`  ✅ HTTP ${resp.status} · ${elapsed}ms`);
    const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;
    if (imageUrl) {
      console.log(`  📸 图片 URL: ${imageUrl.slice(0, 80)}${imageUrl.length > 80 ? '...' : ''}`);
      return { ok: true, model, elapsed, imageUrl, raw: data };
    }
    console.log(`  ⚠️  返回成功但没找到 image URL:`);
    console.log(`     ${JSON.stringify(data).slice(0, 400)}`);
    return { ok: false, model, elapsed, raw: data };
  } else {
    console.log(`  ❌ HTTP ${resp.status} · ${elapsed}ms`);
    console.log(`     ${JSON.stringify(data).slice(0, 600)}`);
    return { ok: false, status: resp.status, model, elapsed, raw: data };
  }
}

// ============================================================
// 尝试 2: 异步任务路径 /api/v3/contents/generations/tasks (备选)
// ============================================================
async function tryAsyncTask(model) {
  const url = `${BASE_URL}/api/v3/contents/generations/tasks`;
  const body = { model, content: [{ type: 'text', text: PROMPT }] };

  console.log(`→ [异步] POST ${url}`);
  console.log(`  model: ${model}`);
  const t0 = Date.now();
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!resp.ok) {
    console.log(`  ❌ HTTP ${resp.status} · ${Date.now() - t0}ms`);
    console.log(`     ${JSON.stringify(data).slice(0, 600)}`);
    return { ok: false, status: resp.status };
  }

  const taskId = data?.id || data?.task_id;
  if (!taskId) {
    console.log(`  ⚠️  返回成功但没找到 task_id:`);
    console.log(`     ${JSON.stringify(data).slice(0, 400)}`);
    return { ok: false };
  }
  console.log(`  📋 task_id: ${taskId} · 开始轮询状态...`);

  // 轮询任务状态
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusUrl = `${BASE_URL}/api/v3/contents/generations/tasks/${taskId}`;
    const sr = await fetch(statusUrl, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
    const st = await sr.json().catch(() => ({}));
    const status = st?.status || st?.state;
    console.log(`     [${i + 1}/30] status=${status} (${Date.now() - t0}ms)`);
    if (status === 'succeeded' || status === 'completed') {
      const imageUrl = st?.content?.video_url || st?.result?.url || st?.content?.image_url;
      console.log(`  ✅ 完成: ${JSON.stringify(st).slice(0, 400)}`);
      return { ok: true, model, elapsed: Date.now() - t0, imageUrl, raw: st };
    }
    if (status === 'failed' || status === 'cancelled') {
      console.log(`  ❌ 任务失败: ${JSON.stringify(st).slice(0, 400)}`);
      return { ok: false, raw: st };
    }
  }
  console.log(`  ⏱️  轮询超时 (90s)`);
  return { ok: false };
}

// ============================================================
// 下载图片
// ============================================================
async function downloadImage(imageUrl, model) {
  const outDir = path.join(process.cwd(), 'public', 'test-output');
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `doubao-${model.replace(/[^a-z0-9-]/gi, '_')}-${Date.now()}.jpg`;
  const filepath = path.join(outDir, filename);

  console.log(`\n→ 下载图片到本地...`);
  const resp = await fetch(imageUrl);
  if (!resp.ok) {
    console.log(`  ❌ 下载失败: HTTP ${resp.status}`);
    return null;
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  console.log(`  ✅ 已保存: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`\n🌐 本地浏览器查看 (dev server 必须在跑):`);
  console.log(`   http://localhost:5173/test-output/${filename}`);
  return filepath;
}

// ============================================================
// 主流程
// ============================================================
(async () => {
  let success = null;

  for (const model of MODEL_CANDIDATES) {
    console.log(`\n─── 尝试模型: ${model} ─────────────────────`);
    const syncResult = await trySyncGeneration(model);
    if (syncResult.ok && syncResult.imageUrl) {
      success = syncResult;
      break;
    }
    // 如果是 404 model 错误,跳过尝试下一个
    if (syncResult.status === 404 || (typeof syncResult.raw?.error?.message === 'string'
        && /model.*not.*found/i.test(syncResult.raw.error.message))) {
      console.log(`  ↪️ 模型 ${model} 不存在,尝试下一个`);
      continue;
    }
    // 401/403: 鉴权问题,不再尝试其它模型
    if (syncResult.status === 401 || syncResult.status === 403) {
      console.log(`\n❌ 鉴权失败. 请检查 API Key 是否正确,且开通了图像生成模型 (在火山引擎方舟控制台 > 接入点 / 开通管理)`);
      process.exit(1);
    }
    // 其它错误尝试异步路径
    console.log(`  ↪️ 同步路径失败,改试异步任务路径`);
    const asyncResult = await tryAsyncTask(model);
    if (asyncResult.ok && asyncResult.imageUrl) {
      success = asyncResult;
      break;
    }
  }

  if (success) {
    console.log(`\n========================================`);
    console.log(`  ✅ 测试成功!`);
    console.log(`========================================`);
    console.log(`  实际可用模型: ${success.model}`);
    console.log(`  生成耗时:    ${success.elapsed}ms`);
    if (success.imageUrl?.startsWith('http')) {
      await downloadImage(success.imageUrl, success.model);
    }
  } else {
    console.log(`\n========================================`);
    console.log(`  ❌ 所有候选模型都失败`);
    console.log(`========================================`);
    console.log(`\n下一步:`);
    console.log(`  1. 确认 API Key 是否在火山引擎方舟控制台开通了"图像生成"产品`);
    console.log(`     (有些 key 只能调文本模型, 图像要单独开通)`);
    console.log(`  2. 在控制台 [模型推理] > [接入点管理] 创建一个图像生成接入点`);
    console.log(`     ⟶ 取接入点的 endpoint ID (例: ep-2024xxxxxxxxxxxx)`);
    console.log(`     ⟶ 然后用: ARK_IMAGE_MODEL="ep-..." node scripts/test-doubao-image.mjs`);
    console.log(`  3. 火山引擎方舟图像生成产品文档:`);
    console.log(`     https://www.volcengine.com/docs/82379/1099455`);
    process.exit(1);
  }
})().catch(err => {
  console.error('\n❌ 脚本异常:', err);
  process.exit(1);
});
