#!/usr/bin/env node
// scripts/capture-hero-gifs.mjs
//
// 录制 Hero 三个 scene 动画 → 输出 3 张 GIF (1280×958 @ 24fps)
//
// 前置 (一次性):
//   1) dev server 已跑:  npm run dev  (默认 http://localhost:5173)
//   2) playwright 内核:  npx playwright install chromium
//   3) ffmpeg 已装:      brew install ffmpeg  (macOS)
//
// 用法:
//   node scripts/capture-hero-gifs.mjs
//
// 可选环境变量:
//   HERO_URL=http://localhost:5173      dev server 根地址
//   OUT_DIR=/path/to/output             输出目录, 默认 ./gifs-out
//
// 实现原理:
//   - playwright chromium headless 在 1280×958 视口加载 ?page=hero-capture&scene=<id>
//   - SceneCapturePage 渲染单张 WindowCard (无 Header / 无 timeline / 无 caption)
//   - context.recordVideo 录 webm, 持续到 dwellMs + buffer 结束
//   - ffmpeg 把 webm 转成 GIF, 用 palettegen + paletteuse 保持文件大小可控

import { chromium } from 'playwright';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

const URL_BASE = process.env.HERO_URL || 'http://localhost:5173';
const OUT_DIR = process.env.OUT_DIR || path.resolve(REPO, 'gifs-out');
const TMP_DIR = path.resolve(REPO, '.tmp-hero-capture');

const VIEWPORT_W = 1280;
const VIEWPORT_H = 958; // WindowCard 标题栏 ~38px + 场景 920px
const FPS = 24;

const SCENES = [
  { id: 'calendar',  dwellMs: 3200, out: 'hero-calendar.gif',  label: '任务月历' },
  { id: 'workspace', dwellMs: 7000, out: 'hero-workspace.gif', label: '客户工作台' },
  { id: 'growth',    dwellMs: 4700, out: 'hero-growth.gif',    label: '成长中心' },
];

function log(msg) {
  process.stdout.write(`[capture-hero-gifs] ${msg}\n`);
}

function which(cmd) {
  const r = spawnSync('which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

async function preflightChecks() {
  if (!which('ffmpeg')) {
    log('错误: 找不到 ffmpeg。macOS 装法: brew install ffmpeg');
    process.exit(1);
  }
  try {
    const res = await fetch(`${URL_BASE}/`);
    if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    log(`错误: dev server 不通 (${URL_BASE}): ${err.message}`);
    log('   请在另一终端先跑: npm run dev');
    process.exit(1);
  }
}

async function captureOne(scene) {
  log(`录制 ${scene.id} (${scene.label}, dwell=${scene.dwellMs}ms)`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP_DIR, size: { width: VIEWPORT_W, height: VIEWPORT_H } },
  });
  const page = await context.newPage();

  // 录制起点 = context.newPage() 完成。t_record_start 记下来后面用来 -ss 砍掉前面 mount 的空帧
  const tRecordStart = Date.now();

  const targetUrl = `${URL_BASE}/?page=hero-capture&scene=${scene.id}`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  // 等 SceneCapturePage 设置 __YIYU_CAPTURE_READY__ = true (双 rAF 之后)
  await page.waitForFunction(
    () => Boolean(window.__YIYU_CAPTURE_READY__),
    null,
    { timeout: 20_000 },
  );
  const tReady = Date.now();
  // 给场景内 useEffect (IntersectionObserver / 计时器) 启动一帧的余量
  await page.waitForTimeout(50);

  // 视频里 ready 时间点 (秒): 用来 ffmpeg -ss 砍掉前面的 mount 部分
  const skipSec = Math.max(0, (tReady - tRecordStart) / 1000 - 0.05);

  const video = page.video();
  if (!video) {
    throw new Error('video() is null — recordVideo did not initialize');
  }

  // 录完整段动画 (+ 400ms 末尾缓冲)
  await page.waitForTimeout(scene.dwellMs + 400);

  await context.close();
  const videoPath = await video.path();
  await browser.close();

  log(`  webm: ${path.basename(videoPath)} (skip ${skipSec.toFixed(2)}s)`);

  // ffmpeg: 砍掉前面 mount, 24fps + palettegen, 高质量 dither
  const outPath = path.resolve(OUT_DIR, scene.out);
  const durationSec = ((scene.dwellMs + 300) / 1000).toFixed(2);

  const args = [
    '-y',
    '-ss', skipSec.toFixed(3),
    '-t', durationSec,
    '-i', videoPath,
    '-vf', `fps=${FPS},scale=${VIEWPORT_W}:${VIEWPORT_H}:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
    '-loop', '0',
    outPath,
  ];
  const r = spawnSync('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    log('  ffmpeg 失败:');
    process.stderr.write(r.stderr.toString());
    process.exit(1);
  }

  const fileStat = await stat(outPath);
  log(`  gif : ${outPath} (${(fileStat.size / 1024 / 1024).toFixed(2)} MB)`);

  // 同步输出 MP4 (H.264 + yuv420p + faststart, 手机/微信/网页 video 通吃)
  const mp4Path = path.resolve(OUT_DIR, scene.out.replace(/\.gif$/, '.mp4'));
  const mp4Args = [
    '-y',
    '-ss', skipSec.toFixed(3),
    '-t', durationSec,
    '-i', videoPath,
    '-vf', `fps=${FPS},scale=${VIEWPORT_W}:${VIEWPORT_H}:flags=lanczos`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'slow',
    '-crf', '22',
    '-movflags', '+faststart',
    '-an',
    mp4Path,
  ];
  const r2 = spawnSync('ffmpeg', mp4Args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r2.status !== 0) {
    log('  ffmpeg mp4 失败:');
    process.stderr.write(r2.stderr.toString());
    process.exit(1);
  }
  const mp4Stat = await stat(mp4Path);
  log(`  mp4 : ${mp4Path} (${(mp4Stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  await preflightChecks();
  await mkdir(OUT_DIR, { recursive: true });
  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  log(`URL : ${URL_BASE}`);
  log(`Out : ${OUT_DIR}`);
  log(`Size: ${VIEWPORT_W}×${VIEWPORT_H} @ ${FPS}fps`);
  log('');

  for (const scene of SCENES) {
    await captureOne(scene);
  }

  // 清掉中间 webm
  await rm(TMP_DIR, { recursive: true, force: true });

  log('');
  log('全部完成。三个 GIF 在:');
  for (const s of SCENES) {
    log(`  ${path.resolve(OUT_DIR, s.out)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
