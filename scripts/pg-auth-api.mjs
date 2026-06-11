import http from 'node:http';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import tencentcloud from 'tencentcloud-sdk-nodejs';
import { DEFAULT_STRATEGY_PROJECTS } from './strategy-companion-seeds.mjs';

function loadYiyuTongSiteMap() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const candidates = [
    path.resolve(currentDir, 'config', 'yiyuTongSiteMap.json'),
    path.resolve(currentDir, '../src/config/yiyuTongSiteMap.json'),
    path.resolve(process.cwd(), 'src/config/yiyuTongSiteMap.json'),
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return JSON.parse(fsSync.readFileSync(candidate, 'utf8'));
    }
  }

  return {
    version: 'fallback',
    tour: {
      publicOrder: ['home', 'insights', 'learning', 'strategy', 'about'],
      finalPageId: 'about',
    },
    rules: {
      representativeDetailSelection: 'latest_published',
      returnAfterRepresentativeVisit: true,
      stopOnPermissionDenied: true,
      stopOnMissingTarget: true,
    },
    completionRules: {},
    pages: {},
  };
}

const YIYU_TONG_SITE_MAP = loadYiyuTongSiteMap();

const PORT = Number(process.env.PG_AUTH_API_PORT || 8791);
const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || '',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'postgres',
  max: 10,
});

const CODE_TTL_SECONDS = Number(process.env.AUTH_CODE_TTL_SECONDS || 300);
const SEND_INTERVAL_SECONDS = Number(process.env.AUTH_SEND_INTERVAL_SECONDS || 60);
const MAX_PER_TARGET_PER_DAY = Number(process.env.AUTH_MAX_PER_TARGET_PER_DAY || 10);
const MAX_VERIFY_RETRY = Number(process.env.AUTH_MAX_VERIFY_RETRY || 5);
const DEFAULT_ADMIN_EMAILS = new Set(
  String(process.env.AUTH_ADMIN_EMAILS || 'guyuan9300@gmail.com')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name',
};

const PAYMENT_PLANS = {
  monthly_trial: { id: 'monthly_trial', name: '月包试用', amountFen: 1980, currency: 'CNY', durationDays: 30 },
  yearly: { id: 'yearly', name: '年包会员', amountFen: 19800, currency: 'CNY', durationDays: 365 },
};

const PAYMENT_PREP_CHECKS = [
  { env: 'WECHAT_PAY_MCHID', label: '商户号' },
  { env: 'WECHAT_PAY_APPID', label: 'AppID' },
  { env: 'WECHAT_PAY_MCH_SERIAL_NO', label: '商户证书序列号' },
  { env: 'WECHAT_PAY_PRIVATE_KEY', label: '商户私钥' },
  { env: 'WECHAT_PAY_API_V3_KEY', label: 'API v3 密钥' },
  { env: 'WECHAT_PAY_PLATFORM_CERT', label: '微信支付平台证书' },
  { env: 'WECHAT_PAY_NOTIFY_URL', label: '支付结果通知地址' },
  { env: 'WECHAT_PAY_H5_DOMAIN', label: 'H5 支付域名' },
  { env: 'WECHAT_PAY_RETURN_URL', label: '支付完成回跳地址' },
];

const SmsClient = tencentcloud.sms.v20210111.Client;
const SesClient = tencentcloud.ses.v20201002.Client;
let smsClient = null;
let sesClient = null;

function initSmsClient() {
  const sid = process.env.TC_SECRET_ID;
  const sk = process.env.TC_SECRET_KEY;
  if (!sid || !sk) return null;
  smsClient = new SmsClient({
    credential: { secretId: sid, secretKey: sk },
    region: process.env.TC_SMS_REGION || 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } },
  });
  return smsClient;
}

function buildMailer() {
  const host = process.env.AUTH_SMTP_HOST;
  const user = process.env.AUTH_SMTP_USER;
  const pass = process.env.AUTH_SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.AUTH_SMTP_PORT || 465),
    secure: String(process.env.AUTH_SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

function initSesClient() {
  const sid = process.env.TC_SECRET_ID;
  const sk = process.env.TC_SECRET_KEY;
  if (!sid || !sk) return null;
  sesClient = new SesClient({
    credential: { secretId: sid, secretKey: sk },
    region: process.env.TC_SES_REGION || 'ap-hongkong',
    profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } },
  });
  return sesClient;
}

const mailer = buildMailer();
const PUBLIC_SITE_URL = (process.env.YIYU_SITE_URL || 'https://www.yiyu.love/').replace(/\/?$/, '/');
const SITE_PUBLIC_ROOT = process.env.YIYU_SITE_ROOT || '/var/www/yiyu-site';
const ADMIN_UPLOAD_ROOT = process.env.YIYU_UPLOAD_ROOT || '/var/www/yiyu-site/uploads';
const RELEASE_ASSET_ROOT = process.env.YIYU_RELEASE_ASSET_ROOT || '/srv/yiyu-release-assets';
const RELEASE_DOWNLOAD_TTL_SECONDS = Number(process.env.YIYU_RELEASE_DOWNLOAD_TTL_SECONDS || 600);
const TOS_BUCKET = process.env.YIYU_TOS_BUCKET || '';
const TOS_REGION = process.env.YIYU_TOS_REGION || 'cn-beijing';
const TOS_ENDPOINT = (process.env.YIYU_TOS_ENDPOINT || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const TOS_PUBLIC_BASE_URL = (process.env.YIYU_TOS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const TOS_ACCESS_KEY_ID = process.env.YIYU_TOS_ACCESS_KEY_ID || '';
const TOS_SECRET_ACCESS_KEY = process.env.YIYU_TOS_SECRET_ACCESS_KEY || '';
const TOS_RELEASE_PREFIX = (process.env.YIYU_TOS_RELEASE_PREFIX || 'desktop').replace(/^\/+|\/+$/g, '');
const TOSUTIL_BIN = process.env.YIYU_TOSUTIL_BIN || '';
const TOSUTIL_HOME = process.env.YIYU_TOSUTIL_HOME || '';
const WORKBENCH_CLOUD_API_BASE_URL = (process.env.YIYU_WORKBENCH_CLOUD_API_BASE_URL || '').replace(/\/$/, '');
const WORKBENCH_CLOUD_API_TOKEN = process.env.YIYU_WORKBENCH_CLOUD_API_TOKEN || '';
const AI_GENERATED_ROOT = process.env.YIYU_AI_GENERATED_ROOT || path.join(SITE_PUBLIC_ROOT, 'ai-generated');
const AI_ARTICLE_ROOT = path.join(AI_GENERATED_ROOT, 'articles');
const AI_MANIFEST_PATH = path.join(AI_GENERATED_ROOT, 'manifest.json');
const ARK_BASE_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com').replace(/\/$/, '');
const ARK_MODEL = process.env.ARK_MODEL || 'doubao-seed-2-0-lite-260215';
const ARK_TEXT_MODEL = process.env.ARK_TEXT_MODEL || ARK_MODEL;
const ARK_IMAGE_MODEL = process.env.ARK_IMAGE_MODEL || 'doubao-seedream-4-0-250828';
const YIYU_TONG_ARK_MODEL = process.env.YIYU_TONG_ARK_MODEL || 'doubao-seed-2-0-lite-260215';
const AI_PREFILL_TOPIC_OPTIONS = ['战略', '业务设计', '组织', 'AI 技术'];
const execFileAsync = promisify(execFile);
let ocrCapabilityPromise = null;
const WECHAT_API_BASE = 'https://api.mch.weixin.qq.com';
const adminAiTasks = new Map();

function isArkReady() {
  return Boolean(process.env.ARK_API_KEY && ARK_MODEL);
}

async function getOcrCapabilities() {
  if (!ocrCapabilityPromise) {
    ocrCapabilityPromise = (async () => {
      const result = {
        binaryReady: false,
        chineseReady: false,
        languages: new Set(),
      };
      try {
        const langs = await execFileAsync('tesseract', ['--list-langs'], {
          maxBuffer: 8 * 1024 * 1024,
        });
        const lines = String(langs.stdout || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => !/^list of available languages/i.test(line));
        result.binaryReady = true;
        result.languages = new Set(lines);
        result.chineseReady = result.languages.has('chi_sim');
      } catch {
        // OCR tool is optional; fallback will be handled later.
      }
      return result;
    })();
  }
  return ocrCapabilityPromise;
}

function readPemValue(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

async function readPemFromEnv(primaryEnv, pathEnv) {
  const direct = readPemValue(process.env[primaryEnv]);
  if (direct) return direct;
  const filePath = String(process.env[pathEnv] || '').trim();
  if (!filePath) return '';
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function envConfigured(key) {
  if (key === 'WECHAT_PAY_PRIVATE_KEY') {
    return Boolean(readPemValue(process.env.WECHAT_PAY_PRIVATE_KEY) || String(process.env.WECHAT_PAY_PRIVATE_KEY_PATH || '').trim());
  }
  if (key === 'WECHAT_PAY_MCH_SERIAL_NO') {
    return Boolean(
      String(process.env.WECHAT_PAY_MCH_SERIAL_NO || '').trim()
      || readPemValue(process.env.WECHAT_PAY_MCH_CERT)
      || String(process.env.WECHAT_PAY_MCH_CERT_PATH || '').trim()
    );
  }
  if (key === 'WECHAT_PAY_PLATFORM_CERT') {
    return Boolean(
      readPemValue(process.env.WECHAT_PAY_PLATFORM_CERT)
      || String(process.env.WECHAT_PAY_PLATFORM_CERT_PATH || '').trim()
      || (
        String(process.env.WECHAT_PAY_MCHID || '').trim()
        && String(process.env.WECHAT_PAY_APPID || '').trim()
        && (
          String(process.env.WECHAT_PAY_MCH_SERIAL_NO || '').trim()
          || readPemValue(process.env.WECHAT_PAY_MCH_CERT)
          || String(process.env.WECHAT_PAY_MCH_CERT_PATH || '').trim()
        )
        && (readPemValue(process.env.WECHAT_PAY_PRIVATE_KEY) || String(process.env.WECHAT_PAY_PRIVATE_KEY_PATH || '').trim())
        && String(process.env.WECHAT_PAY_API_V3_KEY || '').trim()
      )
    );
  }
  return Boolean(String(process.env[key] || '').trim());
}

function safeTopicArray(input) {
  const list = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[、,，/｜|]/)
      : [];
  return Array.from(new Set(
    list
      .map((item) => safeText(item))
      .filter((item) => AI_PREFILL_TOPIC_OPTIONS.includes(item))
  ));
}

function resolveSiteFilePath(input) {
  const raw = safeText(input);
  if (!raw) {
    throw new Error('缺少可解析的文件地址');
  }

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    pathname = new URL(raw).pathname;
  }

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  if (!pathname.startsWith('/uploads/') && !pathname.startsWith('/docs/')) {
    throw new Error('当前仅支持解析站内已上传的文件');
  }
  if (pathname.startsWith('/uploads/')) {
    return path.join(ADMIN_UPLOAD_ROOT, pathname.replace(/^\/uploads\/+/, ''));
  }
  return path.join(SITE_PUBLIC_ROOT, pathname.replace(/^\/+/, ''));
}

async function ensureReadableFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error('未找到可解析的文件，请先上传内容文件');
  }
}

function normalizeExtractedText(input) {
  return String(input || '')
    .replace(/\r/g, '')
    .replace(/\u0000/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtmlTags(input) {
  return normalizeExtractedText(
    String(input || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function decodeXmlEntities(input) {
  return String(input || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)));
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripXmlToText(input) {
  return normalizeExtractedText(
    String(input || '')
      .replace(/<w:tab\/>/g, ' ')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function parseDocxRelationships(input) {
  const relMap = new Map();
  const xml = String(input || '');
  const regex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
  for (const match of xml.matchAll(regex)) {
    relMap.set(match[1], decodeXmlEntities(match[2]).replace(/\\/g, '/'));
  }
  return relMap;
}

function parseDocxNumbering(input) {
  const xml = String(input || '');
  const abstractLevelMap = new Map();

  for (const abstractMatch of xml.matchAll(/<w:abstractNum\b[\s\S]*?w:abstractNumId="([^"]+)"[\s\S]*?<\/w:abstractNum>/g)) {
    const abstractId = abstractMatch[1];
    const block = abstractMatch[0];
    const levelMap = new Map();

    for (const levelMatch of block.matchAll(/<w:lvl\b[\s\S]*?w:ilvl="([^"]+)"[\s\S]*?<w:numFmt\b[^>]*w:val="([^"]+)"/g)) {
      levelMap.set(levelMatch[1], String(levelMatch[2] || '').trim().toLowerCase());
    }

    abstractLevelMap.set(abstractId, levelMap);
  }

  const numberingMap = new Map();
  for (const numMatch of xml.matchAll(/<w:num\b[\s\S]*?w:numId="([^"]+)"[\s\S]*?<w:abstractNumId\b[^>]*w:val="([^"]+)"/g)) {
    const numId = numMatch[1];
    const abstractId = numMatch[2];
    numberingMap.set(numId, abstractLevelMap.get(abstractId) || new Map());
  }

  return numberingMap;
}

function getDocxParagraphListTag(paragraphXml, numberingMap) {
  const xml = String(paragraphXml || '');
  const numId = xml.match(/<w:numId\b[^>]*w:val="([^"]+)"/)?.[1] || '';
  if (!numId) return '';

  const level = xml.match(/<w:ilvl\b[^>]*w:val="([^"]+)"/)?.[1] || '0';
  const format = numberingMap.get(numId)?.get(level) || numberingMap.get(numId)?.get('0') || '';
  if (!format) return 'ol';
  return format === 'bullet' ? 'ul' : 'ol';
}

async function extractDocxMediaAsset(filePath, target, mediaCache) {
  const normalizedTarget = String(target || '')
    .replace(/^(\.\.\/)+/g, '')
    .replace(/^word\//, '')
    .trim();

  if (!normalizedTarget.startsWith('media/')) {
    return '';
  }

  if (mediaCache.has(normalizedTarget)) {
    return mediaCache.get(normalizedTarget) || '';
  }

  const ext = path.extname(normalizedTarget).toLowerCase() || '.bin';
  const outputDir = path.join(ADMIN_UPLOAD_ROOT, 'ai-imports', 'docx');
  await fs.mkdir(outputDir, { recursive: true });

  const outputName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const outputPath = path.join(outputDir, outputName);

  const { stdout } = await execFileAsync('unzip', ['-p', filePath, `word/${normalizedTarget}`], {
    encoding: 'buffer',
    maxBuffer: 32 * 1024 * 1024,
  });
  await fs.writeFile(outputPath, stdout);

  const publicUrl = `/uploads/ai-imports/docx/${outputName}`;
  mediaCache.set(normalizedTarget, publicUrl);
  return publicUrl;
}

function wrapInlineMarks(text, runXml) {
  let html = escapeHtml(text).replace(/\n/g, '<br />');
  const fontSizeMatch = String(runXml || '').match(/<w:sz[^>]+w:val="(\d+)"/);
  const fontSizeHalfPoints = fontSizeMatch ? Number.parseInt(fontSizeMatch[1], 10) : 0;
  const fontSizePx = fontSizeHalfPoints > 0
    ? Math.max(20, Math.round((fontSizeHalfPoints / 2) * (96 / 72)))
    : 0;
  if (/<w:b(?:\s|\/|>)/.test(runXml)) html = `<strong>${html}</strong>`;
  if (/<w:i(?:\s|\/|>)/.test(runXml)) html = `<em>${html}</em>`;
  if (/<w:u(?:\s|\/|>)/.test(runXml)) html = `<u>${html}</u>`;
  if (fontSizePx) html = `<span style="font-size: ${fontSizePx}px">${html}</span>`;
  return html;
}

async function extractDocxInlineHtml(fragment, relMap, filePath, mediaCache) {
  const parts = [];
  const tokenRegex = /<w:hyperlink\b[\s\S]*?<\/w:hyperlink>|<w:r\b[\s\S]*?<\/w:r>|<w:br\s*\/>/g;

  for (const match of String(fragment || '').matchAll(tokenRegex)) {
    const token = match[0];
    if (/^<w:br/i.test(token)) {
      parts.push('<br />');
      continue;
    }

    if (/^<w:hyperlink/i.test(token)) {
      const relId = token.match(/r:id="([^"]+)"/)?.[1] || '';
      const href = relMap.get(relId) || '';
      const inner = await extractDocxInlineHtml(token, relMap, filePath, mediaCache);
      if (!inner) continue;
      parts.push(href ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner);
      continue;
    }

    const text = decodeXmlEntities(
      (token.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [])
        .map((item) => item.replace(/^<w:t[^>]*>|<\/w:t>$/g, ''))
        .join('')
    );
    const runText = text || (token.includes('<w:tab/>') ? ' ' : '');
    if (runText.trim()) {
      parts.push(wrapInlineMarks(runText, token));
    }

    const imageEmbedIds = Array.from(token.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)).map((item) => item[1]).filter(Boolean);
    for (const embedId of imageEmbedIds) {
      const target = relMap.get(embedId) || '';
      const imageUrl = target ? await extractDocxMediaAsset(filePath, target, mediaCache) : '';
      if (imageUrl) {
        parts.push(`<img src="${escapeHtml(imageUrl)}" alt="" />`);
      }
    }
  }

  return parts.join('');
}

function getDocxParagraphStyle(paragraphXml) {
  return String(paragraphXml.match(/<w:pStyle[^>]+w:val="([^"]+)"/)?.[1] || '').trim();
}

function getDocxParagraphMaxFontSize(paragraphXml) {
  const matches = Array.from(String(paragraphXml || '').matchAll(/<w:sz[^>]+w:val="(\d+)"/g));
  const sizes = matches
    .map((match) => Number.parseInt(match[1], 10))
    .filter((value) => Number.isFinite(value));
  return sizes.length ? Math.max(...sizes) : 0;
}

function docxParagraphHasBold(paragraphXml) {
  return /<w:b(?:\s|\/|>)/.test(String(paragraphXml || ''));
}

function getDocxParagraphFontSizePx(paragraphXml, paragraphKind) {
  const maxFontSize = getDocxParagraphMaxFontSize(paragraphXml);
  if (paragraphKind === 'blank') return 0;
  if (!maxFontSize) {
    if (paragraphKind === 'h2') return 34;
    if (paragraphKind === 'h3') return 28;
    if (paragraphKind === 'h4') return 24;
    return 20;
  }
  const px = Math.round((maxFontSize / 2) * (96 / 72));
  if (paragraphKind === 'h2') return Math.max(34, px);
  if (paragraphKind === 'h3') return Math.max(28, px);
  if (paragraphKind === 'h4') return Math.max(24, px);
  return Math.max(20, px);
}

function isImageOnlyHtml(input) {
  const normalized = String(input || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .trim();
  return /^<img\b[\s\S]*?>$/i.test(normalized);
}

function getListStyles(tag) {
  if (tag === 'ol') {
    return {
      list: 'style="list-style-type: decimal; list-style-position: inside; padding-left: 0.5rem; margin: 1rem 0;"',
      item: 'style="display: list-item; margin: 0.5rem 0;"',
    };
  }
  return {
    list: 'style="list-style-type: disc; list-style-position: inside; padding-left: 0.5rem; margin: 1rem 0;"',
    item: 'style="display: list-item; margin: 0.5rem 0;"',
  };
}

function classifyDocxParagraph(paragraphXml, innerText, numberingMap) {
  const styleName = getDocxParagraphStyle(paragraphXml).toLowerCase();
  const maxFontSize = getDocxParagraphMaxFontSize(paragraphXml);
  const isBold = docxParagraphHasBold(paragraphXml);
  const normalizedText = normalizeExtractedText(innerText);
  const listTag = getDocxParagraphListTag(paragraphXml, numberingMap);

  if (!normalizedText && !/<a:blip\b/i.test(String(paragraphXml || ''))) return 'blank';
  if (listTag) return listTag;
  if (styleName.includes('listbullet')) return 'ul';
  if (styleName.includes('listnumber')) return 'ol';
  if (styleName.includes('title')) return 'h2';
  if (styleName.includes('heading1') || styleName.includes('heading 1')) return 'h2';
  if (styleName.includes('heading2') || styleName.includes('heading 2')) return 'h3';
  if (styleName.includes('heading3') || styleName.includes('heading 3')) return 'h4';

  // Heuristic fallback for Chinese Word docs that rely on typography instead of paragraph styles.
  if (isBold && maxFontSize >= 34) return 'h2';
  if (isBold && maxFontSize >= 28) return 'h3';
  if (isBold && maxFontSize >= 24 && normalizedText.length <= 36) return 'h4';
  if (/^(第[一二三四五六七八九十0-9]+[章节部分]|[一二三四五六七八九十]+、|[（(]?[一二三四五六七八九十0-9]+[)）])/u.test(normalizedText) && normalizedText.length <= 42) {
    return 'h3';
  }

  return 'p';
}

async function convertDocxXmlToHtml(documentXml, relXml, numberingXml, filePath) {
  const relMap = parseDocxRelationships(relXml);
  const numberingMap = parseDocxNumbering(numberingXml);
  const mediaCache = new Map();
  const paragraphs = String(documentXml || '').match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const blocks = [];
  let listState = null;

  const flushList = () => {
    if (!listState || !listState.items.length) return;
    const styles = getListStyles(listState.tag);
    blocks.push(`<${listState.tag} ${styles.list}>${listState.items.join('')}</${listState.tag}>`);
    listState = null;
  };

  for (const paragraphXml of paragraphs) {
    const innerHtml = (await extractDocxInlineHtml(paragraphXml, relMap, filePath, mediaCache)).trim();
    const paragraphKind = classifyDocxParagraph(paragraphXml, innerHtml, numberingMap);
    const paragraphFontSizePx = getDocxParagraphFontSizePx(paragraphXml, paragraphKind);
    const wrappedInnerHtml = paragraphFontSizePx ? `<span style="font-size: ${paragraphFontSizePx}px">${innerHtml}</span>` : innerHtml;

    if (paragraphKind === 'blank') {
      flushList();
      if (blocks[blocks.length - 1] !== '<p><br /></p>') {
        blocks.push('<p><br /></p>');
      }
      continue;
    }

    if (paragraphKind === 'ul' || paragraphKind === 'ol') {
      if (!listState || listState.tag !== paragraphKind) {
        flushList();
        listState = { tag: paragraphKind, items: [] };
      }
      listState.items.push(`<li ${getListStyles(paragraphKind).item}>${wrappedInnerHtml}</li>`);
      continue;
    }

    flushList();
    if (isImageOnlyHtml(wrappedInnerHtml)) {
      blocks.push(
        `<figure style="margin: 2rem 0; text-align: center;">${wrappedInnerHtml.replace(/<img\b/i, '<img style="display: block; max-width: 100%; margin: 0 auto; border-radius: 1rem;" ')}</figure>`
      );
      continue;
    }
    if (paragraphKind === 'h2' || paragraphKind === 'h3' || paragraphKind === 'h4') {
      blocks.push(`<${paragraphKind}>${wrappedInnerHtml}</${paragraphKind}>`);
      continue;
    }
    blocks.push(`<p>${wrappedInnerHtml}</p>`);
  }

  flushList();
  return blocks.join('\n');
}

function inferTitleFromText(text, fallbackPath = '') {
  const lines = normalizeExtractedText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(第?\s*\d+\s*页|page\s*\d+)$/i.test(line));

  const titleLine = lines.find((line) => line.length >= 4 && line.length <= 48);
  if (titleLine) return titleLine;

  const base = decodeURIComponent(path.basename(fallbackPath || '', path.extname(fallbackPath || '')))
    .replace(/[-_]+/g, ' ')
    .trim();
  return base || '';
}

function normalizePdfPageTexts(input) {
  return String(input || '')
    .split('\f')
    .map((page) => normalizeExtractedText(page))
    .filter(Boolean);
}

function shouldJoinWithPreviousLine(previousLine, currentLine) {
  const prev = String(previousLine || '').trim();
  const current = String(currentLine || '').trim();
  if (!prev || !current) return false;
  if (classifyPlainTextLine(prev) !== 'p' || classifyPlainTextLine(current) !== 'p') return false;
  if (/[。！？；.!?;:：]$/.test(prev)) return false;
  if (/^(图|表)\s*[0-9一二三四五六七八九十]/u.test(current)) return false;
  return true;
}

function joinArticleLines(previousLine, currentLine) {
  const prev = String(previousLine || '').trim();
  const current = String(currentLine || '').trim();
  if (!prev) return current;
  if (!current) return prev;
  const needsSpace = /[A-Za-z0-9]$/.test(prev) && /^[A-Za-z0-9]/.test(current);
  return `${prev}${needsSpace ? ' ' : ''}${current}`;
}

function reflowArticlePlainText(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const result = [];

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) {
      if (result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    if (!result.length) {
      result.push(line);
      continue;
    }

    const previous = result[result.length - 1];
    if (shouldJoinWithPreviousLine(previous, line)) {
      result[result.length - 1] = joinArticleLines(previous, line);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function normalizeListLine(input) {
  return String(input || '')
    .replace(/^[•·●○■□▪◦▪▫‣⁃\-–—]+\s*/u, '')
    .replace(/^\(?\d+[.)、:：-]\)?[\s\u00A0\u3000]*/u, '')
    .replace(/^[（(]?[一二三四五六七八九十百千万0-9]+[)）][、.:：-]?[\s\u00A0\u3000]*/u, '')
    .trim();
}

function classifyPlainTextLine(line) {
  const value = String(line || '').trim();
  if (!value) return 'blank';
  if (/^[•·●○■□▪◦▪▫‣⁃\-–—]+[\s\u00A0\u3000]*/u.test(value)) return 'ul';
  if (/^\(?\d+[.)、:：-]\)?[\s\u00A0\u3000]*/u.test(value)) return 'ol';
  if (/^[（(]?[一二三四五六七八九十百千万0-9]+[)）][、.:：-]?[\s\u00A0\u3000]*/u.test(value)) return 'ol';
  if (value.length <= 28 && !/[。！？；：:，,、]$/.test(value)) return 'h3';
  return 'p';
}

function convertPlainTextToHtmlBlocks(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let paragraphLines = [];
  let listState = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(`<p>${paragraphLines.map((item) => escapeHtml(item)).join('<br />')}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listState || !listState.items.length) return;
    const styles = getListStyles(listState.tag);
    blocks.push(`<${listState.tag} ${styles.list}>${listState.items.join('')}</${listState.tag}>`);
    listState = null;
  };

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    const kind = classifyPlainTextLine(line);

    if (kind === 'blank') {
      flushParagraph();
      flushList();
      if (blocks[blocks.length - 1] !== '<p><br /></p>') {
        blocks.push('<p><br /></p>');
      }
      continue;
    }

    if (kind === 'ul' || kind === 'ol') {
      flushParagraph();
      if (!listState || listState.tag !== kind) {
        flushList();
        listState = { tag: kind, items: [] };
      }
      listState.items.push(`<li ${getListStyles(kind).item}>${escapeHtml(normalizeListLine(line))}</li>`);
      continue;
    }

    flushList();
    if (kind === 'h3') {
      flushParagraph();
      blocks.push(`<h3>${escapeHtml(line)}</h3>`);
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join('\n');
}

async function renderPdfPageImages(filePath, contentType, maxPages = 6) {
  const normalizedType = ['book', 'insight', 'methodology'].includes(contentType) ? contentType : 'report';
  const outputDir = path.join(ADMIN_UPLOAD_ROOT, 'ai-pages', normalizedType);
  await fs.mkdir(outputDir, { recursive: true });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yiyu-pdf-pages-'));
  try {
    const prefix = path.join(tempDir, 'page');
    await execFileAsync(
      'pdftoppm',
      ['-png', '-r', '110', '-f', '1', '-l', String(maxPages), filePath, prefix],
      { maxBuffer: 32 * 1024 * 1024 }
    );

    const pageFiles = (await fs.readdir(tempDir))
      .filter((name) => /^page-\d+\.png$/i.test(name))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    const urls = [];
    for (const pageFile of pageFiles) {
      const srcPath = path.join(tempDir, pageFile);
      const outputName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${pageFile}`;
      const destPath = path.join(outputDir, outputName);
      await fs.copyFile(srcPath, destPath);
      urls.push(`/uploads/ai-pages/${normalizedType}/${outputName}`);
    }

    return urls;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function buildPdfArticleHtml(pageTexts) {
  const blocks = [];
  for (const pageText of pageTexts) {
    const normalizedPageText = reflowArticlePlainText(pageText);
    if (normalizedPageText) {
      blocks.push(convertPlainTextToHtmlBlocks(normalizedPageText));
    }
  }

  return blocks.join('\n');
}

function inferAuthorFromCoverText(text) {
  const lines = normalizeExtractedText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  for (const line of lines) {
    const labeled = line.match(/(?:作者|编著|主编|出品|机构)[:：\s]*([一-龥A-Za-z·]{2,24})/);
    if (labeled?.[1]) {
      return labeled[1];
    }

    const separated = line.match(/^([一-龥A-Za-z·]{2,24})\s*[|｜／/]/);
    if (separated?.[1]) {
      return separated[1];
    }
  }

  return '';
}

async function extractDocxArtifacts(filePath) {
  await ensureReadableFile(filePath);
  const textResult = await execFileAsync('unzip', ['-p', filePath, 'word/document.xml']).catch((error) => {
    throw new Error(`提取 DOCX 文本失败：${error?.message || '未知错误'}`);
  });
  const relResult = await execFileAsync('unzip', ['-p', filePath, 'word/_rels/document.xml.rels']).catch(() => ({ stdout: '' }));
  const numberingResult = await execFileAsync('unzip', ['-p', filePath, 'word/numbering.xml']).catch(() => ({ stdout: '' }));

  const text = stripXmlToText(textResult.stdout);
  const html = await convertDocxXmlToHtml(textResult.stdout, relResult.stdout, numberingResult.stdout, filePath);
  return {
    pages: 0,
    metaTitle: '',
    metaAuthor: '',
    text,
    html,
    fileExt: '.docx',
  };
}

function parsePdfInfoOutput(output) {
  const lines = String(output || '').split(/\r?\n/);
  const info = {};
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    info[match[1].trim()] = match[2].trim();
  }
  return info;
}

async function extractPdfArtifacts(filePath, options = {}) {
  await ensureReadableFile(filePath);
  const maxPages = Number.isFinite(Number(options.maxPages)) ? Number(options.maxPages) : 12;

  const pdfInfoResult = await execFileAsync('pdfinfo', [filePath]).catch((error) => {
    throw new Error(`读取 PDF 元信息失败：${error?.message || '未知错误'}`);
  });
  const pdfInfo = parsePdfInfoOutput(pdfInfoResult.stdout);
  const pages = Number.parseInt(String(pdfInfo.Pages || ''), 10) || 0;

  const textResult = await execFileAsync('pdftotext', ['-f', '1', '-l', String(maxPages), '-layout', filePath, '-']).catch((error) => {
    throw new Error(`提取 PDF 文本失败：${error?.message || '未知错误'}`);
  });

  const rawText = String(textResult.stdout || '');
  return {
    pages,
    metaTitle: safeText(pdfInfo.Title || ''),
    metaAuthor: safeText(pdfInfo.Author || ''),
    text: normalizeExtractedText(rawText),
    pageTexts: normalizePdfPageTexts(rawText),
    fileExt: '.pdf',
    ocrUsed: false,
  };
}

async function extractPdfArtifactsWithOcr(filePath, options = {}) {
  const pdfData = await extractPdfArtifacts(filePath, options);
  if (pdfData.text.length >= 80) {
    return pdfData;
  }

  const ocr = await getOcrCapabilities();
  if (!ocr.binaryReady || !ocr.chineseReady) {
    return pdfData;
  }

  const maxPages = Number.isFinite(Number(options.ocrPages)) ? Number(options.ocrPages) : 4;
  const dpi = Number.isFinite(Number(options.ocrDpi)) ? Number(options.ocrDpi) : 120;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yiyu-ocr-'));

  try {
    const prefix = path.join(tempDir, 'page');
    await execFileAsync(
      'pdftoppm',
      ['-png', '-r', String(dpi), '-f', '1', '-l', String(maxPages), filePath, prefix],
      { maxBuffer: 16 * 1024 * 1024 }
    );

    const imageFiles = (await fs.readdir(tempDir))
      .filter((name) => /^page-\d+\.png$/i.test(name))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    if (!imageFiles.length) {
      return pdfData;
    }

    const textChunks = [];
    for (const imageName of imageFiles) {
      const imagePath = path.join(tempDir, imageName);
      const { stdout } = await execFileAsync(
        'tesseract',
        [imagePath, 'stdout', '-l', 'chi_sim+eng', '--psm', '6'],
        {
          maxBuffer: 16 * 1024 * 1024,
          env: {
            ...process.env,
            OMP_THREAD_LIMIT: '1',
          },
        }
      );
      const normalized = normalizeExtractedText(stdout);
      if (normalized) {
        textChunks.push(normalized);
      }
    }

    const ocrText = normalizeExtractedText(textChunks.join('\n\n'));
    if (!ocrText) {
      return pdfData;
    }

    return {
      ...pdfData,
      text: ocrText,
      pageTexts: normalizePdfPageTexts(ocrText),
      ocrUsed: true,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function renderPdfFirstPageCover(filePath, contentType) {
  const normalizedType = ['book', 'insight', 'methodology'].includes(contentType) ? contentType : 'report';
  const coverDir = path.join(ADMIN_UPLOAD_ROOT, 'ai-covers', normalizedType);
  await fs.mkdir(coverDir, { recursive: true });

  const baseName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const outputPrefix = path.join(coverDir, baseName);
  await execFileAsync('pdftoppm', ['-png', '-f', '1', '-singlefile', filePath, outputPrefix]).catch((error) => {
    throw new Error(`提取 PDF 首图失败：${error?.message || '未知错误'}`);
  });

  const coverPath = `${outputPrefix}.png`;
  await ensureReadableFile(coverPath);
  return `/uploads/ai-covers/${normalizedType}/${path.basename(coverPath)}`;
}

async function extractPdfCoverText(filePath, options = {}) {
  const dpi = Number.isFinite(Number(options.dpi)) ? Number(options.dpi) : 150;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yiyu-cover-ocr-'));

  try {
    const outputPrefix = path.join(tempDir, 'cover');
    await execFileAsync('pdftoppm', ['-png', '-r', String(dpi), '-f', '1', '-singlefile', filePath, outputPrefix], {
      maxBuffer: 16 * 1024 * 1024,
    });

    const imagePath = `${outputPrefix}.png`;
    const { stdout } = await execFileAsync(
      'tesseract',
      [imagePath, 'stdout', '-l', 'chi_sim+eng', '--psm', '6'],
      {
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          OMP_THREAD_LIMIT: '1',
        },
      }
    );
    return normalizeExtractedText(stdout);
  } catch {
    return '';
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function extractSourceArtifacts(filePath, contentType) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    return extractDocxArtifacts(filePath);
  }
  if (ext === '.pdf') {
    const isArticleLike = contentType === 'insight' || contentType === 'methodology';
    const pdfData = await extractPdfArtifactsWithOcr(filePath, {
      maxPages: isArticleLike ? 30 : 10,
      ocrPages: isArticleLike ? 3 : 2,
      ocrDpi: 110,
    });
    if (isArticleLike) {
      return {
        ...pdfData,
        html: buildPdfArticleHtml(pdfData.pageTexts || [pdfData.text || '']),
      };
    }
    if (contentType === 'book') {
      return {
        ...pdfData,
        coverText: await extractPdfCoverText(filePath, { dpi: 150 }),
      };
    }
    return pdfData;
  }
  throw new Error('当前仅支持解析 PDF 或 DOCX 文件');
}

function buildFallbackSourceArtifacts(contentType, current = {}) {
  const contentHtml = safeText(current.contentHtml || '');
  const contentText = normalizeExtractedText(
    current.contentText || current.content || stripHtmlTags(contentHtml)
  );
  if (!contentText && !contentHtml) {
    return null;
  }

  if (contentType === 'insight' || contentType === 'methodology') {
    return {
      pages: 0,
      metaTitle: safeText(current.title || ''),
      metaAuthor: '',
      text: contentText,
      html: contentHtml,
      fileExt: '.fallback',
      ocrUsed: false,
    };
  }

  if (contentType === 'book') {
    const description = safeText(current.description || '');
    const author = safeText(current.author || '');
    const composedText = normalizeExtractedText([current.title, author, description].filter(Boolean).join('\n\n'));
    if (!composedText) return null;
    return {
      pages: 0,
      metaTitle: safeText(current.title || ''),
      metaAuthor: author,
      text: composedText,
      coverText: author,
      fileExt: '.fallback',
      ocrUsed: false,
    };
  }

  const summary = safeText(current.summary || '');
  const publisher = safeText(current.publisher || '');
  const composedText = normalizeExtractedText([current.title, publisher, summary].filter(Boolean).join('\n\n'));
  if (!composedText) return null;
  return {
    pages: 0,
    metaTitle: safeText(current.title || ''),
    metaAuthor: publisher,
    text: composedText,
    fileExt: '.fallback',
    ocrUsed: false,
  };
}

async function callArkChat(messages, options = {}) {
  if (!isArkReady()) {
    throw new Error('未配置火山方舟模型，请先完成后端密钥配置');
  }

  const model = safeText(options.model, ARK_MODEL);
  const maxTokens = Number(options.maxTokens || 600);
  const temperature = Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.2;
  const reasoningEffort = safeText(options.reasoningEffort, 'low');

  const response = await fetch(`${ARK_BASE_URL}/api/v3/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      reasoning_effort: reasoningEffort,
      temperature,
      max_tokens: maxTokens,
      messages,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `火山方舟调用失败(${response.status})`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('火山方舟未返回可用内容');
  }
  return String(content);
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI 返回内容中未找到 JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function tryExtractJsonObject(text) {
  try {
    return extractJsonObject(text);
  } catch {
    return null;
  }
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listPageAgentToolNames(payload) {
  const builtinTools = [
    'done',
    'wait',
    'click_element_by_index',
    'input_text',
    'select_dropdown_option',
    'scroll',
    'scroll_horizontally',
  ];
  const requestedTools = Array.isArray(payload?.tools)
    ? payload.tools
        .map((item) => safeText(item?.function?.name))
        .filter((name) => Boolean(name) && name !== 'AgentOutput')
    : [];
  return Array.from(new Set([...requestedTools, ...builtinTools]));
}

function canonicalizePageAgentToolName(rawName, allowedToolNames) {
  const name = safeText(rawName).trim();
  if (!name) return '';
  if (allowedToolNames.includes(name)) return name;

  const normalized = name.toLowerCase().replace(/[\s-]+/g, '_');
  const aliasMap = {
    click: 'click_element_by_index',
    click_element: 'click_element_by_index',
    click_element_byindex: 'click_element_by_index',
    click_elementbyindex: 'click_element_by_index',
    clickbyindex: 'click_element_by_index',
    tap: 'click_element_by_index',
    press: 'click_element_by_index',
    input: 'input_text',
    type: 'input_text',
    fill: 'input_text',
    inputtext: 'input_text',
    input_by_index: 'input_text',
    enter_text: 'input_text',
    set_text: 'input_text',
    select: 'select_dropdown_option',
    selectdropdownoption: 'select_dropdown_option',
    choose: 'select_dropdown_option',
    pick_option: 'select_dropdown_option',
    open_url: 'open_internal_url',
    goto: 'open_internal_url',
    navigate: 'open_internal_url',
    scroll_page: 'scroll_section',
    scrollpage: 'scroll_section',
  };
  const canonical = aliasMap[normalized] || '';
  return canonical && allowedToolNames.includes(canonical) ? canonical : '';
}

function coercePageAgentValue(rawValue) {
  const value = String(rawValue || '').trim().replace(/^['"]|['"]$/g, '');
  if (!value) return '';
  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === 'true';
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function coerceStructuredPageAgentValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => coerceStructuredPageAgentValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, coerceStructuredPageAgentValue(item)])
    );
  }
  if (typeof value === 'string') {
    return coercePageAgentValue(value);
  }
  return value;
}

function extractMalformedActionParams(text) {
  const keys = [
    'index',
    'seconds',
    'target',
    'title',
    'mode',
    'text',
    'question',
    'searchQuery',
    'topic',
    'year',
    'success',
    'down',
    'num_pages',
    'pixels',
    'left',
    'script',
  ];
  const params = {};

  for (const key of keys) {
    const patterns = [
      new RegExp(`<parameter\\s+name=["']${escapeRegExp(key)}["'][^>]*>\\s*([^<\\n]+)`, 'i'),
      new RegExp(`${escapeRegExp(key)}["']?\\s*[:=]\\s*"([^"]+)"`, 'i'),
      new RegExp(`${escapeRegExp(key)}["']?\\s*[:=]\\s*'([^']+)'`, 'i'),
      new RegExp(`${escapeRegExp(key)}["']?\\s*[:=]\\s*([^,}\\]\\n<>]+)`, 'i'),
    ];
    const matched = patterns
      .map((pattern) => text.match(pattern))
      .find((result) => result?.[1]);
    if (matched?.[1]) {
      params[key] = coercePageAgentValue(matched[1]);
    }
  }

  return params;
}

function normalizePageAgentAction(rawAction, allowedToolNames) {
  if (!rawAction || !allowedToolNames.length) return null;

  if (typeof rawAction === 'string') {
    const matchedTool = allowedToolNames
      .map((name) => ({ name, index: rawAction.indexOf(name) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index)[0];

    const parsedJson = tryExtractJsonObject(rawAction);
    if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
      if (matchedTool && typeof parsedJson.action === 'undefined') {
        const copied = { ...parsedJson };
        copied.action = matchedTool.name;
        return normalizePageAgentAction(copied, allowedToolNames);
      }
      return normalizePageAgentAction(parsedJson, allowedToolNames);
    }

    if (!matchedTool) return null;
    return {
      name: matchedTool.name,
      arguments: extractMalformedActionParams(rawAction),
    };
  }

  if (typeof rawAction !== 'object' || Array.isArray(rawAction)) {
    return null;
  }

  if (typeof rawAction.action !== 'undefined') {
    if (typeof rawAction.action === 'string') {
      const siblingArgs = { ...rawAction };
      delete siblingArgs.action;
      return normalizePageAgentAction(
        {
          name: canonicalizePageAgentToolName(rawAction.action, allowedToolNames) || safeText(rawAction.action),
          arguments: siblingArgs,
        },
        allowedToolNames
      );
    }
    return normalizePageAgentAction(rawAction.action, allowedToolNames);
  }

  const canonicalName = canonicalizePageAgentToolName(rawAction.name, allowedToolNames);
  if (canonicalName) {
    return {
      name: canonicalName,
      arguments: normalizePageAgentToolArguments(
        canonicalName,
        rawAction.arguments && typeof rawAction.arguments === 'object' && !Array.isArray(rawAction.arguments)
          ? coerceStructuredPageAgentValue(rawAction.arguments)
          : {}
      ),
    };
  }

  const toolKey = Object.keys(rawAction).find((key) => allowedToolNames.includes(key));
  if (!toolKey) return null;
  const toolArgs = rawAction[toolKey];
  return {
    name: toolKey,
    arguments: normalizePageAgentToolArguments(
      toolKey,
      toolArgs && typeof toolArgs === 'object' && !Array.isArray(toolArgs)
        ? coerceStructuredPageAgentValue(toolArgs)
        : {}
    ),
  };
}

function firstNonEmptyToolValue(args, keys) {
  for (const key of keys) {
    const value = args?.[key];
    if (typeof value === 'string' && safeText(value)) return safeText(value);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function normalizePageAgentToolArguments(toolName, rawArgs) {
  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
    ? { ...rawArgs }
    : {};

  if (toolName === 'click_element_by_index') {
    const rawIndex = firstNonEmptyToolValue(args, ['index', 'elementIndex', 'element_index', 'targetIndex', 'target_index']);
    return {
      index: rawIndex === undefined || rawIndex === null || rawIndex === ''
        ? undefined
        : Number(rawIndex),
    };
  }

  if (toolName === 'input_text') {
    const rawIndex = firstNonEmptyToolValue(args, ['index', 'elementIndex', 'element_index', 'targetIndex', 'target_index']);
    return {
      index: rawIndex === undefined || rawIndex === null || rawIndex === ''
        ? undefined
        : Number(rawIndex),
      text: safeText(firstNonEmptyToolValue(args, ['text', 'value', 'content', 'input'])),
    };
  }

  if (toolName === 'select_dropdown_option') {
    const rawIndex = firstNonEmptyToolValue(args, ['index', 'elementIndex', 'element_index', 'targetIndex', 'target_index']);
    return {
      index: rawIndex === undefined || rawIndex === null || rawIndex === ''
        ? undefined
        : Number(rawIndex),
      text: safeText(firstNonEmptyToolValue(args, ['text', 'value', 'option', 'label'])),
    };
  }

  if (toolName === 'scroll') {
    return {
      down: firstNonEmptyToolValue(args, ['down', 'forward']) !== false,
      num_pages: (() => {
        const rawPages = firstNonEmptyToolValue(args, ['num_pages', 'pages', 'pageCount', 'page_count']);
        return rawPages === undefined || rawPages === null || rawPages === ''
          ? undefined
          : Number(rawPages);
      })(),
      pixels: (() => {
        const rawPixels = firstNonEmptyToolValue(args, ['pixels', 'distance', 'offset']);
        return rawPixels === undefined || rawPixels === null || rawPixels === ''
          ? undefined
          : Number(rawPixels);
      })(),
      index: (() => {
        const rawIndex = firstNonEmptyToolValue(args, ['index', 'elementIndex', 'element_index', 'targetIndex', 'target_index']);
        return rawIndex === undefined || rawIndex === null || rawIndex === ''
          ? undefined
          : Number(rawIndex);
      })(),
    };
  }

  if (toolName === 'scroll_horizontally') {
    return {
      left: firstNonEmptyToolValue(args, ['left', 'backward']) === true,
      num_pages: (() => {
        const rawPages = firstNonEmptyToolValue(args, ['num_pages', 'pages', 'pageCount', 'page_count']);
        return rawPages === undefined || rawPages === null || rawPages === ''
          ? undefined
          : Number(rawPages);
      })(),
      pixels: (() => {
        const rawPixels = firstNonEmptyToolValue(args, ['pixels', 'distance', 'offset']);
        return rawPixels === undefined || rawPixels === null || rawPixels === ''
          ? undefined
          : Number(rawPixels);
      })(),
      index: (() => {
        const rawIndex = firstNonEmptyToolValue(args, ['index', 'elementIndex', 'element_index', 'targetIndex', 'target_index']);
        return rawIndex === undefined || rawIndex === null || rawIndex === ''
          ? undefined
          : Number(rawIndex);
      })(),
    };
  }

  if (toolName === 'open_internal_url') {
    return {
      target: safeText(
        firstNonEmptyToolValue(args, ['target', 'url', 'path', 'href', 'page', 'pageUrl', 'targetUrl'])
      ),
    };
  }

  if (toolName === 'set_site_filters') {
    return {
      searchQuery: safeText(firstNonEmptyToolValue(args, ['searchQuery', 'query', 'search', 'keyword', 'keywords', 'text'])),
      topic: safeText(firstNonEmptyToolValue(args, ['topic', 'tag', 'label', 'category'])),
      year: safeText(firstNonEmptyToolValue(args, ['year', 'publishYear', 'dateYear'])),
    };
  }

  if (toolName === 'set_sort_mode') {
    return {
      sortMode: safeText(firstNonEmptyToolValue(args, ['sortMode', 'sort', 'mode', 'order'])),
    };
  }

  if (toolName === 'go_to_page') {
    const rawPage = firstNonEmptyToolValue(args, ['pageNumber', 'page', 'pageIndex', 'index']);
    return {
      pageNumber: rawPage === undefined || rawPage === null || rawPage === ''
        ? undefined
        : Number(rawPage),
    };
  }

  if (toolName === 'open_content_card') {
    const rawMode = safeText(firstNonEmptyToolValue(args, ['mode', 'openMode', 'position']));
    const normalizedMode = rawMode === 'latest'
      ? 'first'
      : rawMode === 'oldest'
        ? 'last'
        : rawMode;
    return {
      title: safeText(firstNonEmptyToolValue(args, ['title', 'name', 'text', 'target'])),
      mode: safeText(normalizedMode),
    };
  }

  if (toolName === 'scroll_section') {
    const rawPasses = firstNonEmptyToolValue(args, ['passes', 'num_pages', 'pages', 'pageCount']);
    return {
      sectionId: safeText(firstNonEmptyToolValue(args, ['sectionId', 'section', 'target', 'anchor'])),
      passes: rawPasses === undefined || rawPasses === null || rawPasses === ''
        ? undefined
        : Math.max(1, Number(rawPasses)),
    };
  }

  if (toolName === 'expand_section') {
    return {
      sectionId: safeText(firstNonEmptyToolValue(args, ['sectionId', 'section', 'target', 'anchor'])),
    };
  }

  if (toolName === 'fill_local_form_fields') {
    return {
      name: safeText(firstNonEmptyToolValue(args, ['name', 'fullName'])),
      organization: safeText(firstNonEmptyToolValue(args, ['organization', 'org', 'company', 'institution'])),
      phone: safeText(firstNonEmptyToolValue(args, ['phone', 'mobile', 'tel'])),
      email: safeText(firstNonEmptyToolValue(args, ['email', 'mail'])),
      note: safeText(firstNonEmptyToolValue(args, ['note', 'summary', 'description', 'requirement', 'request'])),
    };
  }

  return args;
}

function normalizeAgentOutputArguments(rawArguments, allowedToolNames) {
  const parsed = safeJsonParse(rawArguments);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const coerced = coerceStructuredPageAgentValue(parsed);
    if (coerced.action && typeof coerced.action === 'object' && !Array.isArray(coerced.action)) {
      const normalizedAction = normalizePageAgentAction(coerced.action, allowedToolNames);
      if (normalizedAction) {
        return wrapPageAgentAgentOutput(
          { [normalizedAction.name]: normalizedAction.arguments || {} },
          {
            evaluation_previous_goal: safeText(coerced.evaluation_previous_goal),
            memory: safeText(coerced.memory),
            next_goal: safeText(coerced.next_goal || coerced.thinking),
          }
        );
      }
    }
  }

  const normalizedAction = normalizePageAgentAction(rawArguments, allowedToolNames);
  if (!normalizedAction) return null;
  return wrapPageAgentAgentOutput({ [normalizedAction.name]: normalizedAction.arguments || {} });
}

function wrapPageAgentAgentOutput(action, overrides = {}) {
  return {
    evaluation_previous_goal:
      safeText(overrides.evaluation_previous_goal)
      || 'Proxy normalized model output into a valid AgentOutput action.',
    memory: safeText(overrides.memory),
    next_goal: safeText(overrides.next_goal),
    action,
  };
}

function buildPageAgentToolCallFromAction(action, existingToolCall) {
  return {
    id: safeText(existingToolCall?.id) || `call_${crypto.randomUUID().replace(/-/g, '')}`,
    type: 'function',
    function: {
      ...(existingToolCall?.function || {}),
      name: 'AgentOutput',
      arguments: JSON.stringify(wrapPageAgentAgentOutput(action)),
    },
  };
}

function buildPageAgentContentResponse(responseData, choice, message, agentOutput) {
  return {
    ...responseData,
    choices: [
      {
        ...choice,
        message: {
          ...message,
          content: JSON.stringify(agentOutput),
          tool_calls: [],
        },
      },
    ],
  };
}

function buildPageAgentWaitResponse(responseData, choice, message, reason = '') {
  const waitAction = { wait: { seconds: 1 } };
  return buildPageAgentContentResponse(
    responseData,
    choice,
    message,
    wrapPageAgentAgentOutput(waitAction, {
      evaluation_previous_goal: reason || 'Model returned no usable action; proxy injected a wait step.',
      next_goal: 'Wait briefly, then continue the task.',
    })
  );
}

function normalizePageAgentProxyResponse(payload, responseData) {
  const choice = responseData?.choices?.[0];
  const message = choice?.message;
  if (!choice || !message) return responseData;
  const allowedToolNames = listPageAgentToolNames(payload);
  const rawContent = typeof message.content === 'string' ? message.content : '';
  const contentLooksLikeAction = Boolean(
    rawContent
    && (
      /<parameter\s+name=/i.test(rawContent)
      || /"action"\s*:/i.test(rawContent)
      || /\b(click|click_element_by_index|input|type|fill|input_text|select|select_dropdown_option|scroll|scroll_page|scroll_horizontally|wait|done|open_internal_url|open_url|goto|navigate|set_site_filters|set_sort_mode|go_to_page|open_content_card|scroll_section|expand_section|confirm_current_state|fill_local_form_fields)\b/i.test(rawContent)
    )
  );
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    const existingToolCall = message.tool_calls[0];
    const existingToolName = safeText(existingToolCall?.function?.name);
    if (existingToolName === 'AgentOutput') {
      const normalizedAgentOutput = normalizeAgentOutputArguments(existingToolCall?.function?.arguments || '', allowedToolNames);
      if (!normalizedAgentOutput) {
        return buildPageAgentWaitResponse(
          responseData,
          choice,
          message,
          'AgentOutput arguments were malformed and could not be normalized.'
        );
      }
      return buildPageAgentContentResponse(responseData, choice, message, normalizedAgentOutput);
    }
    if (allowedToolNames.includes(existingToolName)) {
      const parsedArgs = coerceStructuredPageAgentValue(safeJsonParse(existingToolCall?.function?.arguments || '{}') || {});
      return buildPageAgentContentResponse(
        responseData,
        choice,
        message,
        wrapPageAgentAgentOutput({
          [existingToolName]:
            parsedArgs && typeof parsedArgs === 'object' && !Array.isArray(parsedArgs)
              ? parsedArgs
              : {},
        })
      );
    }
    const canonicalExistingToolName = canonicalizePageAgentToolName(existingToolName, allowedToolNames);
    if (canonicalExistingToolName) {
      const parsedArgs = coerceStructuredPageAgentValue(safeJsonParse(existingToolCall?.function?.arguments || '{}') || {});
      return buildPageAgentContentResponse(
        responseData,
        choice,
        message,
        wrapPageAgentAgentOutput({
          [canonicalExistingToolName]:
            parsedArgs && typeof parsedArgs === 'object' && !Array.isArray(parsedArgs)
              ? normalizePageAgentToolArguments(canonicalExistingToolName, parsedArgs)
              : {},
        }, {
          evaluation_previous_goal: 'Proxy normalized malformed tool_call name from model output.',
        })
      );
    }
    if (contentLooksLikeAction) {
      const normalizedFromContent = normalizePageAgentAction(rawContent, allowedToolNames);
      if (normalizedFromContent) {
        return buildPageAgentContentResponse(
          responseData,
          choice,
          message,
          wrapPageAgentAgentOutput({
            [normalizedFromContent.name]: normalizedFromContent.arguments || {},
          })
        );
      }
    }
  }

  const normalizedAction = normalizePageAgentAction(rawContent, allowedToolNames);
  if (!normalizedAction) {
    const reasoningContent = safeText(message.reasoning_content || message.reasoning || '');
    if (!rawContent && !Array.isArray(message.tool_calls) && reasoningContent) {
      return buildPageAgentWaitResponse(
        responseData,
        choice,
        message,
        'Model returned reasoning-only content without an executable action.'
      );
    }
    if (!rawContent && (!Array.isArray(message.tool_calls) || message.tool_calls.length === 0)) {
      return buildPageAgentWaitResponse(
        responseData,
        choice,
        message,
        'Model returned an empty message without tool calls.'
      );
    }
    return responseData;
  }

  return {
    ...buildPageAgentContentResponse(
      responseData,
      choice,
      message,
      wrapPageAgentAgentOutput({
        [normalizedAction.name]: normalizedAction.arguments || {},
      }, {
        evaluation_previous_goal: 'Proxy normalized malformed tool response from model output.',
      })
    ),
  };
}

function buildPageAgentToolSpecText(payload) {
  const tools = Array.isArray(payload?.tools) ? payload.tools : [];
  if (!tools.length) return '';
  return tools
    .map((tool) => {
      const name = safeText(tool?.function?.name);
      if (!name || name === 'AgentOutput') {
        return '';
      }
      const description = safeText(tool?.function?.description);
      const parameters = tool?.function?.parameters && typeof tool.function.parameters === 'object'
        ? JSON.stringify(tool.function.parameters)
        : '';
      return `- ${name}${description ? `：${description}` : ''}${parameters ? `\n  参数模式：${parameters}` : ''}`;
    })
    .filter(Boolean)
    .join('\n');
}

function buildArkPageAgentPayload(payload) {
  const toolSpec = buildPageAgentToolSpecText(payload);
  const originalMessages = Array.isArray(payload?.messages) ? payload.messages : [];
  const systemPrelude = {
    role: 'system',
    content: [
      '你是益语通的 Page Agent 模型代理输出层。',
      '你必须只返回一个 JSON 对象，不要返回 Markdown，不要返回 XML，不要返回 <parameter> 标签。',
      '不要使用 OpenAI 原生 tool_calls；请把动作严格放进 JSON 的 action 字段中。',
      '不要把 AgentOutput 当成动作名返回；AgentOutput 只是前端框架的包装层，不是实际可执行工具。',
      '返回格式必须是：{"evaluation_previous_goal":"","memory":"","next_goal":"","action":{"工具名":{"参数":值}}}。',
      'action 内只能出现一个工具名，参数必须是合法 JSON，布尔值必须是 true/false，数字必须是数字，不能写成字符串。',
      '如果要点击元素，必须使用 click_element_by_index；如果要输入文本，必须使用 input_text；如果要选择下拉项，必须使用 select_dropdown_option。',
      '不要返回 click、type、fill、input、select 这类别名；请使用工具清单里的正式动作名。',
      toolSpec ? `当前可用工具如下：\n${toolSpec}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };

  return {
    model: safeText(payload?.model, YIYU_TONG_ARK_MODEL),
    temperature: 0,
    top_p: 0.1,
    max_tokens: 220,
    stream: false,
    reasoning_effort: undefined,
    messages: [systemPrelude, ...originalMessages],
  };
}

function buildAiPrefillMessages(contentType, sourceData, filePath) {
  const isBook = contentType === 'book';
  const isArticleLike = contentType === 'insight' || contentType === 'methodology';
  const system = [
    '你是一个中文内容运营助手。',
    '请根据上传文件的文本与元信息，为后台表单生成结构化内容。',
    '你只能从以下标签中选择 1 到 3 个：战略、业务设计、组织、AI 技术。',
    '现有表单中的旧值可能是错的或过时的，不要参考旧值，只以文件内容为准。',
    '只返回 JSON，不要返回 markdown、解释或多余文字。',
  ].join('');

  const userPayload = {
    contentType,
    allowedTopics: AI_PREFILL_TOPIC_OPTIONS,
    fileName: path.basename(filePath),
    fileMeta: {
      title: sourceData.metaTitle,
      author: sourceData.metaAuthor,
      pages: sourceData.pages,
      ocrUsed: Boolean(sourceData.ocrUsed),
    },
    coverTextExcerpt: contentType === 'book' ? String(sourceData.coverText || '').slice(0, 1200) : '',
    fileExcerpt: sourceData.text.slice(0, isArticleLike ? 12000 : 8000),
    outputSchema: isArticleLike
      ? {
          title: '标题，字符串',
          excerpt: '80-160字中文摘要',
          topics: ['从允许标签中选择 1-3 个'],
        }
      : isBook
      ? {
          title: '书名，字符串',
          author: '作者名或机构名，优先从封面、扉页、版权页识别；无法判断则返回空字符串',
          description: '80-160字中文简介',
          topics: ['从允许标签中选择 1-3 个'],
        }
      : {
          title: '报告标题，字符串',
          publisher: '发布机构，无法判断则返回空字符串',
          summary: '80-160字中文摘要',
          topics: ['从允许标签中选择 1-3 个'],
        },
  };

  return [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify(userPayload) },
  ];
}

async function buildAiPrefillResult({ contentType, fileUrl, current }) {
  let filePath = '';
  let sourceData = null;
  try {
    filePath = resolveSiteFilePath(fileUrl);
    sourceData = await extractSourceArtifacts(filePath, contentType);
  } catch (error) {
    const fallbackSource = buildFallbackSourceArtifacts(contentType, current);
    if (!fallbackSource) {
      throw error;
    }
    sourceData = fallbackSource;
  }

  if (normalizeExtractedText(sourceData.text).length < 80) {
    throw new Error('当前文件可提取文字过少，AI 无法可靠识别内容。请优先上传可复制文字的 PDF 或 DOCX；若是扫描件，需后续补 OCR。');
  }
  const coverImage = sourceData.fileExt === '.pdf' && filePath
    ? await renderPdfFirstPageCover(filePath, contentType)
    : safeText(current?.coverImage || '');
  const aiText = await callArkChat(buildAiPrefillMessages(contentType, sourceData, filePath || fileUrl || `${contentType}-current`));
  const aiJson = extractJsonObject(aiText);
  const inferredTitle = inferTitleFromText(sourceData.text, filePath);
  const fallbackTopics = safeTopicArray(current?.topics).length ? safeTopicArray(current?.topics) : ['战略'];

  if (contentType === 'insight' || contentType === 'methodology') {
    return {
      title: safeText(aiJson.title) || sourceData.metaTitle || inferredTitle || '',
      excerpt: safeText(aiJson.excerpt) || '',
      topics: safeTopicArray(aiJson.topics).length ? safeTopicArray(aiJson.topics) : fallbackTopics,
      contentText: sourceData.text || '',
      contentHtml: sourceData.html || '',
      coverImage,
      fileUrl,
      fileSize: 0,
    };
  }

  if (contentType === 'book') {
    return {
      title: safeText(aiJson.title) || sourceData.metaTitle || inferredTitle || '',
      author: safeText(aiJson.author) || safeText(sourceData.metaAuthor) || inferAuthorFromCoverText(sourceData.coverText) || '',
      description: safeText(aiJson.description) || '',
      topics: safeTopicArray(aiJson.topics).length ? safeTopicArray(aiJson.topics) : fallbackTopics,
      coverImage,
      pages: sourceData.pages || 0,
      fileUrl,
    };
  }

  return {
    title: safeText(aiJson.title) || sourceData.metaTitle || inferredTitle || '',
    publisher: safeText(aiJson.publisher) || '',
    summary: safeText(aiJson.summary) || '',
    topics: safeTopicArray(aiJson.topics).length ? safeTopicArray(aiJson.topics) : fallbackTopics,
    coverImage,
    pages: sourceData.pages || 0,
    fileUrl,
  };
}

const DEFAULT_CASE_SHOWCASES = [
  {
    id: 'case-blue-letter',
    slug: 'case-1',
    clientName: '蓝信封',
    industry: '公益/教育',
    title: '专注于乡村儿童心理健康服务的公益机构',
    subtitle: '通过书信交流建立长期陪伴关系',
    tags: ['公益', '教育'],
    logoUrl: '/images/cases/blue-letter.png',
    sortOrder: 1,
  },
  {
    id: 'case-vision-capital',
    slug: 'case-2',
    clientName: '愿景资本',
    industry: '金融/投资',
    title: '国家新兴产业创投基金管理公司',
    subtitle: '聚焦早中期投资，陪伴创业者成长',
    tags: ['投资', '创投'],
    logoUrl: '/images/cases/vision-capital.png',
    sortOrder: 2,
  },
  {
    id: 'case-beike-foundation',
    slug: 'case-3',
    clientName: '贝壳公益基金会',
    industry: '公益/房地产',
    title: '城市社区公益平台',
    subtitle: '打造互助互利的社区公益平台',
    tags: ['社区', '公益'],
    logoUrl: '/images/cases/beike-foundation.png',
    sortOrder: 3,
  },
  {
    id: 'case-rici-foundation',
    slug: 'case-4',
    clientName: '日慈基金会',
    industry: '公益/教育',
    title: '青少年心智素养教育',
    subtitle: '专注心智素养教育项目设计与推广',
    tags: ['教育', '心理'],
    logoUrl: '/images/cases/rici-foundation.png',
    sortOrder: 4,
  },
  {
    id: 'case-tianzige',
    slug: 'case-5',
    clientName: '田字格',
    industry: '公益/教育',
    title: '乡土人本教育探索',
    subtitle: '开展乡土人本教育模式探索',
    tags: ['乡村', '教育'],
    logoUrl: '/images/cases/tianzige.png',
    sortOrder: 5,
  },
  {
    id: 'case-abc-consulting',
    slug: 'case-6',
    clientName: 'ABC美好社会咨询社',
    industry: '公益/咨询',
    title: '专业公益咨询服务',
    subtitle: '为 NGO 提供战略、运营等专业咨询',
    tags: ['咨询', 'NGO'],
    logoUrl: '/images/cases/abc-consulting.png',
    sortOrder: 6,
  },
  {
    id: 'case-lithium-sodium-krypton-strontium',
    slug: 'case-7',
    clientName: '锂钠氪锶',
    industry: '教育/科技',
    title: '教育科技解决方案',
    subtitle: '通过 AI 和大数据提供个性化方案',
    tags: ['AI', '教育'],
    logoUrl: '/images/cases/lithium-sodium-krypton-strontium.png',
    sortOrder: 7,
  },
  {
    id: 'case-china-rural-foundation',
    slug: 'case-8',
    clientName: '中国乡村发展基金会',
    industry: '公益/乡村振兴',
    title: '乡村发展与扶贫事业',
    subtitle: '实施扶贫开发、乡村振兴项目',
    tags: ['乡村', '扶贫'],
    logoUrl: '/images/cases/china-rural-foundation.png',
    sortOrder: 8,
  },
  {
    id: 'case-nio',
    slug: 'case-9',
    clientName: '蔚来汽车',
    industry: '汽车/新能源',
    title: '智能电动汽车与用户体验',
    subtitle: '创造愉悦的用户生活方式',
    tags: ['汽车', '新能源'],
    logoUrl: '/images/cases/nio.png',
    sortOrder: 9,
  },
];

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(payload));
}

function httpStatusForError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/请先登录|登录状态已失效|内测码无效/.test(message)) return 401;
  if (/管理员权限不足/.test(message)) return 403;
  if (/不存在|暂无可下载|not found/i.test(message)) return 404;
  if (/不能为空|无效|必须|格式|扩展名|已过期|失效|邀请码/.test(message)) return 400;
  if (error instanceof SyntaxError) return 400;
  return 500;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function readRawBody(req, maxBytes = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('上传文件过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function normalizeChannel(input) {
  return input === 'phone' ? 'phone' : input === 'email' ? 'email' : null;
}

function normalizeScene(input) {
  return input === 'register' || input === 'reset' || input === 'bind' || input === 'unbind' || input === 'deactivate'
    ? input
    : null;
}

function normalizeTarget(channel, target) {
  const value = String(target || '').trim();
  if (channel === 'phone') {
    return /^1[3-9]\d{9}$/.test(value) ? value : null;
  }
  if (channel === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
  }
  return null;
}

function normalizeInviteCode(input) {
  const value = String(input || '').trim().toUpperCase();
  return value || null;
}

function normalizeInviteGrantKind(input) {
  return input === 'strategy_project' ? 'strategy_project' : 'member_days';
}

function normalizeCommentStatus(input) {
  return input === 'pending' || input === 'approved' || input === 'rejected' ? input : null;
}

function normalizeUserStatus(input) {
  return input === 'active' || input === 'disabled' || input === 'deactivated' ? input : null;
}

function normalizePaidSource(input) {
  return input === 'manual' || input === 'invite_code' || input === 'payment' || input === 'strategy_client'
    ? input
    : null;
}

function normalizeStrategyScope(input) {
  return input === 'admin' ? 'admin' : 'published';
}

function normalizeBool(input, fallback = false) {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    if (input === 'true') return true;
    if (input === 'false') return false;
  }
  return fallback;
}

function textArray(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function safeText(input, fallback = '') {
  const value = String(input || '').trim();
  return value || fallback;
}

function toPositiveInt(input, fallback = 0) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function normalizeStrategyStatus(input) {
  return input === 'done' || input === 'current' || input === 'pending' ? input : 'pending';
}

function toProjectSlug(input) {
  const value = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return value || `project-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizePublicLink(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  return /^(https?:)?\/\//i.test(value) || value.startsWith('mailto:') ? value : '';
}

function nowDateText() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePlanId(input) {
  return Object.prototype.hasOwnProperty.call(PAYMENT_PLANS, input) ? input : null;
}

function normalizeUploadKind(input) {
  return input === 'report'
    || input === 'book'
    || input === 'insight'
    || input === 'methodology'
    || input === 'cover-preset'
    || input === 'case-logo'
    || input === 'case-ppt'
    ? input
    : null;
}

function sanitizeUploadFilename(input, fallbackExt = '.pdf') {
  const raw = decodeURIComponent(String(input || '').trim());
  const base = path.basename(raw || `upload${fallbackExt}`);
  const safe = base
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!safe) return `upload${fallbackExt}`;
  if (path.extname(safe)) return safe;
  return `${safe}${fallbackExt}`;
}

function normalizeReleasePlatform(input) {
  return ['mac', 'windows', 'android', 'ios'].includes(input) ? input : 'mac';
}

function normalizeReleaseArch(input, platform = 'mac') {
  const raw = safeText(input).toLowerCase();
  if (['arm64', 'x64', 'universal', 'ia32'].includes(raw)) return raw;
  if (platform === 'windows') return 'x64';
  if (platform === 'android' || platform === 'ios') return 'universal';
  return 'arm64';
}

function normalizeArtifactType(input) {
  return ['installer', 'blockmap', 'manifest'].includes(input) ? input : 'installer';
}

function allowedInstallerExtensions(platform) {
  if (platform === 'windows') return ['.exe', '.zip'];
  if (platform === 'android') return ['.apk', '.aab'];
  if (platform === 'ios') return ['.ipa'];
  return ['.dmg', '.zip'];
}

function installerUploadError(platform) {
  if (platform === 'windows') return 'Windows 安装包仅支持 .exe 或 .zip';
  if (platform === 'android') return 'Android 安装包仅支持 .apk 或 .aab（当前仅预留入口）';
  if (platform === 'ios') return 'iOS 安装包仅支持 .ipa（当前仅预留入口）';
  return 'macOS 安装包仅支持 .dmg 或 .zip';
}

function normalizeReleaseStatus(input, fallback = 'draft') {
  return ['draft', 'testing', 'published', 'rolled_back'].includes(input) ? input : fallback;
}

function normalizeCustomPackageStatus(input, fallback = 'testing') {
  return ['testing', 'ready', 'paused', 'archived'].includes(input) ? input : fallback;
}

function normalizeOrgCode(input) {
  return safeText(input)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeCanonicalOrgCode(input) {
  return safeText(input)
    .toLowerCase()
    .replace(/\s+/g, '');
}

function orgAliasVariants(...values) {
  const aliases = new Set();
  for (const value of values.flat()) {
    const raw = safeText(value);
    if (!raw) continue;
    aliases.add(raw.toLowerCase());
    const normalized = normalizeOrgCode(raw);
    if (normalized) aliases.add(normalized);
    const canonical = normalizeCanonicalOrgCode(raw);
    if (canonical) aliases.add(canonical);
  }
  return [...aliases].filter(Boolean);
}

function normalizeAssignmentTargetType(input) {
  return input === 'org' || input === 'group' ? input : 'all';
}

function normalizeAssignmentStatus(input, fallback = 'active') {
  return ['active', 'paused', 'rolled_back'].includes(input) ? input : fallback;
}

function normalizeFeedbackStatus(input, fallback = 'open') {
  return ['open', 'confirmed', 'triaged', 'in_progress', 'resolved', 'next_release', 'wontfix', 'closed'].includes(input) ? input : fallback;
}

function normalizeFeedbackSeverity(input, fallback = 'minor') {
  return ['blocker', 'impaired', 'minor'].includes(input) ? input : fallback;
}

function normalizeFeedbackKind(input, fallback = 'experience') {
  return ['bug', 'lag', 'inaccurate', 'feature', 'experience'].includes(input) ? input : fallback;
}

function normalizeBetaUserType(input) {
  return input === 'enterprise' || input === 'individual' ? input : 'nonprofit';
}

function normalizeBetaCode(input) {
  return safeText(input).toUpperCase().replace(/\s+/g, '');
}

function generateBetaCode() {
  return `YIYU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function sha512Hex(buffer) {
  return crypto.createHash('sha512').update(buffer).digest('hex');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function yyyymmdd(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function tosSdkConfigured() {
  return Boolean(TOS_BUCKET && TOS_ENDPOINT && TOS_ACCESS_KEY_ID && TOS_SECRET_ACCESS_KEY);
}

function tosutilConfigured() {
  return Boolean(TOS_BUCKET && TOSUTIL_BIN);
}

function tosConfigured() {
  return tosSdkConfigured() || tosutilConfigured();
}

function encodeTosKey(objectKey) {
  return String(objectKey || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function releaseObjectKey(...parts) {
  return [TOS_RELEASE_PREFIX, ...parts]
    .map((part) => safeText(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

function tosPublicUrl(objectKey) {
  if (!objectKey) return '';
  if (TOS_PUBLIC_BASE_URL) return `${TOS_PUBLIC_BASE_URL}/${encodeTosKey(objectKey)}`;
  if (!TOS_BUCKET || !TOS_ENDPOINT) return '';
  return `https://${TOS_BUCKET}.${TOS_ENDPOINT}/${encodeTosKey(objectKey)}`;
}

let tosClientPromise = null;

async function getTosSdkClient() {
  if (!tosSdkConfigured()) return null;
  if (!tosClientPromise) {
    tosClientPromise = import('@volcengine/tos-sdk')
      .then((mod) => {
        const TosClient = mod.TosClient || mod.default?.TosClient || mod.default;
        if (!TosClient) throw new Error('TOS SDK 未提供 TosClient');
        return new TosClient({
          accessKeyId: TOS_ACCESS_KEY_ID,
          accessKeySecret: TOS_SECRET_ACCESS_KEY,
          region: TOS_REGION,
          endpoint: TOS_ENDPOINT,
        });
      })
      .catch((error) => {
        tosClientPromise = null;
        throw error;
      });
  }
  return tosClientPromise;
}

async function putTosObjectWithSdk(objectKey, buffer, contentType) {
  const client = await getTosSdkClient();
  if (!client) return null;
  await client.putObject({
    bucket: TOS_BUCKET,
    key: objectKey,
    body: buffer,
    contentType,
  });
  return {
    objectKey,
    publicUrl: tosPublicUrl(objectKey),
  };
}

async function putTosObjectWithTosutil(objectKey, buffer) {
  if (!tosutilConfigured()) return null;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yiyu-tos-upload-'));
  const tempFile = path.join(tempDir, 'object');
  try {
    await fs.writeFile(tempFile, buffer);
    const env = { ...process.env };
    if (TOSUTIL_HOME) env.HOME = TOSUTIL_HOME;
    await new Promise((resolve, reject) => {
      const child = spawn(TOSUTIL_BIN, ['cp', tempFile, `tos://${TOS_BUCKET}/${objectKey}`, '-fr'], {
        env,
        stdio: 'ignore',
      });
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('TOS 上传超时'));
      }, 60 * 60 * 1000);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`TOS 上传失败${signal ? `(${signal})` : code != null ? `(${code})` : ''}`));
      });
    });
    return {
      objectKey,
      publicUrl: tosPublicUrl(objectKey),
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function putTosObject(objectKey, buffer, contentType = 'application/octet-stream') {
  if (!tosConfigured()) return null;
  if (tosutilConfigured()) {
    return putTosObjectWithTosutil(objectKey, buffer);
  }
  try {
    return await putTosObjectWithSdk(objectKey, buffer, contentType);
  } catch (error) {
    if (!String(error?.message || '').includes('Cannot find package')) {
      throw new Error(`TOS 上传失败${error?.statusCode ? `(${error.statusCode})` : ''}，请检查服务端最小权限配置`);
    }
  }
  const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const now = new Date();
  const dateStamp = yyyymmdd(now);
  const timestamp = amzDate(now);
  const host = `${TOS_BUCKET}.${TOS_ENDPOINT}`;
  const canonicalUri = `/${encodeTosKey(objectKey)}`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${timestamp}`,
    '',
  ].join('\n');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${TOS_REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const kDate = hmac(`AWS4${TOS_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, TOS_REGION);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${TOS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': timestamp,
    },
    body: buffer,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`TOS 上传失败(${response.status})${detail ? '，请检查服务端最小权限配置' : ''}`);
  }
  return {
    objectKey,
    publicUrl: tosPublicUrl(objectKey),
  };
}

function contentTypeForFilename(filename) {
  const lower = safeText(filename).toLowerCase();
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'text/yaml; charset=utf-8';
  if (lower.endsWith('.dmg')) return 'application/x-apple-diskimage';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.exe')) return 'application/vnd.microsoft.portable-executable';
  if (lower.endsWith('.blockmap')) return 'application/octet-stream';
  return 'application/octet-stream';
}

function mapRelease(row, packages = [], latestTosSyncJob = null) {
  return {
    id: row.id,
    version: row.version,
    gitTag: row.git_tag || null,
    sourceCommit: row.source_commit || null,
    status: row.status || 'draft',
    platforms: Array.isArray(row.platforms) ? row.platforms : [],
    mandatory: Boolean(row.mandatory),
    userNotes: row.user_notes || {},
    internalNotes: row.internal_notes || '',
    screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || null,
    latestTosSyncJob,
    packages,
  };
}

function mapReleasePackage(row) {
  return {
    id: row.id,
    releaseId: row.release_id,
    platform: row.platform,
    arch: row.arch || normalizeReleaseArch('', row.platform || 'mac'),
    artifactType: row.artifact_type || 'installer',
    fileName: row.file_name,
    sizeBytes: Number(row.size_bytes || 0),
    sha512: row.sha512 || '',
    downloadUrl: row.download_url || '',
    publicUrl: row.public_url || null,
    tosObjectKey: row.tos_object_key || null,
    tosBlockmapObjectKey: row.tos_blockmap_object_key || null,
    blockmapUrl: row.blockmap_url || null,
    downloadable: Boolean(row.downloadable),
    publishedAt: row.published_at || null,
  };
}

function mapCustomPackage(row) {
  return {
    id: row.id,
    baseReleaseId: row.base_release_id,
    baseVersion: row.base_version || null,
    name: row.name || '',
    versionLabel: row.version_label || '',
    differenceNotes: row.difference_notes || '',
    platform: row.platform || 'mac',
    arch: row.arch || normalizeReleaseArch('', row.platform || 'mac'),
    fileName: row.file_name || '',
    sizeBytes: Number(row.size_bytes || 0),
    sha512: row.sha512 || '',
    downloadUrl: row.download_url || '',
    publicUrl: row.public_url || null,
    tosObjectKey: row.tos_object_key || null,
    tosBlockmapObjectKey: row.tos_blockmap_object_key || null,
    blockmapUrl: row.blockmap_url || null,
    status: row.status || 'testing',
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readyAt: row.ready_at || null,
  };
}

function mapAssignment(row) {
  return {
    id: row.id,
    releaseId: row.release_id,
    releaseVersion: row.release_version || null,
    customPackageId: row.custom_package_id || null,
    customPackageName: row.custom_package_name || null,
    customPackageStatus: row.custom_package_status || null,
    platform: row.platform || 'all',
    targetType: row.target_type,
    orgCode: row.org_code || null,
    rolloutPct: Number(row.rollout_pct || 100),
    mandatory: Boolean(row.mandatory),
    status: row.status || 'active',
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFeedback(row) {
  return {
    id: row.id,
    kind: row.kind || 'experience',
    severity: row.severity || 'minor',
    title: row.title || '',
    description: row.description || '',
    submitterUserId: row.submitter_user_id || null,
    submitterName: row.submitter_name || '',
    orgCode: row.org_code || null,
    version: row.version || null,
    page: row.page || null,
    os: row.os || null,
    screenshotUrl: row.screenshot_url || null,
    logExcerpt: row.log_excerpt || null,
    status: row.status || 'open',
    dupOf: row.dup_of || null,
    linkedTaskId: row.linked_task_id || null,
    linkedReleaseId: row.linked_release_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrgSummary(row) {
  const aliases = Array.isArray(row.aliases) ? row.aliases : [];
  const canonicalOrgCode = normalizeCanonicalOrgCode(row.canonical_org_code || row.source_org_id || row.code);
  const publicAliases = orgAliasVariants(aliases, row.code, row.source_org_id)
    .filter((item) => item && item !== canonicalOrgCode);
  return {
    id: row.id,
    name: row.name,
    code: canonicalOrgCode || row.code,
    canonicalOrgCode: canonicalOrgCode || null,
    legacyCode: row.code || null,
    aliases: [...new Set(publicAliases)],
    source: row.source || 'manual',
    sourceOrgId: row.source_org_id || null,
    sourceCloudUrl: row.source_cloud_url || null,
    departmentCount: Number(row.department_count || 0),
    inviteCount: Number(row.invite_count || 0),
    departments: Array.isArray(row.departments) ? row.departments : [],
    memberCount: Number(row.member_count || 0),
    installCount: Number(row.install_count || 0),
    lastSeenAt: row.last_seen_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapBetaApplication(row) {
  return {
    id: row.id,
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    userType: row.user_type || 'nonprofit',
    orgName: row.org_name || undefined,
    purpose: row.purpose || undefined,
    headcount: row.headcount || undefined,
    focusIssue: row.focus_issue || undefined,
    beneficiaryCount: row.beneficiary_count || undefined,
    cloudCredit: row.cloud_credit || [],
    status: row.status || 'pending',
    code: row.code || undefined,
    sentAt: row.sent_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listReleasePackages(releaseId) {
  const q = await pool.query(
    `SELECT * FROM release_packages WHERE release_id=$1 ORDER BY platform ASC, arch ASC, created_at DESC`,
    [releaseId]
  );
  return q.rows.map(mapReleasePackage);
}

async function getReleaseById(releaseId) {
  const q = await pool.query('SELECT * FROM release_versions WHERE id=$1 LIMIT 1', [releaseId]);
  if (!q.rows[0]) return null;
  return mapRelease(q.rows[0], await listReleasePackages(releaseId));
}

async function listReleaseRows() {
  const q = await pool.query('SELECT * FROM release_versions ORDER BY created_at DESC, version DESC');
  const packages = await pool.query('SELECT * FROM release_packages ORDER BY created_at DESC');
  const jobs = await pool.query(
    `SELECT DISTINCT ON (release_id) *
     FROM release_tos_sync_jobs
     ORDER BY release_id, updated_at DESC`
  );
  const byRelease = new Map();
  for (const row of packages.rows) {
    const list = byRelease.get(row.release_id) || [];
    list.push(mapReleasePackage(row));
    byRelease.set(row.release_id, list);
  }
  const jobByRelease = new Map(jobs.rows.map((row) => [row.release_id, mapTosSyncJob(row)]));
  return q.rows.map((row) => mapRelease(row, byRelease.get(row.id) || [], jobByRelease.get(row.id) || null));
}

async function upsertReleasePackage(releaseId, platform, fileBuffer, filename, archInput = '') {
  const normalizedPlatform = normalizeReleasePlatform(platform);
  if (normalizedPlatform === 'android' || normalizedPlatform === 'ios') {
    throw new Error('移动端安装包入口本轮仅预留，暂不开放上传');
  }
  const arch = normalizeReleaseArch(archInput, normalizedPlatform);
  const safeFilename = sanitizeUploadFilename(filename, normalizedPlatform === 'windows' ? '.exe' : '.dmg');
  const ext = path.extname(safeFilename).toLowerCase();
  if (!allowedInstallerExtensions(normalizedPlatform).includes(ext)) {
    throw new Error(installerUploadError(normalizedPlatform));
  }
  const release = await getReleaseById(releaseId);
  if (!release) throw new Error('版本不存在');
  const targetDir = path.join(RELEASE_ASSET_ROOT, normalizedPlatform, arch, release.version);
  await fs.mkdir(targetDir, { recursive: true });
  const storedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeFilename}`;
  const targetPath = path.join(targetDir, storedName);
  await fs.writeFile(targetPath, fileBuffer);
  const id = crypto.randomUUID();
  const downloadUrl = `/api/v1/downloads/package/${id}`;
  const q = await pool.query(
    `INSERT INTO release_packages(
       id, release_id, platform, arch, artifact_type, file_name, storage_path,
       tos_object_key, public_url, size_bytes, sha512, download_url, downloadable, published_at
     ) VALUES ($1,$2,$3,$4,'installer',$5,$6,$7,$8,$9,$10,$11,true,NULL)
     RETURNING *`,
    [
      id,
      releaseId,
      normalizedPlatform,
      arch,
      safeFilename,
      targetPath,
      null,
      null,
      fileBuffer.length,
      sha512Hex(fileBuffer),
      downloadUrl,
    ]
  );
  await pool.query(
    `UPDATE release_versions
     SET platforms = (
       SELECT ARRAY(SELECT DISTINCT unnest(array_append(platforms, $1)) ORDER BY 1)
     ),
     updated_at=now()
     WHERE id=$2`,
    [normalizedPlatform, releaseId]
  );
  return mapReleasePackage(q.rows[0]);
}

async function attachReleaseBlockmap(releaseId, packageId, fileBuffer, filename) {
  const safeFilename = sanitizeUploadFilename(filename, '.blockmap');
  if (!safeFilename.endsWith('.blockmap')) throw new Error('blockmap 文件扩展名必须是 .blockmap');
  const q = await pool.query('SELECT * FROM release_packages WHERE id=$1 AND release_id=$2 LIMIT 1', [packageId, releaseId]);
  const pkg = q.rows[0];
  if (!pkg) throw new Error('安装包不存在');
  const targetDir = path.dirname(pkg.storage_path);
  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeFilename}`);
  await fs.writeFile(targetPath, fileBuffer);
  const blockmapUrl = `/api/v1/downloads/package/${packageId}/blockmap`;
  const objectKey = pkg.tos_object_key
    ? `${pkg.tos_object_key}.blockmap`
    : releaseObjectKey(pkg.platform || 'mac', pkg.arch || normalizeReleaseArch('', pkg.platform || 'mac'), 'blockmap', safeFilename);
  let tosObject = null;
  if (tosConfigured()) {
    tosObject = await putTosObject(objectKey, fileBuffer, contentTypeForFilename(safeFilename));
  }
  const updated = await pool.query(
    `UPDATE release_packages
     SET blockmap_path=$1, blockmap_url=$2, tos_blockmap_object_key=$3, updated_at=now()
     WHERE id=$4
     RETURNING *`,
    [targetPath, blockmapUrl, tosObject?.objectKey || null, packageId]
  );
  return mapReleasePackage(updated.rows[0]);
}

async function listCustomPackages() {
  const q = await pool.query(
    `SELECT cp.*, r.version AS base_version
     FROM release_custom_packages cp
     JOIN release_versions r ON r.id = cp.base_release_id
     ORDER BY cp.created_at DESC`
  );
  return q.rows.map(mapCustomPackage);
}

async function createCustomPackage(payload, fileBuffer, filename) {
  const baseReleaseId = safeText(payload.baseReleaseId);
  const base = await getReleaseById(baseReleaseId);
  if (!base) throw new Error('基准版本不存在');
  const platform = normalizeReleasePlatform(payload.platform);
  if (platform === 'android' || platform === 'ios') {
    throw new Error('移动端定制包入口本轮仅预留，暂不开放上传');
  }
  const arch = normalizeReleaseArch(payload.arch, platform);
  const safeFilename = sanitizeUploadFilename(filename, platform === 'windows' ? '.exe' : '.dmg');
  const ext = path.extname(safeFilename).toLowerCase();
  if (!allowedInstallerExtensions(platform).includes(ext)) throw new Error(installerUploadError(platform));
  const name = safeText(payload.name);
  if (!name) throw new Error('请填写定制版名称');
  const versionLabel = safeText(payload.versionLabel, `${base.version}-custom.${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}`);
  const status = normalizeCustomPackageStatus(payload.status);
  const targetDir = path.join(RELEASE_ASSET_ROOT, 'custom', platform, arch, versionLabel);
  await fs.mkdir(targetDir, { recursive: true });
  const storedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeFilename}`;
  const targetPath = path.join(targetDir, storedName);
  await fs.writeFile(targetPath, fileBuffer);
  const id = crypto.randomUUID();
  const downloadUrl = `/api/v1/updates/packages/custom/${id}`;
  const objectKey = releaseObjectKey('custom', platform, arch, id, safeFilename);
  let tosObject = null;
  if (tosConfigured()) {
    tosObject = await putTosObject(objectKey, fileBuffer, contentTypeForFilename(safeFilename));
  }
  const q = await pool.query(
    `INSERT INTO release_custom_packages(
       id, base_release_id, name, version_label, difference_notes, platform, arch,
       file_name, storage_path, tos_object_key, public_url, size_bytes, sha512, download_url, status, created_by, ready_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      id,
      baseReleaseId,
      name,
      versionLabel,
      safeText(payload.differenceNotes),
      platform,
      arch,
      safeFilename,
      targetPath,
      tosObject?.objectKey || null,
      tosObject?.publicUrl || null,
      fileBuffer.length,
      sha512Hex(fileBuffer),
      downloadUrl,
      status,
      safeText(payload.createdBy) || null,
      status === 'ready' ? new Date().toISOString() : null,
    ]
  );
  q.rows[0].base_version = base.version;
  return mapCustomPackage(q.rows[0]);
}

async function attachCustomPackageBlockmap(customPackageId, fileBuffer, filename) {
  const safeFilename = sanitizeUploadFilename(filename, '.blockmap');
  if (!safeFilename.endsWith('.blockmap')) throw new Error('blockmap 文件扩展名必须是 .blockmap');
  const q = await pool.query('SELECT * FROM release_custom_packages WHERE id=$1 LIMIT 1', [customPackageId]);
  const pkg = q.rows[0];
  if (!pkg) throw new Error('定制包不存在');
  const targetDir = path.dirname(pkg.storage_path);
  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeFilename}`);
  await fs.writeFile(targetPath, fileBuffer);
  const blockmapUrl = `/api/v1/updates/packages/custom/${customPackageId}/blockmap`;
  const objectKey = pkg.tos_object_key
    ? `${pkg.tos_object_key}.blockmap`
    : releaseObjectKey('custom', pkg.platform || 'mac', pkg.arch || normalizeReleaseArch('', pkg.platform || 'mac'), customPackageId, safeFilename);
  let tosObject = null;
  if (tosConfigured()) {
    tosObject = await putTosObject(objectKey, fileBuffer, contentTypeForFilename(safeFilename));
  }
  const updated = await pool.query(
    `UPDATE release_custom_packages
     SET blockmap_path=$1, blockmap_url=$2, tos_blockmap_object_key=$3, updated_at=now()
     WHERE id=$4
     RETURNING *`,
    [targetPath, blockmapUrl, tosObject?.objectKey || null, customPackageId]
  );
  const base = await pool.query('SELECT version FROM release_versions WHERE id=$1 LIMIT 1', [updated.rows[0].base_release_id]);
  updated.rows[0].base_version = base.rows[0]?.version || null;
  return mapCustomPackage(updated.rows[0]);
}

async function patchCustomPackage(customPackageId, payload) {
  const fields = [];
  const values = [];
  const add = (sql, value) => { values.push(value); fields.push(`${sql}=$${values.length}`); };
  if (payload.name != null) add('name', safeText(payload.name));
  if (payload.versionLabel != null) add('version_label', safeText(payload.versionLabel));
  if (payload.differenceNotes != null) add('difference_notes', safeText(payload.differenceNotes));
  if (payload.status != null) {
    const status = normalizeCustomPackageStatus(payload.status);
    add('status', status);
    if (status === 'ready') fields.push('ready_at=COALESCE(ready_at, now())');
  }
  if (!fields.length) throw new Error('没有可更新字段');
  fields.push('updated_at=now()');
  values.push(customPackageId);
  const q = await pool.query(
    `UPDATE release_custom_packages SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`,
    values
  );
  if (!q.rows[0]) throw new Error('定制包不存在');
  const base = await pool.query('SELECT version FROM release_versions WHERE id=$1 LIMIT 1', [q.rows[0].base_release_id]);
  q.rows[0].base_version = base.rows[0]?.version || null;
  return mapCustomPackage(q.rows[0]);
}

function absolutizeSitePath(pathname) {
  if (/^https?:\/\//i.test(String(pathname || ''))) return pathname;
  return new URL(String(pathname || '/'), PUBLIC_SITE_URL).toString();
}

function sha512ForElectronUpdater(value) {
  const raw = safeText(value);
  return /^[a-f0-9]{128}$/i.test(raw) ? Buffer.from(raw, 'hex').toString('base64') : raw;
}

function packageDownloadPath(kind, id, blockmap = false) {
  return `/api/v1/updates/packages/${kind}/${encodeURIComponent(id)}${blockmap ? '/blockmap' : ''}`;
}

function buildUpdatePayloadFromPackage(pkg, kind, releaseVersion, customPackage = null) {
  const blockmapPath = pkg.blockmap_path || null;
  const downloadUrl = pkg.public_url || absolutizeSitePath(packageDownloadPath(kind, pkg.id));
  const blockmapUrl = pkg.tos_blockmap_object_key
    ? tosPublicUrl(pkg.tos_blockmap_object_key)
    : (blockmapPath ? absolutizeSitePath(packageDownloadPath(kind, pkg.id, true)) : null);
  const rawDate = pkg.ready_at || pkg.published_at || pkg.updated_at || pkg.created_at || null;
  const releaseDate = rawDate instanceof Date ? rawDate.toISOString() : safeText(rawDate, new Date().toISOString());
  return {
    version: customPackage?.version_label || releaseVersion,
    displayVersion: customPackage?.version_label || releaseVersion,
    updaterVersion: releaseVersion,
    releaseVersion,
    platform: pkg.platform || customPackage?.platform || 'mac',
    arch: pkg.arch || customPackage?.arch || normalizeReleaseArch('', pkg.platform || 'mac'),
    packageKind: kind,
    customPackageId: customPackage?.id || null,
    customPackageName: customPackage?.name || null,
    fileName: pkg.file_name,
    sizeBytes: Number(pkg.size_bytes || 0),
    sha512: sha512ForElectronUpdater(pkg.sha512),
    downloadUrl,
    blockmapUrl,
    releaseDate,
  };
}

function renderLatestYml(update) {
  const updaterVersion = update.updaterVersion || update.releaseVersion || update.version;
  const lines = [
    `version: ${JSON.stringify(updaterVersion)}`,
    'files:',
    `  - url: ${JSON.stringify(update.downloadUrl)}`,
    `    sha512: ${JSON.stringify(update.sha512)}`,
    `    size: ${Number(update.sizeBytes || 0)}`,
    `path: ${JSON.stringify(update.downloadUrl)}`,
    `sha512: ${JSON.stringify(update.sha512)}`,
    `releaseDate: ${JSON.stringify(update.releaseDate)}`,
  ];
  return `${lines.join('\n')}\n`;
}

const renderLatestMacYml = renderLatestYml;

function serializeTosSyncJob(job) {
  return {
    id: job.id,
    releaseId: job.releaseId,
    status: job.status,
    stage: job.stage,
    percent: job.percent,
    message: job.message,
    tosConfigured: job.tosConfigured,
    manifests: job.manifests || [],
    error: job.error || null,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt || null,
  };
}

function mapTosSyncJob(row) {
  if (!row) return null;
  const startedAt = row.started_at instanceof Date ? row.started_at.toISOString() : safeText(row.started_at);
  const updatedAt = row.updated_at instanceof Date ? row.updated_at.toISOString() : safeText(row.updated_at);
  const completedAt = row.completed_at instanceof Date ? row.completed_at.toISOString() : (row.completed_at ? safeText(row.completed_at) : null);
  return {
    id: row.id,
    releaseId: row.release_id,
    status: row.status,
    stage: row.stage,
    percent: Number(row.percent || 0),
    message: row.message || '',
    tosConfigured: Boolean(row.tos_configured),
    manifests: Array.isArray(row.manifests) ? row.manifests : [],
    error: row.error || null,
    startedAt,
    updatedAt,
    completedAt,
  };
}

async function getTosSyncJob(jobId, releaseId = null) {
  const params = releaseId ? [jobId, releaseId] : [jobId];
  const q = await pool.query(
    `SELECT * FROM release_tos_sync_jobs
     WHERE id=$1${releaseId ? ' AND release_id=$2' : ''}
     LIMIT 1`,
    params
  );
  return mapTosSyncJob(q.rows[0]);
}

async function findRunningTosSyncJob(releaseId) {
  const q = await pool.query(
    `SELECT * FROM release_tos_sync_jobs
     WHERE release_id=$1 AND status IN ('queued','running')
     ORDER BY updated_at DESC
     LIMIT 1`,
    [releaseId]
  );
  return mapTosSyncJob(q.rows[0]);
}

async function createTosSyncJob(releaseId, adminId) {
  const id = crypto.randomUUID();
  const q = await pool.query(
    `INSERT INTO release_tos_sync_jobs(
       id, release_id, status, stage, percent, message, tos_configured, manifests, error, created_by
     ) VALUES ($1,$2,'queued','queued',1,$3,$4,'[]'::jsonb,NULL,$5)
     RETURNING *`,
    [id, releaseId, '已创建 TOS 更新任务，等待服务器开始处理。', tosConfigured(), adminId || null]
  );
  return mapTosSyncJob(q.rows[0]);
}

async function updateTosSyncJob(job, patch) {
  const next = { ...job, ...patch };
  const q = await pool.query(
    `UPDATE release_tos_sync_jobs
     SET status=$2,
         stage=$3,
         percent=$4,
         message=$5,
         tos_configured=$6,
         manifests=$7::jsonb,
         error=$8,
         updated_at=now(),
         completed_at=$9
     WHERE id=$1
     RETURNING *`,
    [
      job.id,
      next.status,
      next.stage,
      Math.max(0, Math.min(100, Number(next.percent || 0))),
      next.message || '',
      Boolean(next.tosConfigured),
      JSON.stringify(next.manifests || []),
      next.error || null,
      next.completedAt || null,
    ]
  );
  const mapped = mapTosSyncJob(q.rows[0]);
  if (mapped) Object.assign(job, mapped);
  return mapped || job;
}

async function startReleaseTosSyncJob(releaseId, adminId) {
  const existing = await findRunningTosSyncJob(releaseId);
  if (existing) return existing;

  const job = await createTosSyncJob(releaseId, adminId);

  setImmediate(async () => {
    try {
      await updateTosSyncJob(job, {
        status: 'running',
        stage: 'preparing',
        percent: 5,
        message: '正在读取版本与安装包信息。',
      });
      const manifests = await publishReleaseManifests(releaseId, (progress) => {
        return updateTosSyncJob(job, {
          status: 'running',
          ...progress,
        });
      });
      if (!manifests.length) {
        throw new Error('至少上传一个 Mac 或 Windows 安装包后才能同步 TOS 更新源');
      }
      await updateTosSyncJob(job, {
        status: 'succeeded',
        stage: 'completed',
        percent: 100,
        message: `TOS 更新完成，已更新 ${manifests.length} 个平台 latest 清单。`,
        manifests,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      await updateTosSyncJob(job, {
        status: 'failed',
        stage: 'failed',
        percent: Math.max(Number(job.percent || 0), 1),
        message: 'TOS 更新失败。',
        error: error?.message || String(error),
        completedAt: new Date().toISOString(),
      });
      console.warn('[release] TOS sync job failed:', error?.message || error);
    }
  });

  return job;
}

async function publishReleaseManifests(releaseId, onProgress = null) {
  const release = await getReleaseById(releaseId);
  if (!release) throw new Error('版本不存在');
  const platforms = [...new Set((release.platforms || ['mac']).map(normalizeReleasePlatform))];
  const activePlatforms = platforms.filter((platform) => platform !== 'android' && platform !== 'ios');
  const published = [];
  for (const [index, platform] of activePlatforms.entries()) {
    if (platform === 'android' || platform === 'ios') continue;
    const basePercent = 10 + Math.floor((index / Math.max(activePlatforms.length, 1)) * 80);
    const nextPercent = 10 + Math.floor(((index + 1) / Math.max(activePlatforms.length, 1)) * 80);
    const pkgQ = await pool.query(
      `SELECT p.*, r.version
       FROM release_packages p
       JOIN release_versions r ON r.id = p.release_id
       WHERE p.release_id=$1 AND p.platform=$2 AND p.downloadable=true
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [releaseId, platform]
    );
    const pkg = pkgQ.rows[0];
    if (!pkg) continue;
    await onProgress?.({
      stage: `uploading-${platform}`,
      percent: basePercent,
      message: `正在同步 ${platform === 'windows' ? 'Windows' : 'Mac'} 安装包到 TOS。`,
    });
    const syncedPkg = await ensureReleasePackageOnTos(pkg, release.version, onProgress, {
      platform,
      basePercent,
      nextPercent: Math.max(basePercent + 35, nextPercent - 10),
    });
    if (tosConfigured() && !syncedPkg.public_url) {
      throw new Error(`${platform === 'windows' ? 'Windows' : 'Mac'} 安装包尚未成功上传到 TOS，已停止写入 latest 清单`);
    }
    const update = buildUpdatePayloadFromPackage(syncedPkg, 'release', release.version, null);
    const manifest = renderLatestYml(update);
    const manifestFileName = platform === 'windows' ? 'latest.yml' : 'latest-mac.yml';
    const manifestKey = releaseObjectKey(platform, manifestFileName);
    if (tosConfigured()) {
      try {
        await onProgress?.({
          stage: `manifest-${platform}`,
          percent: Math.max(basePercent + 35, nextPercent - 10),
          message: `正在写入 ${platform === 'windows' ? 'Windows' : 'Mac'} latest 清单。`,
        });
        await putTosObject(manifestKey, Buffer.from(manifest, 'utf8'), contentTypeForFilename(manifestFileName));
      } catch (error) {
        console.warn('[release] TOS manifest upload skipped:', error?.message || error);
      }
    }
    await pool.query(
      `UPDATE release_packages
       SET published_at=COALESCE(published_at, now()), updated_at=now()
       WHERE id=$1`,
      [pkg.id]
    );
    await onProgress?.({
      stage: `done-${platform}`,
      percent: nextPercent,
      message: `${platform === 'windows' ? 'Windows' : 'Mac'} TOS 清单已处理。`,
    });
    published.push({ platform, manifestKey: tosConfigured() ? manifestKey : null, packageId: syncedPkg.id });
  }
  return published;
}

async function ensureReleasePackageOnTos(pkg, version, onProgress = null, progressContext = {}) {
  if (!tosConfigured()) return pkg;
  let next = { ...pkg };
  const updates = {};
  if (!next.tos_object_key || !next.public_url) {
    const objectKey = releaseObjectKey(
      next.platform || 'mac',
      next.arch || normalizeReleaseArch('', next.platform || 'mac'),
      version || 'unknown',
      next.file_name
    );
    const buffer = await fs.readFile(next.storage_path);
    try {
      await onProgress?.({
        stage: `uploading-${next.platform || 'package'}`,
        percent: progressContext.basePercent || 20,
        message: `正在上传 ${next.file_name} 到 TOS。`,
      });
      const uploaded = await putTosObject(objectKey, buffer, contentTypeForFilename(next.file_name));
      updates.tos_object_key = uploaded.objectKey;
      updates.public_url = uploaded.publicUrl;
      next.tos_object_key = uploaded.objectKey;
      next.public_url = uploaded.publicUrl;
      await onProgress?.({
        stage: `uploaded-${next.platform || 'package'}`,
        percent: progressContext.nextPercent || 70,
        message: `${next.file_name} 已上传到 TOS，准备写入 latest 清单。`,
      });
    } catch (error) {
      console.warn('[release] TOS package sync skipped:', error?.message || error);
      throw error;
    }
  }
  if (next.blockmap_path && !next.tos_blockmap_object_key) {
    const blockmapKey = `${next.tos_object_key || releaseObjectKey(next.platform || 'mac', next.arch || normalizeReleaseArch('', next.platform || 'mac'), version || 'unknown', next.file_name)}.blockmap`;
    await onProgress?.({
      stage: `blockmap-${next.platform || 'package'}`,
      percent: Math.max(progressContext.basePercent || 20, (progressContext.nextPercent || 70) - 5),
      message: `正在上传 ${next.file_name}.blockmap 到 TOS。`,
    });
    await putTosObject(blockmapKey, await fs.readFile(next.blockmap_path), contentTypeForFilename(`${next.file_name}.blockmap`));
    updates.tos_blockmap_object_key = blockmapKey;
    next.tos_blockmap_object_key = blockmapKey;
  }
  const keys = Object.keys(updates);
  if (keys.length) {
    const values = keys.map((key) => updates[key]);
    const sets = keys.map((key, index) => `${key}=$${index + 1}`);
    values.push(next.id);
    const q = await pool.query(
      `UPDATE release_packages SET ${sets.join(', ')}, updated_at=now() WHERE id=$${values.length} RETURNING *`,
      values
    );
    next = q.rows[0] || next;
  }
  return next;
}

async function fetchWorkbenchCloudJson(pathname) {
  if (!WORKBENCH_CLOUD_API_BASE_URL || !WORKBENCH_CLOUD_API_TOKEN) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${WORKBENCH_CLOUD_API_BASE_URL}${pathname}`, {
      headers: { Authorization: `Bearer ${WORKBENCH_CLOUD_API_TOKEN}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function findOrganizationByAnyCode(code, aliases = []) {
  const variants = orgAliasVariants(code, aliases);
  if (!variants.length) return null;
  const q = await pool.query(
    `SELECT *
     FROM organizations
     WHERE lower(coalesce(canonical_org_code,'')) = ANY($1::text[])
        OR lower(coalesce(code,'')) = ANY($1::text[])
        OR lower(coalesce(source_org_id,'')) = ANY($1::text[])
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(coalesce(aliases, '[]'::jsonb)) AS alias(value)
          WHERE lower(alias.value) = ANY($1::text[])
        )
     ORDER BY source_updated_at DESC NULLS LAST, updated_at DESC
     LIMIT 1`,
    [variants]
  );
  return q.rows[0] || null;
}

function deriveOrgSummaryFromProfile(profile, employees = []) {
  const org = profile?.organization || profile?.data?.organization || null;
  if (!org) return null;
  const sourceOrgId = safeText(org.organizationId || org.id || org.sourceOrgId || 'org_yiyu_default');
  const name = safeText(org.name || org.organizationName, '益语智库');
  const code = normalizeOrgCode(org.slug || org.code || org.organizationCode || sourceOrgId || name);
  const canonicalOrgCode = normalizeCanonicalOrgCode(sourceOrgId || code);
  const aliases = orgAliasVariants(code, org.slug, org.code, org.organizationCode, sourceOrgId);
  const departments = Array.isArray(profile?.departments) ? profile.departments : [];
  const activeDepartments = departments.filter((dept) => dept && dept.active !== false);
  const activeEmployees = Array.isArray(employees)
    ? employees.filter((employee) => employee && employee.accountStatus !== 'disabled')
    : [];
  return {
    name,
    code: canonicalOrgCode || code || 'yiyu',
    canonicalOrgCode: canonicalOrgCode || code || 'yiyu',
    aliases,
    sourceOrgId,
    sourceCloudUrl: WORKBENCH_CLOUD_API_BASE_URL,
    memberCount: activeEmployees.length,
    departmentCount: activeDepartments.length,
    inviteCount: activeDepartments.filter((dept) => safeText(dept.inviteCode)).length,
    departments: activeDepartments.map((dept) => ({
      id: safeText(dept.id || dept.departmentId),
      name: safeText(dept.name || dept.departmentName),
      leaderName: safeText(dept.leaderName),
    })).filter((dept) => dept.name),
  };
}

async function upsertOrganizationCache(summary, source = 'workbench-cloud') {
  if (!summary?.code || !summary?.name) return null;
  const canonicalOrgCode = normalizeCanonicalOrgCode(summary.canonicalOrgCode || summary.sourceOrgId || summary.code);
  const aliases = orgAliasVariants(summary.aliases, summary.code, summary.sourceOrgId, canonicalOrgCode)
    .filter((item) => item !== canonicalOrgCode);
  const code = canonicalOrgCode || normalizeOrgCode(summary.code);
  const existing = await findOrganizationByAnyCode(code, aliases);
  const values = [
    summary.name,
    code,
    source,
    summary.sourceOrgId || null,
    canonicalOrgCode || null,
    JSON.stringify([...new Set(aliases)]),
    safeText(summary.sourceCloudUrl) || null,
    Number(summary.memberCount || 0),
    Number(summary.departmentCount || 0),
    Number(summary.inviteCount || 0),
    JSON.stringify(summary.departments || []),
  ];
  if (existing) {
    const q = await pool.query(
      `UPDATE organizations
       SET name=$1, code=$2, source=$3, source_org_id=$4, canonical_org_code=$5,
           aliases=$6::jsonb, source_cloud_url=COALESCE($7, source_cloud_url),
           member_count=$8, department_count=$9, invite_count=$10, departments=$11::jsonb,
           source_updated_at=now(), updated_at=now()
       WHERE id=$12
       RETURNING *`,
      [...values, existing.id]
    );
    return mapOrgSummary(q.rows[0]);
  }
  const q = await pool.query(
    `INSERT INTO organizations(
       id, name, code, source, source_org_id, canonical_org_code, aliases, source_cloud_url,
       member_count, department_count, invite_count, departments, source_updated_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12::jsonb,now(),now())
     RETURNING *`,
    [
      crypto.randomUUID(),
      summary.name,
      code,
      source,
      summary.sourceOrgId || null,
      canonicalOrgCode || null,
      JSON.stringify([...new Set(aliases)]),
      safeText(summary.sourceCloudUrl) || null,
      Number(summary.memberCount || 0),
      Number(summary.departmentCount || 0),
      Number(summary.inviteCount || 0),
      JSON.stringify(summary.departments || []),
    ]
  );
  return mapOrgSummary(q.rows[0]);
}

async function seedKnownYiyuOrganizationIfEmpty() {
  await upsertOrganizationCache({
    name: '益语智库',
    code: 'org_yiyu_default',
    canonicalOrgCode: 'org_yiyu_default',
    aliases: ['yiyu', 'yiyu-thinktank', 'org_yiyu_default'],
    sourceOrgId: 'org_yiyu_default',
    memberCount: 0,
    departmentCount: 3,
    inviteCount: 0,
    departments: [
      { id: 'department_gq160gdz', name: '战略发展部', leaderName: '顾源源' },
      { id: 'department_b3zvoei7', name: '合作发展部', leaderName: '乐乐' },
      { id: '', name: '技术创新部', leaderName: '林佳维' },
    ],
  }, 'workbench-known-cache');
}

async function syncOrganizationsFromWorkbenchCloud() {
  const profile = await fetchWorkbenchCloudJson('/api/v1/settings/org-model/profile');
  if (!profile) {
    await seedKnownYiyuOrganizationIfEmpty();
    return;
  }
  const employees = await fetchWorkbenchCloudJson('/api/v1/employees/directory') || [];
  const summary = deriveOrgSummaryFromProfile(profile, employees);
  if (summary) await upsertOrganizationCache(summary, 'workbench-cloud');
}

async function listOrganizationSummaries() {
  await syncOrganizationsFromWorkbenchCloud();
  const q = await pool.query('SELECT * FROM organizations ORDER BY source_updated_at DESC NULLS LAST, created_at DESC');
  return q.rows.map(mapOrgSummary);
}

async function resolveOrgCodeAliases(orgCode) {
  const aliases = new Set(orgAliasVariants(orgCode));
  const row = await findOrganizationByAnyCode(orgCode, [...aliases]);
  if (row) {
    for (const item of orgAliasVariants(row.canonical_org_code, row.code, row.source_org_id, row.aliases)) {
      aliases.add(item);
    }
  }
  return [...aliases].map((item) => item.toLowerCase());
}

async function resolveCanonicalOrgCode(orgCode) {
  const row = await findOrganizationByAnyCode(orgCode);
  if (row) {
    return normalizeCanonicalOrgCode(row.canonical_org_code || row.source_org_id || row.code);
  }
  return normalizeCanonicalOrgCode(orgCode) || normalizeOrgCode(orgCode);
}

async function resolveReleaseOrgIdentity(payload = {}) {
  const organizationId = safeText(payload.organizationId);
  const organizationSlug = safeText(payload.organizationSlug);
  const organizationName = safeText(payload.organizationName, organizationId || organizationSlug || '未知组织');
  const cloudBackendUrl = normalizePublicLink(payload.cloudBackendUrl) || safeText(payload.cloudBackendUrl);
  const platform = normalizeReleasePlatform(payload.platform);
  const canonicalOrgCode = normalizeCanonicalOrgCode(organizationId || payload.canonicalOrgCode || organizationSlug);
  const aliases = orgAliasVariants(organizationId, organizationSlug, payload.organizationCode, payload.legacyCode, canonicalOrgCode);
  if (!canonicalOrgCode) {
    return {
      canonicalOrgCode: '',
      matchedAliases: [],
      updateFeedBaseUrl: new URL(`/api/v1/updates/public/${platform}/`, PUBLIC_SITE_URL).toString(),
    };
  }
  const existing = await findOrganizationByAnyCode(canonicalOrgCode, aliases);
  let org = existing;
  if (existing) {
    const mergedAliases = orgAliasVariants(existing.aliases, existing.code, existing.source_org_id, aliases, canonicalOrgCode)
      .filter((item) => item !== canonicalOrgCode);
    const q = await pool.query(
      `UPDATE organizations
       SET name=COALESCE(NULLIF($1,''), name),
           code=$2,
           canonical_org_code=$3,
           aliases=$4::jsonb,
           source=CASE WHEN source='manual' THEN 'client-report' ELSE source END,
           source_org_id=COALESCE(NULLIF($5,''), source_org_id),
           source_cloud_url=COALESCE(NULLIF($6,''), source_cloud_url),
           last_seen_at=now(),
           updated_at=now()
       WHERE id=$7
       RETURNING *`,
      [
        organizationName,
        canonicalOrgCode,
        canonicalOrgCode,
        JSON.stringify([...new Set(mergedAliases)]),
        organizationId || canonicalOrgCode,
        cloudBackendUrl || '',
        existing.id,
      ]
    );
    org = q.rows[0];
  } else {
    const q = await pool.query(
      `INSERT INTO organizations(
         id, name, code, source, source_org_id, canonical_org_code, aliases, source_cloud_url, last_seen_at, updated_at
       ) VALUES ($1,$2,$3,'client-report',$4,$5,$6::jsonb,$7,now(),now())
       RETURNING *`,
      [
        crypto.randomUUID(),
        organizationName,
        canonicalOrgCode,
        organizationId || canonicalOrgCode,
        canonicalOrgCode,
        JSON.stringify([...new Set(aliases.filter((item) => item !== canonicalOrgCode))]),
        cloudBackendUrl || null,
      ]
    );
    org = q.rows[0];
  }
  const mapped = mapOrgSummary(org);
  return {
    canonicalOrgCode: mapped.canonicalOrgCode || canonicalOrgCode,
    matchedAliases: mapped.aliases || [],
    updateFeedBaseUrl: new URL(`/api/v1/updates/${encodeURIComponent(mapped.canonicalOrgCode || canonicalOrgCode)}/${platform}/`, PUBLIC_SITE_URL).toString(),
    organization: mapped,
  };
}

async function packageForAssignment(assignment, platform) {
  if (assignment.custom_package_id) {
    const q = await pool.query(
      `SELECT cp.*, r.version AS base_version
       FROM release_custom_packages cp
       JOIN release_versions r ON r.id = cp.base_release_id
       WHERE cp.id=$1 AND cp.platform=$2 AND cp.status='ready'
       LIMIT 1`,
      [assignment.custom_package_id, platform]
    );
    if (q.rows[0]) {
      return {
        package: q.rows[0],
        kind: 'custom',
        releaseVersion: q.rows[0].version_label || q.rows[0].base_version,
        customPackage: q.rows[0],
      };
    }
  }
  const q = await pool.query(
    `SELECT p.*, r.version
     FROM release_packages p
     JOIN release_versions r ON r.id = p.release_id
     WHERE p.release_id=$1 AND p.platform=$2 AND p.downloadable=true AND r.status='published'
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [assignment.release_id, platform]
  );
  if (!q.rows[0]) return null;
  return { package: q.rows[0], kind: 'release', releaseVersion: q.rows[0].version, customPackage: null };
}

async function resolveAssignedPackage(orgCode, platform) {
  const aliases = await resolveOrgCodeAliases(orgCode);
  const exact = aliases.length
    ? await pool.query(
      `SELECT * FROM release_assignments
       WHERE status='active' AND target_type='org' AND lower(coalesce(org_code,'')) = ANY($1::text[])
       ORDER BY updated_at DESC, created_at DESC`,
      [aliases]
    )
    : { rows: [] };
  for (const assignment of exact.rows) {
    const resolved = await packageForAssignment(assignment, platform);
    if (resolved) return resolved;
  }

  const all = await pool.query(
    `SELECT * FROM release_assignments
     WHERE status='active' AND target_type='all'
     ORDER BY updated_at DESC, created_at DESC`,
    []
  );
  for (const assignment of all.rows) {
    const resolved = await packageForAssignment(assignment, platform);
    if (resolved) return resolved;
  }
  return null;
}

async function resolveUpdateTarget(orgCode, platform = 'mac') {
  await syncOrganizationsFromWorkbenchCloud();
  const normalizedPlatform = normalizeReleasePlatform(platform);
  const assigned = await resolveAssignedPackage(orgCode, normalizedPlatform);
  if (assigned) {
    return buildUpdatePayloadFromPackage(assigned.package, assigned.kind, assigned.releaseVersion, assigned.customPackage);
  }
  const latest = await getLatestPackage(normalizedPlatform);
  if (!latest) return null;
  return buildUpdatePayloadFromPackage(latest, 'release', latest.version, null);
}

async function getLatestPackage(platform = 'mac') {
  const q = await pool.query(
    `SELECT p.*, r.version, r.status
     FROM release_packages p
     JOIN release_versions r ON r.id = p.release_id
     WHERE r.status='published' AND p.platform=$1 AND p.downloadable=true
     ORDER BY r.published_at DESC NULLS LAST, r.updated_at DESC, p.created_at DESC
     LIMIT 1`,
    [normalizeReleasePlatform(platform)]
  );
  return q.rows[0] || null;
}

async function createDownloadTokenForCode(code, platform = 'mac') {
  const normalized = normalizeBetaCode(code);
  const app = await pool.query(
    `SELECT * FROM beta_applications
     WHERE upper(regexp_replace(coalesce(code,''), '\\s+', '', 'g'))=$1
       AND status='approved'
     LIMIT 1`,
    [normalized]
  );
  if (!app.rows[0]) throw new Error('内测码无效或尚未审核通过');
  const normalizedPlatform = normalizeReleasePlatform(platform);
  const pkg = await getLatestPackage(normalizedPlatform);
  if (!pkg) throw new Error(`当前暂无可下载的 ${normalizedPlatform === 'windows' ? 'Windows' : 'macOS'} 安装包`);
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO beta_download_tokens(id, token_hash, beta_application_id, release_id, package_id, platform, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6, now() + ($7::text || ' second')::interval)`,
    [crypto.randomUUID(), hashToken(token), app.rows[0].id, pkg.release_id, pkg.id, normalizedPlatform, RELEASE_DOWNLOAD_TTL_SECONDS]
  );
  return { token, package: mapReleasePackage(pkg), application: mapBetaApplication(app.rows[0]) };
}

function parseByteRange(rangeHeader, size) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim());
  if (!match) return { invalid: true };
  let start;
  let end;
  if (match[1] === '' && match[2] === '') return { invalid: true };
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { invalid: true };
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return { invalid: true };
  }
  return { start, end: Math.min(end, size - 1) };
}

async function streamReleaseFile(req, res, pkg, kind = 'installer') {
  const filePath = kind === 'blockmap' ? pkg.blockmap_path : pkg.storage_path;
  if (!filePath || !fsSync.existsSync(filePath)) {
    return json(res, 404, { ok: false, error: '安装包文件不存在' });
  }
  try {
    fsSync.accessSync(filePath, fsSync.constants.R_OK);
  } catch {
    return json(res, 500, { ok: false, error: '安装包文件暂时无法读取，请联系管理员检查发布文件权限' });
  }
  const filename = kind === 'blockmap'
    ? `${pkg.file_name}.blockmap`
    : pkg.file_name;
  const stat = fsSync.statSync(filePath);
  const contentType = filename.endsWith('.dmg')
    ? 'application/x-apple-diskimage'
    : 'application/octet-stream';
  const range = parseByteRange(req.headers.range, stat.size);
  if (range?.invalid) {
    res.writeHead(416, {
      ...corsHeaders,
      'Content-Range': `bytes */${stat.size}`,
      'Cache-Control': 'private, max-age=0, no-store',
    });
    return res.end();
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : stat.size - 1;
  const contentLength = end - start + 1;
  res.writeHead(range ? 206 : 200, {
    ...corsHeaders,
    'Content-Type': contentType,
    'Content-Length': String(contentLength),
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control': 'private, max-age=0, no-store',
    'Accept-Ranges': 'bytes',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}),
  });
  if (req.method === 'HEAD') return res.end();
  const stream = fsSync.createReadStream(filePath, { start, end });
  stream.on('error', () => {
    if (!res.headersSent) {
      json(res, 500, { ok: false, error: '安装包读取失败，请稍后重试' });
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

async function arkProxy(apiPath, payload) {
  if (!process.env.ARK_API_KEY) throw new Error('模型服务未配置');
  const upstream = await fetch(`${ARK_BASE_URL}${apiPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const message = data?.error?.message || data?.message || `模型服务请求失败(${upstream.status})`;
    const error = new Error(message);
    error.status = upstream.status;
    throw error;
  }
  return data;
}

async function readAiManifest() {
  try {
    return JSON.parse(await fs.readFile(AI_MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function writeAiManifest(manifest) {
  await fs.mkdir(path.dirname(AI_MANIFEST_PATH), { recursive: true });
  await fs.writeFile(AI_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

function stripHtmlText(html) {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(p|h[1-6]|li|tr|td|br|div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function articleText(article) {
  if (safeText(article.content_text).length > 50) return safeText(article.content_text).slice(0, 4000);
  if (safeText(article.content).length > 50) return safeText(article.content).slice(0, 4000);
  if (safeText(article.content_html)) return stripHtmlText(article.content_html).slice(0, 4000);
  return safeText(article.excerpt);
}

async function listPublishedAiArticles() {
  const q = await pool.query(
    `SELECT id,title,excerpt,topics,to_char(publish_date,'YYYY-MM-DD') AS publish_date,cover_image,content_html,content_text,status
     FROM insights
     WHERE status='published'
     ORDER BY publish_date DESC NULLS LAST, created_at DESC`
  );
  return q.rows;
}

async function processAiArticle(article, task, force = false) {
  const safeId = safeText(article.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(AI_ARTICLE_ROOT, safeId);
  await fs.mkdir(dir, { recursive: true });
  const manifest = await readAiManifest();
  const entry = manifest[article.id] || { id: article.id, title: article.title, illustrations: [] };
  entry.title = article.title;

  const coverPath = path.join(dir, 'cover.jpg');
  if (force || !fsSync.existsSync(coverPath)) {
    task.currentStep = '生成封面';
    const prompt = [
      'Create a premium textless editorial cover image for a Chinese strategy think tank article.',
      `Title meaning: ${article.title}.`,
      `Topics: ${(article.topics || []).join(', ')}.`,
      'Style: abstract, deep navy and refined purple, cinematic light, no words, no letters, no logos, no UI.',
    ].join(' ');
    const image = await arkProxy('/api/v3/images/generations', {
      model: ARK_IMAGE_MODEL,
      prompt,
      negative_prompt: 'text, letters, chinese characters, logo, watermark, UI, captions',
      size: '1080x1440',
      n: 1,
      response_format: 'url',
    });
    const url = image?.data?.[0]?.url;
    if (!url) throw new Error('模型未返回图片 URL');
    const img = await fetch(url);
    if (!img.ok) throw new Error(`图片下载失败(${img.status})`);
    await fs.writeFile(coverPath, Buffer.from(await img.arrayBuffer()));
    entry.cover = { filename: 'cover.jpg', prompt };
  }

  const text = articleText(article);
  entry.illustrations = Array.isArray(entry.illustrations) ? entry.illustrations : [];
  if (text.length > 80 && entry.illustrations.length === 0) {
    task.currentStep = '生成章节配图';
    const prompt = [
      'Create one textless abstract editorial illustration for this article section.',
      `Article: ${article.title}.`,
      `Content: ${text.slice(0, 360)}.`,
      'No words, no letters, no logos, no UI. Premium navy and purple editorial style.',
    ].join(' ');
    const image = await arkProxy('/api/v3/images/generations', {
      model: ARK_IMAGE_MODEL,
      prompt,
      negative_prompt: 'text, letters, chinese characters, logo, watermark, UI, captions',
      size: '1792x1024',
      n: 1,
      response_format: 'url',
    });
    const url = image?.data?.[0]?.url;
    if (url) {
      const img = await fetch(url);
      if (img.ok) {
        const filename = 'illustration-1.jpg';
        await fs.writeFile(path.join(dir, filename), Buffer.from(await img.arrayBuffer()));
        entry.illustrations = [{ filename, prompt, title: article.title }];
      }
    }
  }

  manifest[article.id] = entry;
  await writeAiManifest(manifest);
}

async function runAdminAiTask(taskId, ids = [], force = false) {
  const task = adminAiTasks.get(taskId);
  try {
    let articles = await listPublishedAiArticles();
    if (Array.isArray(ids) && ids.length) {
      const wanted = new Set(ids.map(String));
      articles = articles.filter((article) => wanted.has(String(article.id)));
    }
    task.total = articles.length;
    for (const article of articles) {
      if (task.status === 'cancelled') break;
      task.currentArticleId = article.id;
      task.currentArticleTitle = article.title;
      try {
        await processAiArticle(article, task, force);
        task.done += 1;
        task.log.push(`完成: ${article.title}`);
      } catch (error) {
        task.errors += 1;
        task.log.push(`失败: ${article.title} - ${error?.message || error}`);
      }
    }
    if (task.status !== 'cancelled') task.status = 'completed';
  } catch (error) {
    task.status = 'failed';
    task.log.push(error?.message || String(error));
  } finally {
    task.currentStep = undefined;
    task.currentArticleId = undefined;
    task.currentArticleTitle = undefined;
    task.finishedAt = Date.now();
  }
}

function normalizeCoverPresetContentType(input) {
  return input === 'methodology' ? 'methodology' : input === 'insight' ? 'insight' : null;
}

function normalizeCaseShowcaseScope(input) {
  return input === 'admin' ? 'admin' : 'published';
}

function toCaseShowcaseSlug(input) {
  return toProjectSlug(input).replace(/^project-/, 'case-');
}

function toCaseShowcaseSlotSlug(sortOrder, fallback = '') {
  const order = toPositiveInt(sortOrder, 0);
  if (order > 0) {
    return `case-${order}`;
  }
  return toCaseShowcaseSlug(fallback || `case-${crypto.randomUUID()}`);
}

function normalizeContentType(input) {
  return input === 'insight' || input === 'methodology' || input === 'report' || input === 'book'
    ? input
    : null;
}

function getContentTableName(contentType) {
  if (contentType === 'insight') return 'insights';
  if (contentType === 'methodology') return 'methodologies';
  if (contentType === 'report') return 'reports';
  if (contentType === 'book') return 'books';
  return null;
}

function mapCoverPreset(row) {
  return {
    id: row.id,
    contentType: row.content_type,
    title: row.title || '',
    imageUrl: row.image_url,
    sourceType: row.source_type || 'seed',
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COVER_PRESET_PALETTES = [
  ['#0F172A', '#1D4ED8', '#E2E8F0'],
  ['#111827', '#0F766E', '#E6FFFB'],
  ['#1F2937', '#7C3AED', '#F3E8FF'],
  ['#172554', '#2563EB', '#DBEAFE'],
  ['#292524', '#C2410C', '#FFEDD5'],
  ['#0B3B2E', '#0F766E', '#D1FAE5'],
  ['#3B0764', '#A21CAF', '#F5D0FE'],
  ['#1E293B', '#EA580C', '#FFEDD5'],
  ['#164E63', '#0891B2', '#CFFAFE'],
  ['#111827', '#BE123C', '#FFE4E6'],
];

function buildCoverPresetSvg(contentType, index) {
  const palette = COVER_PRESET_PALETTES[index % COVER_PRESET_PALETTES.length];
  const [dark, accent, soft] = palette;
  const heading = contentType === 'insight' ? '益语前沿洞察' : '益语方法论';
  const sub = contentType === 'insight' ? 'YIYU INSIGHT' : 'YIYU METHOD';
  const number = String(index + 1).padStart(2, '0');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${dark}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.03)" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)" />
      <circle cx="1320" cy="170" r="240" fill="${soft}" opacity="0.22" />
      <circle cx="290" cy="770" r="280" fill="${soft}" opacity="0.10" />
      <rect x="92" y="92" width="1416" height="716" rx="36" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" />
      <rect x="148" y="146" width="640" height="14" rx="7" fill="rgba(255,255,255,0.45)" />
      <rect x="148" y="192" width="270" height="18" rx="9" fill="rgba(255,255,255,0.22)" />
      <text x="148" y="378" fill="#FFFFFF" font-size="88" font-weight="700" font-family="PingFang SC, Microsoft YaHei, sans-serif">${heading}</text>
      <text x="148" y="472" fill="rgba(255,255,255,0.82)" font-size="38" font-weight="500" font-family="Avenir Next, PingFang SC, sans-serif">${sub}</text>
      <text x="148" y="712" fill="rgba(255,255,255,0.95)" font-size="160" font-weight="800" font-family="Avenir Next, PingFang SC, sans-serif">${number}</text>
      <path d="M1060 252 C1160 220, 1280 220, 1380 262" stroke="rgba(255,255,255,0.28)" stroke-width="10" fill="none" stroke-linecap="round" />
      <path d="M1040 318 C1170 286, 1290 286, 1400 334" stroke="rgba(255,255,255,0.18)" stroke-width="8" fill="none" stroke-linecap="round" />
      <path d="M1020 384 C1140 352, 1300 358, 1420 406" stroke="rgba(255,255,255,0.12)" stroke-width="6" fill="none" stroke-linecap="round" />
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function seedDefaultCoverPresets(db) {
  for (const contentType of ['insight', 'methodology']) {
    const q = await db.query('SELECT count(*)::int AS c FROM content_cover_presets WHERE content_type=$1', [contentType]);
    if (Number(q.rows[0]?.c || 0) > 0) continue;
    for (let i = 0; i < 10; i += 1) {
      const id = `${contentType}-preset-${String(i + 1).padStart(2, '0')}`;
      const title = `${contentType === 'insight' ? '文章封面' : '方法论封面'} ${String(i + 1).padStart(2, '0')}`;
      const imageUrl = buildCoverPresetSvg(contentType, i);
      await db.query(
        `INSERT INTO content_cover_presets(id, content_type, title, image_url, source_type, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'seed',$5,now(),now())
         ON CONFLICT (id) DO NOTHING`,
        [id, contentType, title, imageUrl, i]
      );
    }
  }
}

async function listCoverPresets(db, contentType) {
  const q = await db.query(
    `SELECT id, content_type, title, image_url, source_type, sort_order, created_at, updated_at
     FROM content_cover_presets
     WHERE content_type=$1
     ORDER BY sort_order ASC, created_at ASC`,
    [contentType]
  );
  return q.rows.map(mapCoverPreset);
}

async function deleteCoverPresetById(db, id) {
  const q = await db.query('DELETE FROM content_cover_presets WHERE id=$1', [id]);
  return q.rowCount > 0;
}

async function getContentEngagementState(db, req, contentType, contentId) {
  const table = getContentTableName(contentType);
  if (!table) throw new Error('内容类型不支持');
  const q = await db.query(
    `SELECT id, coalesce(likes, 0) AS likes_count, coalesce(favorites_count, 0) AS favorites_count
     FROM ${table}
     WHERE id=$1
     LIMIT 1`,
    [contentId]
  );
  if (!q.rows[0]) throw new Error('内容不存在');

  const session = await getOptionalSession(req);
  let liked = false;
  let favorited = false;

  if (session?.id) {
    const [likedRes, favoritedRes] = await Promise.all([
      db.query(
        'SELECT 1 FROM content_likes WHERE user_id=$1 AND content_type=$2 AND content_id=$3 LIMIT 1',
        [session.id, contentType, contentId]
      ),
      db.query(
        'SELECT 1 FROM content_favorites WHERE user_id=$1 AND content_type=$2 AND content_id=$3 LIMIT 1',
        [session.id, contentType, contentId]
      ),
    ]);
    liked = Boolean(likedRes.rows[0]);
    favorited = Boolean(favoritedRes.rows[0]);
  }

  return {
    contentType,
    contentId,
    likesCount: Number(q.rows[0].likes_count || 0),
    favoritesCount: Number(q.rows[0].favorites_count || 0),
    liked,
    favorited,
  };
}

async function toggleContentReaction(db, userId, contentType, contentId, kind) {
  const table = getContentTableName(contentType);
  if (!table) throw new Error('内容类型不支持');
  const reactionTable = kind === 'like' ? 'content_likes' : 'content_favorites';
  const countColumn = kind === 'like' ? 'likes' : 'favorites_count';

  const contentQ = await db.query(`SELECT id FROM ${table} WHERE id=$1 LIMIT 1`, [contentId]);
  if (!contentQ.rows[0]) throw new Error('内容不存在');

  const existingQ = await db.query(
    `SELECT id FROM ${reactionTable} WHERE user_id=$1 AND content_type=$2 AND content_id=$3 LIMIT 1`,
    [userId, contentType, contentId]
  );

  if (existingQ.rows[0]) {
    await db.query(`DELETE FROM ${reactionTable} WHERE id=$1`, [existingQ.rows[0].id]);
  } else {
    await db.query(
      `INSERT INTO ${reactionTable}(id, user_id, content_type, content_id, created_at)
       VALUES ($1,$2,$3,$4,now())`,
      [crypto.randomUUID(), userId, contentType, contentId]
    );
  }

  const countQ = await db.query(
    `SELECT count(*)::int AS c FROM ${reactionTable} WHERE content_type=$1 AND content_id=$2`,
    [contentType, contentId]
  );
  const nextCount = Number(countQ.rows[0]?.c || 0);
  await db.query(`UPDATE ${table} SET ${countColumn}=$2 WHERE id=$1`, [contentId, nextCount]);

  if (kind === 'favorite') {
    const totalFavoritesQ = await db.query(
      'SELECT count(*)::int AS c FROM content_favorites WHERE user_id=$1',
      [userId]
    );
    await db.query(
      'UPDATE auth_users SET favorites_count=$2 WHERE id=$1',
      [userId, Number(totalFavoritesQ.rows[0]?.c || 0)]
    );
  }
}

async function listUserFavorites(db, userId) {
  const q = await db.query(
    `SELECT content_type, content_id, created_at
     FROM content_favorites
     WHERE user_id=$1
     ORDER BY created_at DESC`,
    [userId]
  );
  return q.rows.map((row) => ({
    contentType: row.content_type,
    contentId: row.content_id,
    createdAt: row.created_at,
  }));
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

function verifyPassword(password, encoded) {
  const [alg, salt, digest] = String(encoded || '').split('$');
  if (alg !== 'scrypt' || !salt || !digest) return false;
  const target = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(target, 'hex'), Buffer.from(digest, 'hex'));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseBearerToken(req) {
  const auth = String(req.headers.authorization || '');
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function isPhoneLocalEmail(email) {
  return typeof email === 'string' && email.endsWith('@phone.local');
}

function isAdminRow(row) {
  const email = String(row?.email || '').toLowerCase();
  return row?.admin_role === 'admin' || DEFAULT_ADMIN_EMAILS.has(email);
}

function mapUser(row) {
  const email = isPhoneLocalEmail(row.email) ? undefined : row.email || undefined;
  return {
    id: row.id,
    phone: row.phone || undefined,
    email,
    nickname: row.nickname || undefined,
    avatarUrl: row.avatar || undefined,
    memberType: row.member_type || 'regular',
    status: row.status || 'active',
    adminRole: isAdminRow(row) ? 'admin' : undefined,
    invitationCode: row.invitation_code || undefined,
    invitedBy: row.invited_by || undefined,
    paidSource: row.paid_source || undefined,
    paidStartedAt: row.paid_started_at || undefined,
    paidExpiresAt: row.paid_expires_at || undefined,
    paidNote: row.paid_note || undefined,
    strategyProjectId: row.strategy_project_id || undefined,
    strategyBoundAt: row.strategy_bound_at || undefined,
    strategyAccessSource: row.strategy_access_source || undefined,
    strategyProjectName: row.strategy_project_name || undefined,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || undefined,
    loginCount: Number(row.login_count || 0),
    commentsCount: Number(row.comments_count || 0),
    favoritesCount: Number(row.favorites_count || 0),
  };
}

function mapInviteCode(row) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    grantKind: row.grant_kind || 'member_days',
    bonusDays: Number(row.bonus_days || 0),
    maxUses: Number(row.max_uses || 0),
    usedCount: Number(row.used_count || 0),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    usedBy: Array.isArray(row.used_by) ? row.used_by : [],
    projectId: row.project_id || undefined,
    projectNameSnapshot: row.project_name_snapshot || undefined,
  };
}

function mapComment(row) {
  return {
    id: row.id,
    contentId: row.content_id,
    contentType: row.content_type,
    contentTitle: row.content_title || '',
    userId: row.user_id || 'guest',
    userName: row.user_name || '访客',
    userAvatar: row.user_avatar || undefined,
    text: row.text || '',
    status: row.status || 'pending',
    reply: row.reply || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentOrder(row) {
  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    userNickname: row.user_nickname || undefined,
    planId: row.plan_id,
    planName: row.plan_name,
    amountFen: Number(row.amount_fen || 0),
    amount: Number(row.amount_fen || 0) / 100,
    currency: row.currency || 'CNY',
    durationDays: row.duration_days === null ? null : Number(row.duration_days || 0),
    memberTypeTarget: row.member_type_target || 'paid',
    channel: row.channel || 'wechat_h5',
    providerName: row.provider_name || 'wechatpay',
    status: row.status,
    buyerName: row.buyer_name || undefined,
    buyerOrg: row.buyer_org || undefined,
    buyerPhone: row.buyer_phone || undefined,
    buyerEmail: row.buyer_email || undefined,
    buyerNote: row.buyer_note || undefined,
    note: row.note || undefined,
    expiresAt: row.expires_at || undefined,
    timeExpire: row.time_expire || undefined,
    paidAt: row.paid_at || undefined,
    h5UrlSnapshot: row.h5_url_snapshot || undefined,
    providerOrderId: row.provider_order_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPaymentReadiness() {
  const items = PAYMENT_PREP_CHECKS.map((item) => ({
    key: item.env,
    label: item.label,
    configured: envConfigured(item.env),
  }));
  const enabled = items.every((item) => item.configured);
  return {
    provider: 'wechatpay',
    channel: 'wechat_h5',
    mode: enabled ? 'live' : 'setup_pending',
    enabled,
    items,
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || undefined,
    h5Domain: process.env.WECHAT_PAY_H5_DOMAIN || undefined,
    returnUrl: process.env.WECHAT_PAY_RETURN_URL || undefined,
  };
}

async function loadWeChatPayConfig() {
  const privateKeyPem = await readPemFromEnv('WECHAT_PAY_PRIVATE_KEY', 'WECHAT_PAY_PRIVATE_KEY_PATH');
  const merchantCertPem = await readPemFromEnv('WECHAT_PAY_MCH_CERT', 'WECHAT_PAY_MCH_CERT_PATH');
  const platformCertPem = await readPemFromEnv('WECHAT_PAY_PLATFORM_CERT', 'WECHAT_PAY_PLATFORM_CERT_PATH');
  let mchSerialNo = String(process.env.WECHAT_PAY_MCH_SERIAL_NO || '').trim();
  if (!mchSerialNo && merchantCertPem) {
    try {
      mchSerialNo = new crypto.X509Certificate(merchantCertPem).serialNumber.replace(/:/g, '').toUpperCase();
    } catch {
      mchSerialNo = '';
    }
  }
  return {
    mchid: String(process.env.WECHAT_PAY_MCHID || '').trim(),
    appid: String(process.env.WECHAT_PAY_APPID || '').trim(),
    mchSerialNo,
    privateKeyPem,
    apiV3Key: String(process.env.WECHAT_PAY_API_V3_KEY || '').trim(),
    platformCertPem,
    platformCertPath: String(process.env.WECHAT_PAY_PLATFORM_CERT_PATH || '').trim(),
    merchantCertPem,
    notifyUrl: String(process.env.WECHAT_PAY_NOTIFY_URL || '').trim(),
    h5Domain: String(process.env.WECHAT_PAY_H5_DOMAIN || '').trim(),
    returnUrl: String(process.env.WECHAT_PAY_RETURN_URL || '').trim(),
  };
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  const realIp = String(req.headers['x-real-ip'] || '').trim();
  if (realIp) return realIp;
  return req.socket.remoteAddress || '127.0.0.1';
}

function buildWechatSignatureMessage(method, pathnameWithQuery, timestamp, nonce, body) {
  return `${method.toUpperCase()}\n${pathnameWithQuery}\n${timestamp}\n${nonce}\n${body}\n`;
}

function buildWechatNotifySignatureMessage(timestamp, nonce, body) {
  return `${timestamp}\n${nonce}\n${body}\n`;
}

function signWithPrivateKey(privateKeyPem, message) {
  return crypto.createSign('RSA-SHA256').update(message).end().sign(privateKeyPem, 'base64');
}

function verifyWithPlatformCert(platformCertPem, message, signature) {
  return crypto.createVerify('RSA-SHA256')
    .update(message)
    .end()
    .verify(platformCertPem, signature, 'base64');
}

function decryptWechatResource(apiV3Key, resource) {
  const nonce = Buffer.from(resource.nonce || '', 'utf8');
  const associatedData = Buffer.from(resource.associated_data || '', 'utf8');
  const cipherText = Buffer.from(resource.ciphertext || '', 'base64');
  const authTag = cipherText.subarray(cipherText.length - 16);
  const encrypted = cipherText.subarray(0, cipherText.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), nonce);
  decipher.setAuthTag(authTag);
  if (associatedData.length) {
    decipher.setAAD(associatedData);
  }
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function wechatRequest(config, method, pathnameWithQuery, payload) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const body = payload ? JSON.stringify(payload) : '';
  const signature = signWithPrivateKey(
    config.privateKeyPem,
    buildWechatSignatureMessage(method, pathnameWithQuery, timestamp, nonce, body)
  );

  const res = await fetch(`${WECHAT_API_BASE}${pathnameWithQuery}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'yiyu-think-tank/1.0',
      Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${config.mchSerialNo}",signature="${signature}"`,
    },
    body: body || undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.detail || `微信支付请求失败(${res.status})`);
    err.statusCode = res.status;
    err.payload = data || text;
    throw err;
  }
  return data;
}

async function ensurePlatformCert(config) {
  if (config.platformCertPem) {
    return config.platformCertPem;
  }
  if (!config.mchid || !config.appid || !config.mchSerialNo || !config.privateKeyPem || !config.apiV3Key) {
    return '';
  }
  const result = await wechatRequest(config, 'GET', '/v3/certificates');
  const certificates = Array.isArray(result?.data) ? result.data : [];
  const latest = certificates
    .filter((item) => item?.encrypt_certificate?.ciphertext)
    .sort((a, b) => new Date(b?.effective_time || 0).getTime() - new Date(a?.effective_time || 0).getTime())[0];
  if (!latest?.encrypt_certificate) {
    return '';
  }
  const pem = decryptWechatResource(config.apiV3Key, latest.encrypt_certificate);
  if (config.platformCertPath) {
    try {
      await fs.mkdir(path.dirname(config.platformCertPath), { recursive: true });
      await fs.writeFile(config.platformCertPath, pem, { mode: 0o600 });
    } catch {
      // 平台证书写文件失败时，仍以内存结果兜底。
    }
  }
  config.platformCertPem = pem;
  return pem;
}

function mapWechatTradeStateToOrderStatus(tradeState) {
  if (tradeState === 'SUCCESS') return 'paid';
  if (tradeState === 'CLOSED') return 'closed';
  if (tradeState === 'REVOKED') return 'closed';
  if (tradeState === 'PAYERROR') return 'failed';
  if (tradeState === 'NOTPAY' || tradeState === 'USERPAYING') return 'pending';
  return 'pending';
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      nickname TEXT,
      avatar TEXT,
      password_hash TEXT NOT NULL,
      member_type TEXT NOT NULL DEFAULT 'regular',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS auth_verification_codes (
      id UUID PRIMARY KEY,
      channel TEXT NOT NULL,
      target TEXT NOT NULL,
      scene TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      attempt_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      request_ip TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_auth_codes_target_scene_created ON auth_verification_codes(target, scene, created_at DESC);
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      user_agent TEXT,
      ip TEXT
    );
    CREATE TABLE IF NOT EXISTS invite_codes (
      id UUID PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      grant_kind TEXT NOT NULL DEFAULT 'member_days',
      bonus_days INT NOT NULL DEFAULT 0,
      project_id TEXT,
      project_name_snapshot TEXT,
      max_uses INT NOT NULL DEFAULT 1,
      used_count INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'valid',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      used_by JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_title TEXT,
      user_id TEXT,
      user_name TEXT,
      user_avatar TEXT,
      text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reply TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS content_cover_presets (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'seed',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS content_likes (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, content_type, content_id)
    );
    CREATE TABLE IF NOT EXISTS content_favorites (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, content_type, content_id)
    );
    CREATE TABLE IF NOT EXISTS case_showcases (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      client_name TEXT NOT NULL,
      industry TEXT,
      title TEXT NOT NULL,
      subtitle TEXT,
      tags TEXT[] NOT NULL DEFAULT '{}'::text[],
      logo_url TEXT,
      ppt_file_url TEXT,
      ppt_file_name TEXT,
      slide_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_published BOOLEAN NOT NULL DEFAULT false,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS payment_orders (
      id UUID PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
      user_nickname TEXT,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      amount_fen INT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      duration_days INT,
      member_type_target TEXT NOT NULL DEFAULT 'paid',
      buyer_name TEXT,
      buyer_org TEXT,
      buyer_phone TEXT,
      buyer_email TEXT,
      buyer_note TEXT,
      channel TEXT NOT NULL DEFAULT 'wechat_h5',
      provider_name TEXT NOT NULL DEFAULT 'wechatpay',
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      expires_at TIMESTAMPTZ,
      time_expire TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      provider_order_id TEXT,
      h5_url_snapshot TEXT,
      provider_payload JSONB,
      notify_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS consult_requests (
      id TEXT PRIMARY KEY,
      organization TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      topic TEXT NOT NULL,
      background TEXT NOT NULL,
      constraints TEXT NOT NULL,
      commitment TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      reviewed_at TIMESTAMPTZ,
      reviewed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_content_status_created ON comments(content_id, content_type, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON payment_orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created ON payment_orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_case_showcases_publish_sort ON case_showcases(is_published, sort_order, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_case_showcases_slug ON case_showcases(slug);
    CREATE INDEX IF NOT EXISTS idx_consult_requests_created ON consult_requests(created_at DESC, id DESC);
    CREATE TABLE IF NOT EXISTS project_learning_resources (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      relation TEXT,
      detail TEXT[] NOT NULL DEFAULT '{}'::text[],
      kind TEXT,
      link TEXT,
      source_type TEXT NOT NULL DEFAULT 'manual',
      internal_type TEXT,
      internal_id TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_project_learning_resources_project_sort
      ON project_learning_resources(project_id, sort_order, created_at DESC);
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      canonical_org_code TEXT,
      aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
      source TEXT NOT NULL DEFAULT 'manual',
      source_org_id TEXT,
      source_cloud_url TEXT,
      member_count INT NOT NULL DEFAULT 0,
      install_count INT NOT NULL DEFAULT 0,
      department_count INT NOT NULL DEFAULT 0,
      invite_count INT NOT NULL DEFAULT 0,
      departments JSONB NOT NULL DEFAULT '[]'::jsonb,
      source_updated_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS release_versions (
      id UUID PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      git_tag TEXT,
      source_commit TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      platforms TEXT[] NOT NULL DEFAULT ARRAY['mac']::text[],
      mandatory BOOLEAN NOT NULL DEFAULT false,
      user_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
      internal_notes TEXT NOT NULL DEFAULT '',
      screenshots TEXT[] NOT NULL DEFAULT '{}'::text[],
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS release_packages (
      id UUID PRIMARY KEY,
      release_id UUID NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
      platform TEXT NOT NULL DEFAULT 'mac',
      arch TEXT NOT NULL DEFAULT 'arm64',
      artifact_type TEXT NOT NULL DEFAULT 'installer',
      file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      tos_object_key TEXT,
      tos_blockmap_object_key TEXT,
      public_url TEXT,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      sha512 TEXT NOT NULL,
      download_url TEXT NOT NULL,
      blockmap_path TEXT,
      blockmap_url TEXT,
      downloadable BOOLEAN NOT NULL DEFAULT true,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS release_tos_sync_jobs (
      id UUID PRIMARY KEY,
      release_id UUID NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'queued',
      stage TEXT NOT NULL DEFAULT 'queued',
      percent INT NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT '',
      tos_configured BOOLEAN NOT NULL DEFAULT false,
      manifests JSONB NOT NULL DEFAULT '[]'::jsonb,
      error TEXT,
      created_by TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS release_custom_packages (
      id UUID PRIMARY KEY,
      base_release_id UUID NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      version_label TEXT NOT NULL,
      difference_notes TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL DEFAULT 'mac',
      arch TEXT NOT NULL DEFAULT 'arm64',
      file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      tos_object_key TEXT,
      tos_blockmap_object_key TEXT,
      public_url TEXT,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      sha512 TEXT NOT NULL,
      download_url TEXT NOT NULL,
      blockmap_path TEXT,
      blockmap_url TEXT,
      status TEXT NOT NULL DEFAULT 'testing',
      created_by TEXT,
      ready_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS release_assignments (
      id UUID PRIMARY KEY,
      release_id UUID NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
      custom_package_id UUID REFERENCES release_custom_packages(id) ON DELETE SET NULL,
      platform TEXT NOT NULL DEFAULT 'mac',
      target_type TEXT NOT NULL DEFAULT 'all',
      org_code TEXT,
      rollout_pct INT NOT NULL DEFAULT 100,
      mandatory BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'active',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS release_feedback (
      id UUID PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'experience',
      severity TEXT NOT NULL DEFAULT 'minor',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      submitter_user_id TEXT,
      submitter_name TEXT,
      org_code TEXT,
      version TEXT,
      page TEXT,
      os TEXT,
      screenshot_url TEXT,
      log_excerpt TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      dup_of TEXT,
      linked_task_id TEXT,
      linked_release_id UUID REFERENCES release_versions(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS beta_applications (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_type TEXT NOT NULL DEFAULT 'nonprofit',
      org_name TEXT,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      code TEXT UNIQUE,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS beta_download_tokens (
      id UUID PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      beta_application_id UUID REFERENCES beta_applications(id) ON DELETE SET NULL,
      release_id UUID REFERENCES release_versions(id) ON DELETE SET NULL,
      package_id UUID REFERENCES release_packages(id) ON DELETE SET NULL,
      platform TEXT NOT NULL DEFAULT 'mac',
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_release_versions_status_updated ON release_versions(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_release_packages_release_platform ON release_packages(release_id, platform, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_release_tos_sync_jobs_release_updated ON release_tos_sync_jobs(release_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_release_custom_packages_base_status ON release_custom_packages(base_release_id, platform, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_release_assignments_release_status ON release_assignments(release_id, status, target_type, org_code);
    CREATE INDEX IF NOT EXISTS idx_release_feedback_status_created ON release_feedback(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
    CREATE INDEX IF NOT EXISTS idx_beta_applications_status_created ON beta_applications(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_beta_applications_email ON beta_applications(lower(user_email));
    CREATE INDEX IF NOT EXISTS idx_beta_download_tokens_hash ON beta_download_tokens(token_hash);
  `);

  await pool.query(`
    UPDATE release_tos_sync_jobs
    SET status='failed',
        stage='interrupted',
        percent=GREATEST(percent, 1),
        message='后端服务重启，TOS 更新任务已中断，请重新点击自动更新 TOS。',
        error='后端服务重启导致任务中断',
        updated_at=now(),
        completed_at=COALESCE(completed_at, now())
    WHERE status IN ('queued','running')
  `);

  await pool.query(`
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS source_org_id TEXT,
      ADD COLUMN IF NOT EXISTS canonical_org_code TEXT,
      ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS source_cloud_url TEXT,
      ADD COLUMN IF NOT EXISTS department_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS invite_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS departments JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

    ALTER TABLE release_assignments
      ADD COLUMN IF NOT EXISTS custom_package_id UUID REFERENCES release_custom_packages(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'mac';

    ALTER TABLE release_assignments
      ALTER COLUMN platform SET DEFAULT 'all';

    ALTER TABLE release_versions
      ADD COLUMN IF NOT EXISTS git_tag TEXT,
      ADD COLUMN IF NOT EXISTS source_commit TEXT;

    ALTER TABLE release_packages
      ADD COLUMN IF NOT EXISTS arch TEXT NOT NULL DEFAULT 'arm64',
      ADD COLUMN IF NOT EXISTS artifact_type TEXT NOT NULL DEFAULT 'installer',
      ADD COLUMN IF NOT EXISTS tos_object_key TEXT,
      ADD COLUMN IF NOT EXISTS tos_blockmap_object_key TEXT,
      ADD COLUMN IF NOT EXISTS public_url TEXT;

    ALTER TABLE release_custom_packages
      ADD COLUMN IF NOT EXISTS arch TEXT NOT NULL DEFAULT 'arm64',
      ADD COLUMN IF NOT EXISTS tos_object_key TEXT,
      ADD COLUMN IF NOT EXISTS tos_blockmap_object_key TEXT,
      ADD COLUMN IF NOT EXISTS public_url TEXT;

    CREATE INDEX IF NOT EXISTS idx_release_assignments_custom_status
      ON release_assignments(custom_package_id, status, platform, target_type, org_code);
    CREATE INDEX IF NOT EXISTS idx_release_assignments_org_platform_status
      ON release_assignments(target_type, org_code, platform, status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_organizations_source_org_id
      ON organizations(source_org_id);
    CREATE INDEX IF NOT EXISTS idx_organizations_canonical_org_code
      ON organizations(canonical_org_code);
    CREATE INDEX IF NOT EXISTS idx_organizations_aliases
      ON organizations USING GIN (aliases);
  `);

  await pool.query(`
    ALTER TABLE payment_orders
      ALTER COLUMN member_type_target SET DEFAULT 'paid',
      ALTER COLUMN status SET DEFAULT 'pending';
  `);

  await pool.query(`
    ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS buyer_name TEXT,
      ADD COLUMN IF NOT EXISTS buyer_org TEXT,
      ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
      ADD COLUMN IF NOT EXISTS buyer_email TEXT,
      ADD COLUMN IF NOT EXISTS buyer_note TEXT,
      ADD COLUMN IF NOT EXISTS time_expire TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS h5_url_snapshot TEXT;
  `);

  await pool.query(`
    ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS invitation_code TEXT,
      ADD COLUMN IF NOT EXISTS invited_by TEXT,
      ADD COLUMN IF NOT EXISTS paid_source TEXT,
      ADD COLUMN IF NOT EXISTS paid_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS paid_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS paid_note TEXT,
      ADD COLUMN IF NOT EXISTS admin_role TEXT,
      ADD COLUMN IF NOT EXISTS avatar TEXT,
      ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS strategy_project_id TEXT,
      ADD COLUMN IF NOT EXISTS strategy_bound_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS strategy_access_source TEXT,
      ADD COLUMN IF NOT EXISTS login_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE insights
      ADD COLUMN IF NOT EXISTS content_json JSONB,
      ADD COLUMN IF NOT EXISTS content_html TEXT,
      ADD COLUMN IF NOT EXISTS content_text TEXT,
      ADD COLUMN IF NOT EXISTS file_url TEXT,
      ADD COLUMN IF NOT EXISTS file_size BIGINT,
      ADD COLUMN IF NOT EXISTS cover_preset_id TEXT,
      ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
    ALTER TABLE methodologies
      ADD COLUMN IF NOT EXISTS content_json JSONB,
      ADD COLUMN IF NOT EXISTS content_html TEXT,
      ADD COLUMN IF NOT EXISTS content_text TEXT,
      ADD COLUMN IF NOT EXISTS file_url TEXT,
      ADD COLUMN IF NOT EXISTS file_size BIGINT,
      ADD COLUMN IF NOT EXISTS cover_preset_id TEXT,
      ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
    ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
    ALTER TABLE books
      ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE invite_codes
      ADD COLUMN IF NOT EXISTS grant_kind TEXT NOT NULL DEFAULT 'member_days',
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS project_name_snapshot TEXT;
  `);

  await pool.query(`
    ALTER TABLE client_projects
      ADD COLUMN IF NOT EXISTS slug TEXT,
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS mission TEXT,
      ADD COLUMN IF NOT EXISTS vision TEXT,
      ADD COLUMN IF NOT EXISTS values_text TEXT[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS north_star_metric TEXT,
      ADD COLUMN IF NOT EXISTS north_star_metrics TEXT[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS yearly_deliverables TEXT[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS next_14_days TEXT[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
  `);

  await pool.query(`
    ALTER TABLE strategic_milestones
      ADD COLUMN IF NOT EXISTS project_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE strategic_goals
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS one_liner TEXT,
      ADD COLUMN IF NOT EXISTS risks TEXT[] NOT NULL DEFAULT '{}'::text[];
  `);

  await pool.query(`
    ALTER TABLE project_events
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS duration TEXT,
      ADD COLUMN IF NOT EXISTS people_text TEXT,
      ADD COLUMN IF NOT EXISTS done_items TEXT[] NOT NULL DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS value_items TEXT[] NOT NULL DEFAULT '{}'::text[];
  `);

  await pool.query(`
    ALTER TABLE project_documents
      ADD COLUMN IF NOT EXISTS project_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE project_meetings
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS meeting_link TEXT,
      ADD COLUMN IF NOT EXISTS key_people TEXT,
      ADD COLUMN IF NOT EXISTS topic TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_client_projects_publish_sort
      ON client_projects(is_published, sort_order, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_client_projects_slug ON client_projects(slug);
    CREATE INDEX IF NOT EXISTS idx_auth_users_strategy_project ON auth_users(strategy_project_id);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_grant_kind_status ON invite_codes(grant_kind, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_strategic_milestones_project_sort ON strategic_milestones(project_id, sort_order, phase_order, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_strategic_goals_project_sort ON strategic_goals(project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_events_project_sort ON project_events(project_id, sort_order, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_documents_project_sort ON project_documents(project_id, sort_order, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_meetings_project_sort ON project_meetings(project_id, sort_order, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cover_presets_type_sort ON content_cover_presets(content_type, sort_order, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_content_likes_content ON content_likes(content_type, content_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_favorites_content ON content_favorites(content_type, content_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_favorites_user ON content_favorites(user_id, created_at DESC);
  `);

  await seedDefaultCoverPresets(pool);
  await seedDefaultCaseShowcases();
  await syncCaseShowcaseSlotSlugs();

  if (DEFAULT_ADMIN_EMAILS.size > 0) {
    await pool.query(
      'UPDATE auth_users SET admin_role = $2 WHERE lower(coalesce(email, \'\')) = ANY($1::text[])',
      [Array.from(DEFAULT_ADMIN_EMAILS), 'admin']
    );
  }
}

async function sendSmsCode(phone, scene, code) {
  const client = smsClient || initSmsClient();
  if (!client) throw new Error('短信服务未配置');
  const templateId = scene === 'register'
    ? process.env.TC_SMS_TEMPLATE_ID_REGISTER
    : (scene === 'bind' || scene === 'unbind' || scene === 'deactivate')
      ? (process.env.TC_SMS_TEMPLATE_ID_BIND || process.env.TC_SMS_TEMPLATE_ID_RESET)
    : process.env.TC_SMS_TEMPLATE_ID_RESET;
  const signName = process.env.TC_SMS_SIGN;
  const smsSdkAppId = process.env.TC_SMS_SDK_APP_ID;
  if (!templateId || !signName || !smsSdkAppId) throw new Error('短信模板未配置');
  const response = await client.SendSms({
    SmsSdkAppId: smsSdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code],
    PhoneNumberSet: [`+86${phone}`],
  });
  const firstStatus = Array.isArray(response?.SendStatusSet) ? response.SendStatusSet[0] : null;
  if (firstStatus && firstStatus.Code && firstStatus.Code !== 'Ok') {
    throw new Error(firstStatus.Message || `短信发送失败(${firstStatus.Code})`);
  }
  return response;
}

async function sendEmailCode(email, scene, code) {
  const from = process.env.AUTH_EMAIL_FROM;
  if (!from) throw new Error('未配置发件人');
  const subject = scene === 'register'
    ? '注册验证码'
    : scene === 'bind'
      ? '绑定验证验证码'
    : scene === 'unbind'
        ? '解绑验证验证码'
      : scene === 'deactivate'
        ? '注销账号验证码'
        : '找回密码验证码';
  const action = scene === 'register'
    ? '注册'
    : scene === 'bind'
      ? '绑定账号'
    : scene === 'unbind'
        ? '解绑账号'
      : scene === 'deactivate'
        ? '注销账号'
        : '重置密码';
  const minutes = Math.ceil(CODE_TTL_SECONDS / 60);
  const text = `您的${action}验证码是 ${code}，${minutes} 分钟内有效。如非本人操作请忽略。`;
  const html = `<p>您的${action}验证码是 <b style="font-size:20px">${code}</b>，${minutes} 分钟内有效。</p><p>如非本人操作请忽略。</p>`;

  if (mailer) {
    try {
      await mailer.sendMail({ from, to: email, subject: `【益语智库】${subject}`, text, html });
      return;
    } catch (_) {
      // continue to SES fallback
    }
  }

  const client = sesClient || initSesClient();
  if (!client) throw new Error('邮件服务未配置');
  const templateId = Number(
    scene === 'register'
      ? process.env.TC_SES_TEMPLATE_ID_REGISTER || 0
      : (scene === 'bind' || scene === 'unbind' || scene === 'deactivate')
        ? process.env.TC_SES_TEMPLATE_ID_BIND || process.env.TC_SES_TEMPLATE_ID_RESET || 0
      : process.env.TC_SES_TEMPLATE_ID_RESET || 0
  );
  if (!templateId) throw new Error('未配置邮件模板ID');
  await client.SendEmail({
    FromEmailAddress: from,
    Destination: [email],
    Subject: `【益语智库】${subject}`,
    Template: {
      TemplateID: templateId,
      TemplateData: JSON.stringify({ code, expire_min: String(minutes), minutes: String(minutes) }),
    },
  });
}

async function sendBetaInviteEmail(app) {
  const from = process.env.AUTH_EMAIL_FROM;
  if (!from) throw new Error('未配置发件人');
  const email = safeText(app.user_email || app.userEmail).toLowerCase();
  const name = safeText(app.user_name || app.userName, '你好');
  const code = normalizeBetaCode(app.code);
  if (!email) throw new Error('申请人邮箱为空，无法发送内测码');
  if (!code) throw new Error('内测码为空，无法发送邮件');
  const downloadPage = `${PUBLIC_SITE_URL}?page=workbench`;
  const subject = '【益语智库 AI】您的内测邀请码';
  const text = [
    `${name}，`,
    '',
    '你的益语智库 AI 内测申请已通过。',
    `内测邀请码：${code}`,
    '',
    '请回到益语智库官网，点击“下载开源版”，输入邀请码后下载 macOS 安装包。',
    `下载入口：${downloadPage}`,
    '',
    '如果不是你本人申请，请忽略这封邮件。',
    '',
    '益语智库',
  ].join('\n');
  const html = `
    <p>${escapeHtml(name)}，</p>
    <p>你的益语智库 AI 内测申请已通过。</p>
    <p>内测邀请码：<b style="font-size:20px;letter-spacing:1px">${escapeHtml(code)}</b></p>
    <p>请回到益语智库官网，点击“下载开源版”，输入邀请码后下载 macOS 安装包。</p>
    <p><a href="${escapeHtml(downloadPage)}">打开益语智库 AI 下载入口</a></p>
    <p style="color:#666">如果不是你本人申请，请忽略这封邮件。</p>
    <p>益语智库</p>
  `;

  if (mailer) {
    try {
      await mailer.sendMail({ from, to: email, subject, text, html });
      return;
    } catch (_) {
      // continue to SES fallback when a dedicated template is configured
    }
  }

  const client = sesClient || initSesClient();
  if (!client) {
    throw new Error('内测邮件发送失败：SMTP 投递失败，且邮件推送服务未配置');
  }
  try {
    await client.SendEmail({
      FromEmailAddress: from,
      Destination: [email],
      Subject: subject,
      Simple: {
        Text: Buffer.from(text, 'utf8').toString('base64'),
        Html: Buffer.from(html, 'utf8').toString('base64'),
      },
    });
    return;
  } catch (_) {
    // Some SES accounts require approved templates for all sends; try a dedicated template when configured.
  }

  const betaTemplateId = Number(process.env.TC_SES_TEMPLATE_ID_BETA_INVITE || 0);
  const fallbackTemplateId = Number(process.env.TC_SES_TEMPLATE_ID_RESET || process.env.TC_SES_TEMPLATE_ID_REGISTER || 0);
  const sendTemplate = (templateId) => client.SendEmail({
    FromEmailAddress: from,
    Destination: [email],
    Subject: subject,
    Template: {
      TemplateID: templateId,
      TemplateData: JSON.stringify({
        name,
        code,
        site_url: PUBLIC_SITE_URL,
        download_url: downloadPage,
        expire_min: String(Math.ceil(RELEASE_DOWNLOAD_TTL_SECONDS / 60)),
        minutes: String(Math.ceil(RELEASE_DOWNLOAD_TTL_SECONDS / 60)),
      }),
    },
  });
  if (betaTemplateId) {
    try {
      await sendTemplate(betaTemplateId);
      return;
    } catch (_) {
      // Newly created templates can stay unavailable until Tencent Cloud review is complete.
    }
  }
  if (!fallbackTemplateId) {
    throw new Error('内测邮件发送失败：SMTP 与 SES 普通邮件均不可用，且未配置可用邮件模板');
  }
  await sendTemplate(fallbackTemplateId);
}

async function checkSendLimit(db, target, scene) {
  const intervalRes = await db.query(
    `SELECT count(*)::int AS c
     FROM auth_verification_codes
     WHERE target=$1 AND scene=$2 AND created_at > now() - ($3::text || ' second')::interval`,
    [target, scene, SEND_INTERVAL_SECONDS]
  );
  const dayRes = await db.query(
    `SELECT count(*)::int AS c
     FROM auth_verification_codes
     WHERE target=$1 AND scene=$2 AND created_at >= date_trunc('day', now())`,
    [target, scene]
  );
  if ((intervalRes.rows[0]?.c || 0) > 0) {
    throw new Error(`发送太频繁，请 ${SEND_INTERVAL_SECONDS} 秒后再试`);
  }
  if ((dayRes.rows[0]?.c || 0) >= MAX_PER_TARGET_PER_DAY) {
    throw new Error('今日发送次数已达上限');
  }
}

async function createCode(db, channel, target, scene, ip) {
  await checkSendLimit(db, target, scene);
  const code = generateCode();
  await db.query(
    `INSERT INTO auth_verification_codes(id, channel, target, scene, code_hash, expires_at, request_ip)
     VALUES ($1,$2,$3,$4,$5, now() + ($6::text || ' second')::interval, $7)`,
    [crypto.randomUUID(), channel, target, scene, hashCode(code), CODE_TTL_SECONDS, ip || null]
  );
  return code;
}

async function consumeValidCode(db, channel, target, scene, code) {
  const q = await db.query(
    `SELECT *
     FROM auth_verification_codes
     WHERE channel=$1 AND target=$2 AND scene=$3 AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [channel, target, scene]
  );
  const row = q.rows[0];
  if (!row) throw new Error('请先获取验证码');
  if (row.attempt_count >= MAX_VERIFY_RETRY) throw new Error('验证码已失效，请重新获取');
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error('验证码已过期');
  if (row.code_hash !== hashCode(code)) {
    await db.query('UPDATE auth_verification_codes SET attempt_count=attempt_count+1 WHERE id=$1', [row.id]);
    throw new Error('验证码错误');
  }
  await db.query('UPDATE auth_verification_codes SET used_at=now() WHERE id=$1', [row.id]);
}

async function findUserByChannel(db, channel, target) {
  if (channel === 'phone') {
    const q = await db.query('SELECT * FROM auth_users WHERE phone=$1 LIMIT 1', [target]);
    return q.rows[0] || null;
  }
  const q = await db.query('SELECT * FROM auth_users WHERE email=$1 LIMIT 1', [target]);
  return q.rows[0] || null;
}

async function findUserById(db, userId) {
  const q = await db.query('SELECT * FROM auth_users WHERE id=$1 LIMIT 1', [userId]);
  return q.rows[0] || null;
}

async function createSession(userId, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await pool.query(
    `INSERT INTO auth_sessions(id, user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, userId, tokenHash, expiresAt, req.headers['user-agent'] || null, req.socket.remoteAddress || null]
  );
  return { token, expiresAt };
}

async function findSessionByToken(token) {
  if (!token) return null;
  const q = await pool.query(
    `SELECT s.*, u.*, cp.client_name AS strategy_project_name
     FROM auth_sessions s
     JOIN auth_users u ON u.id = s.user_id
     LEFT JOIN client_projects cp ON cp.id = u.strategy_project_id
     WHERE s.token_hash=$1
       AND s.revoked_at IS NULL
       AND (s.expires_at IS NULL OR s.expires_at > now())
     LIMIT 1`,
    [hashToken(token)]
  );
  return q.rows[0] || null;
}

async function requireSession(req) {
  const token = parseBearerToken(req);
  if (!token) throw new Error('请先登录');
  const row = await findSessionByToken(token);
  if (!row) throw new Error('登录状态已失效，请重新登录');
  return row;
}

async function revokeSessionByToken(token) {
  if (!token) return;
  await pool.query('UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [hashToken(token)]);
}

async function revokeSessionsByUserId(userId) {
  if (!userId) return;
  await pool.query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

async function requireAdmin(req) {
  const row = await requireSession(req);
  if (!isAdminRow(row)) throw new Error('管理员权限不足');
  return row;
}

async function getOptionalSession(req) {
  const token = parseBearerToken(req);
  if (!token) return null;
  return findSessionByToken(token);
}

async function getInviteCodeForUse(db, code) {
  const q = await db.query('SELECT * FROM invite_codes WHERE code=$1 LIMIT 1 FOR UPDATE', [code]);
  const row = q.rows[0];
  if (!row) throw new Error('邀请码不存在');
  if (row.status === 'disabled') throw new Error('邀请码已禁用');
  if (Number(row.used_count || 0) >= Number(row.max_uses || 0)) {
    throw new Error('邀请码已兑换完毕');
  }
  return row;
}

async function applyInviteCodeToUser(db, code, userRow) {
  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) throw new Error('请输入邀请码');
  if (userRow.invitation_code === normalizedCode) {
    throw new Error('当前账号已使用过该邀请码');
  }

  const inviteRow = await getInviteCodeForUse(db, normalizedCode);
  const usedBy = Array.isArray(inviteRow.used_by) ? inviteRow.used_by : [];
  if (usedBy.includes(userRow.id)) {
    throw new Error('当前账号已使用过该邀请码');
  }

  const nextUsedCount = Number(inviteRow.used_count || 0) + 1;
  const nextStatus = nextUsedCount >= Number(inviteRow.max_uses || 0) ? 'redeemed' : 'valid';
  const nextUsedBy = [...usedBy, userRow.id];

  if ((inviteRow.grant_kind || 'member_days') === 'strategy_project') {
    if (userRow.strategy_project_id && userRow.strategy_project_id !== inviteRow.project_id) {
      throw new Error('当前账号已绑定其他机构，前台不支持更换机构');
    }
    if (!inviteRow.project_id) {
      throw new Error('该邀请码未绑定机构项目');
    }
    const projectRow = await findStrategyProjectById(db, inviteRow.project_id);
    if (!projectRow || !projectRow.is_active) {
      throw new Error('绑定的机构项目不存在');
    }
    if (!projectRow.is_published) {
      throw new Error('绑定的机构项目尚未发布');
    }

    await db.query(
      `UPDATE invite_codes
       SET used_count=$2, status=$3, used_by=$4
       WHERE id=$1`,
      [inviteRow.id, nextUsedCount, nextStatus, JSON.stringify(nextUsedBy)]
    );

    await db.query(
      `UPDATE auth_users
       SET member_type='gold',
           invitation_code=$2,
           invited_by=$3,
           paid_source='strategy_client',
           paid_started_at=COALESCE(paid_started_at, now()),
           paid_expires_at=NULL,
           paid_note=$4,
           strategy_project_id=$5,
           strategy_bound_at=COALESCE(strategy_bound_at, now()),
           strategy_access_source='invite_code'
       WHERE id=$1`,
      [
        userRow.id,
        normalizedCode,
        inviteRow.created_by || null,
        `通过机构邀请码 ${normalizedCode} 绑定 ${projectRow.client_name}`,
        projectRow.id,
      ]
    );

    const updated = await findUserById(db, userRow.id);
    return { inviteCode: mapInviteCode(inviteRow), user: updated };
  }

  const now = new Date();
  const currentExpire = userRow.paid_expires_at ? new Date(userRow.paid_expires_at) : null;
  const baseDate = currentExpire && currentExpire.getTime() > Date.now() ? currentExpire : now;
  const nextExpire = inviteRow.bonus_days > 0
    ? new Date(baseDate.getTime() + inviteRow.bonus_days * 24 * 3600 * 1000)
    : null;

  await db.query(
    `UPDATE invite_codes
     SET used_count=$2, status=$3, used_by=$4
     WHERE id=$1`,
    [inviteRow.id, nextUsedCount, nextStatus, JSON.stringify(nextUsedBy)]
  );

  await db.query(
    `UPDATE auth_users
     SET member_type='gold',
         invitation_code=$2,
         invited_by=$3,
         paid_source='invite_code',
         paid_started_at=COALESCE(paid_started_at, now()),
         paid_expires_at=$4,
         paid_note=$5
     WHERE id=$1`,
    [
      userRow.id,
      normalizedCode,
      inviteRow.created_by || null,
      nextExpire ? nextExpire.toISOString() : null,
      `通过邀请码 ${normalizedCode} 开通`,
    ]
  );

  const updated = await findUserById(db, userRow.id);
  return { inviteCode: mapInviteCode(inviteRow), user: updated };
}

async function listAdminUsers() {
  const q = await pool.query(
    `SELECT u.*, cp.client_name AS strategy_project_name
     FROM auth_users u
     LEFT JOIN client_projects cp ON cp.id = u.strategy_project_id
     ORDER BY u.created_at DESC`
  );
  return q.rows.map(mapUser);
}

function mapConsultRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    organization: safeText(row.organization),
    name: safeText(row.name),
    role: safeText(row.role),
    phone: safeText(row.phone),
    email: safeText(row.email),
    topic: safeText(row.topic),
    background: safeText(row.background),
    constraints: safeText(row.constraints),
    commitment: safeText(row.commitment),
    notes: safeText(row.notes),
    status: safeText(row.status, 'new'),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null,
    reviewedBy: row.reviewed_by || null,
  };
}

async function createConsultRequest(payload) {
  const organization = safeText(payload.organization);
  const name = safeText(payload.name);
  const role = safeText(payload.role);
  const phone = safeText(payload.phone);
  const email = safeText(payload.email).toLowerCase();
  const topic = safeText(payload.topic);
  const background = safeText(payload.background);
  const constraints = safeText(payload.constraints);
  const commitment = safeText(payload.commitment);
  const notes = safeText(payload.notes);

  if (!organization || !name || !role || !phone || !email || !topic || !background || !constraints || !commitment) {
    throw new Error('咨询申请字段不完整');
  }
  if (!/^1\d{10}$/.test(phone)) {
    throw new Error('手机号格式不正确');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('邮箱格式不正确');
  }

  const id = `consult_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const inserted = await pool.query(
    `INSERT INTO consult_requests(
       id, organization, name, role, phone, email, topic, background, constraints, commitment, notes, status, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'new', now())
     RETURNING *`,
    [id, organization, name, role, phone, email, topic, background, constraints, commitment, notes || null]
  );
  return mapConsultRequest(inserted.rows[0]);
}

async function listConsultRequests() {
  const q = await pool.query(
    `SELECT *
     FROM consult_requests
     ORDER BY created_at DESC, id DESC`
  );
  return q.rows.map(mapConsultRequest);
}

async function listComments({ contentId, contentType, status, scope }) {
  const params = [];
  const where = [];

  if (contentId) {
    params.push(contentId);
    where.push(`content_id = $${params.length}`);
  }
  if (contentType) {
    params.push(contentType);
    where.push(`content_type = $${params.length}`);
  }

  if (scope === 'admin') {
    if (status === 'has_reply') {
      where.push(`reply IS NOT NULL AND btrim(reply) <> ''`);
    } else if (status && status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
  } else {
    where.push(`status = 'approved'`);
  }

  const sql = `
    SELECT id, content_id, content_type, content_title, user_id, user_name, user_avatar, text, status, reply, created_at, updated_at
    FROM comments
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    LIMIT 300
  `;
  const q = await pool.query(sql, params);
  return q.rows.map(mapComment);
}

function sanitizeBuyerField(input, maxLength = 120) {
  const value = String(input || '').trim();
  return value ? value.slice(0, maxLength) : '';
}

function paymentProviderError(error, fallback) {
  const message = error?.payload?.message
    || error?.payload?.detail
    || error?.message
    || fallback;
  return String(message || fallback);
}

async function getPaymentOrderRowByOrderNo(db, orderNo, { forUpdate = false } = {}) {
  const sql = `SELECT * FROM payment_orders WHERE order_no=$1 LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`;
  const q = await db.query(sql, [orderNo]);
  return q.rows[0] || null;
}

async function updatePaymentOrderState(db, orderNo, patch) {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return getPaymentOrderRowByOrderNo(db, orderNo);
  }
  const setters = entries.map(([key], index) => `${key}=$${index + 2}`);
  const values = entries.map(([, value]) => value);
  const sql = `UPDATE payment_orders SET ${setters.join(', ')}, updated_at=now() WHERE order_no=$1`;
  await db.query(sql, [orderNo, ...values]);
  return getPaymentOrderRowByOrderNo(db, orderNo);
}

async function grantPaidMembershipForOrder(db, orderRow, effectivePaidAt) {
  if (!orderRow?.user_id || !orderRow.duration_days) {
    return null;
  }
  const userQ = await db.query('SELECT * FROM auth_users WHERE id=$1 LIMIT 1', [orderRow.user_id]);
  const userRow = userQ.rows[0];
  if (!userRow) return null;

  const paidAtDate = effectivePaidAt ? new Date(effectivePaidAt) : new Date();
  const currentExpire = userRow.paid_expires_at ? new Date(userRow.paid_expires_at) : null;
  const baseDate = currentExpire && currentExpire.getTime() > paidAtDate.getTime()
    ? currentExpire
    : paidAtDate;
  const nextExpire = new Date(baseDate.getTime() + Number(orderRow.duration_days || 0) * 24 * 60 * 60 * 1000);
  const startedAt = userRow.paid_expires_at && currentExpire && currentExpire.getTime() > paidAtDate.getTime()
    ? (userRow.paid_started_at || paidAtDate.toISOString())
    : paidAtDate.toISOString();

  await db.query(
    `UPDATE auth_users
       SET member_type='gold',
           paid_source='payment',
           paid_started_at=$2,
           paid_expires_at=$3,
           paid_note=$4
     WHERE id=$1`,
    [
      orderRow.user_id,
      startedAt,
      nextExpire.toISOString(),
      `微信支付订单 ${orderRow.order_no}`,
    ]
  );
  const updated = await findUserById(db, orderRow.user_id);
  return updated;
}

async function markPaymentOrderPaid(db, orderRow, params) {
  if (!orderRow) return null;
  if (orderRow.status === 'paid') {
    return orderRow;
  }
  const paidAt = params.paidAt || new Date().toISOString();
  await db.query(
    `UPDATE payment_orders
       SET status='paid',
           provider_order_id=COALESCE($2, provider_order_id),
           paid_at=$3,
           notify_payload=COALESCE($4, notify_payload),
           provider_payload=COALESCE($5, provider_payload),
           note=$6,
           updated_at=now()
     WHERE order_no=$1`,
    [
      orderRow.order_no,
      params.providerOrderId || null,
      paidAt,
      params.notifyPayload ? JSON.stringify(params.notifyPayload) : null,
      params.providerPayload ? JSON.stringify(params.providerPayload) : null,
      '支付成功',
    ]
  );
  const fresh = await getPaymentOrderRowByOrderNo(db, orderRow.order_no);
  await grantPaidMembershipForOrder(db, fresh, paidAt);
  return getPaymentOrderRowByOrderNo(db, orderRow.order_no);
}

async function syncPaymentOrderWithProvider(orderRow) {
  if (!orderRow || !['pending'].includes(orderRow.status)) {
    return orderRow;
  }
  const readiness = getPaymentReadiness();
  if (!readiness.enabled) {
    return orderRow;
  }
  const config = await loadWeChatPayConfig();
  const data = await wechatRequest(
    config,
    'GET',
    `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderRow.order_no)}?mchid=${encodeURIComponent(config.mchid)}`
  );
  const nextStatus = mapWechatTradeStateToOrderStatus(data?.trade_state);
  if (nextStatus === 'paid') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await getPaymentOrderRowByOrderNo(client, orderRow.order_no, { forUpdate: true });
      const updated = await markPaymentOrderPaid(client, locked, {
        providerOrderId: data?.transaction_id,
        providerPayload: data,
        paidAt: data?.success_time,
      });
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return updatePaymentOrderState(pool, orderRow.order_no, {
    status: nextStatus,
    provider_order_id: data?.transaction_id || null,
    provider_payload: data ? JSON.stringify(data) : null,
    note: nextStatus === 'closed' ? '订单已关闭' : nextStatus === 'failed' ? '支付失败' : '待支付',
  });
}

async function createPaymentOrderRow(userRow, payload, req) {
  const plan = PAYMENT_PLANS[payload.planId];
  if (!plan) throw new Error('无效的会员套餐');
  const readiness = getPaymentReadiness();
  if (!readiness.enabled) {
    const missing = readiness.items.filter((item) => !item.configured).map((item) => item.label);
    const error = new Error(`支付配置未完成：${missing.join('、')}`);
    error.statusCode = 503;
    error.readiness = readiness;
    throw error;
  }

  const buyerName = sanitizeBuyerField(payload.buyerName, 60);
  const buyerOrg = sanitizeBuyerField(payload.buyerOrg, 120);
  const buyerPhone = sanitizeBuyerField(payload.buyerPhone, 30);
  const buyerEmail = sanitizeBuyerField(payload.buyerEmail, 120).toLowerCase();
  const buyerNote = sanitizeBuyerField(payload.buyerNote, 500);

  if (!buyerName || !buyerPhone || !buyerEmail) {
    throw new Error('请完整填写姓名、手机号和邮箱');
  }

  const config = await loadWeChatPayConfig();
  await ensurePlatformCert(config);
  const id = crypto.randomUUID();
  const orderNo = `YY${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const timeExpire = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO payment_orders(
       id, order_no, user_id, user_nickname, plan_id, plan_name, amount_fen, currency, duration_days,
       member_type_target, buyer_name, buyer_org, buyer_phone, buyer_email, buyer_note,
       channel, provider_name, status, note, expires_at, time_expire
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'paid',$10,$11,$12,$13,$14,'wechat_h5','wechatpay','pending','等待支付',now() + interval '30 minutes',$15)`,
    [
      id,
      orderNo,
      userRow.id,
      userRow.nickname || null,
      plan.id,
      plan.name,
      plan.amountFen,
      plan.currency,
      plan.durationDays,
      buyerName,
      buyerOrg || null,
      buyerPhone,
      buyerEmail,
      buyerNote || null,
      timeExpire,
    ]
  );

  try {
    const description = `${plan.name} - 益语智库`.slice(0, 127);
    const wechatPayload = {
      appid: config.appid,
      mchid: config.mchid,
      description,
      out_trade_no: orderNo,
      notify_url: config.notifyUrl,
      time_expire: timeExpire,
      amount: {
        total: plan.amountFen,
        currency: plan.currency,
      },
      scene_info: {
        payer_client_ip: getClientIp(req),
        h5_info: {
          type: 'Wap',
        },
      },
      attach: JSON.stringify({
        userId: userRow.id,
        planId: plan.id,
      }),
    };

    const providerData = await wechatRequest(config, 'POST', '/v3/pay/transactions/h5', wechatPayload);
    if (!providerData?.h5_url) {
      throw new Error('微信支付未返回可用的 H5 支付链接');
    }

    await updatePaymentOrderState(pool, orderNo, {
      h5_url_snapshot: providerData.h5_url,
      provider_payload: JSON.stringify(providerData),
      note: '待支付',
      time_expire: providerData?.time_expire || timeExpire,
    });

    const fresh = await getPaymentOrderRowByOrderNo(pool, orderNo);
    return {
      order: mapPaymentOrder(fresh),
      readiness,
      h5Url: providerData.h5_url,
      timeExpire: fresh?.time_expire || timeExpire,
    };
  } catch (error) {
    const message = paymentProviderError(error, '微信支付下单失败');
    await updatePaymentOrderState(pool, orderNo, {
      status: 'failed',
      note: message,
      provider_payload: error?.payload ? JSON.stringify(error.payload) : null,
    });
    throw error;
  }
}

async function listPaymentOrders({ admin, userId, limit = 20 }) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const params = [];
  const where = [];
  if (!admin && userId) {
    params.push(userId);
    where.push(`user_id = $${params.length}`);
  }
  params.push(safeLimit);
  const sql = `
    SELECT *
    FROM payment_orders
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    LIMIT $${params.length}
  `;
  const q = await pool.query(sql, params);
  return q.rows.map(mapPaymentOrder);
}

function mapStrategyProjectSummary(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    projectName: row.project_name || row.client_name,
    description: row.description || '',
    slug: row.slug || toProjectSlug(row.client_name || row.project_name || row.id),
    logoUrl: resolveEffectiveLogoUrl(row.logo_url, row.case_logo_url),
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at || undefined,
    status: row.status || 'active',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isLegacyCaseLogoUrl(input) {
  return /^\/?images\/cases\//i.test(safeText(input));
}

function resolveEffectiveLogoUrl(primaryLogoUrl, caseLogoUrl) {
  const primary = safeText(primaryLogoUrl);
  const fallback = safeText(caseLogoUrl);
  if (!fallback) return primary;
  if (!primary || isLegacyCaseLogoUrl(primary)) {
    return fallback;
  }
  return primary;
}

function mapStrategyLearningResource(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    summary: row.summary || '',
    relation: row.relation || '',
    detail: Array.isArray(row.detail) ? row.detail : [],
    kind: row.kind || '文章',
    link: row.link || '',
    sourceType: row.source_type || 'manual',
    internalType: row.internal_type || undefined,
    internalId: row.internal_id || undefined,
    sortOrder: Number(row.sort_order || 0),
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const YIYU_TONG_FORM_URL = process.env.YIYU_DIAGNOSIS_FORM_URL || '/?page=consult-apply';
const YIYU_TONG_SOURCE_LIMIT = 3;
const YIYU_TONG_SOURCE_TYPE_LABELS = {
  insight: '洞察文章',
  report: '前沿报告',
  book: '推荐书籍',
  methodology: '益语方法论',
  case: '案例展示',
  page: '官网页面',
};

function getAssistantPublicUrl(type, idOrSlug) {
  const value = encodeURIComponent(safeText(idOrSlug));
  if (type === 'insight') return `/?page=article&id=${value}`;
  if (type === 'report') return `/?page=report&id=${value}`;
  if (type === 'book') return `/?page=book-reader&id=${value}`;
  if (type === 'methodology') return `/?page=methodology-library&id=${value}`;
  if (type === 'case') return `/?page=case&id=${value}`;
  return '/';
}

function toAssistantDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return safeText(value);
  }
  return date.toISOString().slice(0, 10);
}

function buildAssistantSnippet(text, fallback = '') {
  const normalized = normalizeExtractedText(text || fallback || '');
  if (!normalized) return '';
  return normalized.slice(0, 140);
}

function buildAssistantTags(topics) {
  return safeTopicArray(topics);
}

function buildAssistantTitleMatches(query, title) {
  const normalizedQuery = safeText(query).toLowerCase();
  const normalizedTitle = safeText(title).toLowerCase();
  if (!normalizedQuery || !normalizedTitle) return 0;
  if (normalizedTitle.includes(normalizedQuery)) return 120;
  if (normalizedQuery.includes(normalizedTitle) && normalizedTitle.length >= 4) return 80;
  return 0;
}

function extractAssistantTokens(question) {
  const raw = safeText(question)
    .replace(/[，。！？、,.!?/|｜]+/g, ' ')
    .trim();
  const stopWords = new Set([
    '我们', '你们', '一下', '一个', '一些', '这个', '那个', '哪些', '最新', '内容',
    '看看', '一下子', '一下吧', '一下吗', '一下呢', '怎么', '如何', '是否', '可以',
    '帮我', '带我', '进入', '打开', '跳到', '页面', '官网', '资料', '推荐', '什么',
    '有关', '关于', '那里', '哪里', '想看', '想找', '想了解',
  ]);
  const matches = raw.match(/[\p{Script=Han}A-Za-z0-9]{2,}/gu) || [];
  return Array.from(new Set(matches.filter((item) => !stopWords.has(item))));
}

function detectAssistantContentTypes(question) {
  const q = safeText(question);
  const types = new Set();
  if (/文章|洞察/.test(q)) types.add('insight');
  if (/报告/.test(q)) types.add('report');
  if (
    /图书馆|图书|书籍|书单|书目|读物|本书|这本书|那本书|哪些书|什么书|推荐书|找书|看书|有关的书|相关的书/.test(q)
  ) {
    types.add('book');
  }
  if (/方法论|工具/.test(q)) types.add('methodology');
  if (/案例|客户/.test(q)) types.add('case');
  return Array.from(types);
}

function scoreAssistantSource(source, question, tokens, typedFilters) {
  const haystack = [
    source.title,
    source.summary,
    source.authorOrPublisher,
    (source.tags || []).join(' '),
    source.plainText,
    source.clientName,
  ].join('\n').toLowerCase();

  let score = buildAssistantTitleMatches(question, source.title);

  if (typedFilters.length && typedFilters.includes(source.contentType)) {
    score += 20;
  }

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (!normalized) continue;
    if (safeText(source.title).toLowerCase().includes(normalized)) score += 35;
    if ((source.tags || []).some((tag) => safeText(tag).toLowerCase().includes(normalized))) score += 22;
    if (safeText(source.authorOrPublisher).toLowerCase().includes(normalized)) score += 16;
    if (safeText(source.clientName).toLowerCase().includes(normalized)) score += 26;
    if (safeText(source.summary).toLowerCase().includes(normalized)) score += 12;
    if (haystack.includes(normalized)) score += 4;
  }

  const publishDate = Date.parse(source.publishDate || source.updatedAt || source.createdAt || '');
  if (Number.isFinite(publishDate)) {
    score += Math.max(0, 6 - Math.floor((Date.now() - publishDate) / (1000 * 60 * 60 * 24 * 30)));
  }

  return score;
}

function matchesAssistantTopic(source, topic) {
  const wanted = safeText(topic);
  if (!wanted) return true;
  const haystack = [
    source.title,
    source.summary,
    source.authorOrPublisher,
    source.clientName,
    source.plainText,
    ...(source.tags || []),
  ]
    .map((item) => safeText(item))
    .join('\n');
  return haystack.includes(wanted);
}

function pickLatestRelevantSource(sources, type, topic = '') {
  return sources
    .filter((item) => item.contentType === type)
    .filter((item) => matchesAssistantTopic(item, topic))
    .sort((a, b) => {
      const aTime = Date.parse(a.publishDate || a.updatedAt || a.createdAt || '') || 0;
      const bTime = Date.parse(b.publishDate || b.updatedAt || b.createdAt || '') || 0;
      return bTime - aTime;
    })[0];
}

function listRelevantSourcesByType(sources, type, topic = '') {
  return sources
    .filter((item) => item.contentType === type)
    .filter((item) => matchesAssistantTopic(item, topic))
    .sort((a, b) => {
      const aTime = Date.parse(a.publishDate || a.updatedAt || a.createdAt || '') || 0;
      const bTime = Date.parse(b.publishDate || b.updatedAt || b.createdAt || '') || 0;
      return bTime - aTime;
    });
}

async function listAssistantSources() {
  const [insightsQ, reportsQ, booksQ, methodsQ, casesQ] = await Promise.all([
    pool.query(
      `SELECT id, title, excerpt, content, content_html, content_text, topics, cover_image, publish_date, updated_at, created_at
       FROM insights
       WHERE status='published'
       ORDER BY publish_date DESC NULLS LAST, updated_at DESC`
    ),
    pool.query(
      `SELECT id, title, publisher, summary, topics, cover_image, publish_date, updated_at, created_at
       FROM reports
       WHERE status='published'
       ORDER BY publish_date DESC NULLS LAST, updated_at DESC`
    ),
    pool.query(
      `SELECT id, title, author, description, abstract, topics, cover_image, publish_date, updated_at, created_at
       FROM books
       WHERE status='published'
       ORDER BY publish_date DESC NULLS LAST, updated_at DESC`
    ),
    pool.query(
      `SELECT id, title, excerpt, content, content_html, content_text, topics, cover_image, publish_date, updated_at, created_at
       FROM methodologies
       WHERE status='published'
       ORDER BY publish_date DESC NULLS LAST, updated_at DESC`
    ),
    pool.query(
      `SELECT id, slug, client_name, logo_url, ppt_file_name, created_at, updated_at
       FROM case_showcases
       WHERE is_active = true AND is_published = true
       ORDER BY sort_order ASC, created_at ASC`
    ),
  ]);

  const sources = [];

  for (const row of insightsQ.rows) {
    const plainText = normalizeExtractedText(
      row.content_text || stripHtmlTags(row.content_html || row.content || '')
    );
    sources.push({
      contentType: 'insight',
      contentId: row.id,
      title: safeText(row.title),
      summary: safeText(row.excerpt),
      tags: buildAssistantTags(row.topics),
      authorOrPublisher: '',
      publishDate: toAssistantDate(row.publish_date),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      publicUrl: getAssistantPublicUrl('insight', row.id),
      coverUrl: safeText(row.cover_image),
      plainText,
      sourceSnippet: buildAssistantSnippet(row.excerpt, plainText),
      clientName: '',
    });
  }

  for (const row of reportsQ.rows) {
    const plainText = normalizeExtractedText(row.summary || '');
    sources.push({
      contentType: 'report',
      contentId: row.id,
      title: safeText(row.title),
      summary: safeText(row.summary),
      tags: buildAssistantTags(row.topics),
      authorOrPublisher: safeText(row.publisher),
      publishDate: toAssistantDate(row.publish_date),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      publicUrl: getAssistantPublicUrl('report', row.id),
      coverUrl: safeText(row.cover_image),
      plainText,
      sourceSnippet: buildAssistantSnippet(row.summary, plainText),
      clientName: '',
    });
  }

  for (const row of booksQ.rows) {
    const plainText = normalizeExtractedText([row.description, row.abstract, row.author].filter(Boolean).join('\n\n'));
    sources.push({
      contentType: 'book',
      contentId: row.id,
      title: safeText(row.title),
      summary: safeText(row.description || row.abstract),
      tags: buildAssistantTags(row.topics),
      authorOrPublisher: safeText(row.author),
      publishDate: toAssistantDate(row.publish_date),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      publicUrl: getAssistantPublicUrl('book', row.id),
      coverUrl: safeText(row.cover_image),
      plainText,
      sourceSnippet: buildAssistantSnippet(row.description || row.abstract, plainText),
      clientName: '',
    });
  }

  for (const row of methodsQ.rows) {
    const plainText = normalizeExtractedText(
      row.content_text || stripHtmlTags(row.content_html || row.content || '')
    );
    sources.push({
      contentType: 'methodology',
      contentId: row.id,
      title: safeText(row.title),
      summary: safeText(row.excerpt),
      tags: buildAssistantTags(row.topics),
      authorOrPublisher: '',
      publishDate: toAssistantDate(row.publish_date),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      publicUrl: getAssistantPublicUrl('methodology', row.id),
      coverUrl: safeText(row.cover_image),
      plainText,
      sourceSnippet: buildAssistantSnippet(row.excerpt, plainText),
      clientName: '',
    });
  }

  for (const row of casesQ.rows) {
    const title = safeText(row.client_name);
    const snippet = buildAssistantSnippet(`${title}案例展示`);
    sources.push({
      contentType: 'case',
      contentId: row.id,
      title,
      summary: snippet,
      tags: [],
      authorOrPublisher: '',
      publishDate: toAssistantDate(row.updated_at || row.created_at),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      publicUrl: getAssistantPublicUrl('case', row.slug || row.id),
      coverUrl: resolveEffectiveLogoUrl(row.logo_url, ''),
      plainText: normalizeExtractedText([title, row.ppt_file_name].filter(Boolean).join('\n')),
      sourceSnippet: snippet,
      clientName: title,
    });
  }

  return sources;
}

function mapAssistantSourceCard(source) {
  return {
    contentType: source.contentType,
    contentId: source.contentId,
    title: source.title,
    snippet: source.sourceSnippet || source.summary || '',
    tags: source.tags || [],
    publishDate: source.publishDate || '',
    url: source.publicUrl,
    coverUrl: source.coverUrl || '',
    label: YIYU_TONG_SOURCE_TYPE_LABELS[source.contentType] || '内容',
  };
}

function buildAssistantPageCard(pageId, snippet = '') {
  const page = getYiyuTongSiteMapPage(pageId);
  if (!page) return null;
  return {
    contentType: 'page',
    contentId: page.id,
    title: safeText(page.label),
    snippet: safeText(snippet),
    tags: [],
    publishDate: '',
    url: safeText(page.url || ''),
    coverUrl: '',
    label: '官网页面',
  };
}

function buildContactAnswerText() {
  const context = getYiyuTongSiteMapPage('about')?.answerContext?.contact || {};
  const parts = [];
  if (safeText(context.phone)) parts.push(`电话 ${safeText(context.phone)}`);
  if (safeText(context.email)) parts.push(`邮箱 ${safeText(context.email)}`);
  if (safeText(context.wechatOfficial)) parts.push(`公众号/微信 ${safeText(context.wechatOfficial)}`);
  if (!parts.length) {
    return '联系方式已整理在“关于我们”的联系我们区域。';
  }
  return `联系方式在“关于我们”的联系我们区域，${parts.join('，')}。`;
}

function buildMembershipAnswerText() {
  const context = getYiyuTongSiteMapPage('membership')?.answerContext || {};
  const plans = Array.isArray(context.plans) ? context.plans : [];
  const rights = Array.isArray(context.rights) ? context.rights.filter(Boolean) : [];
  const planText = plans.length
    ? plans
        .map((plan) => `${safeText(plan.name)} ${safeText(plan.price)} / ${Number(plan.durationDays || 0)}天`)
        .join('；')
    : '当前可在会员介绍页查看套餐';
  const rightsText = rights.length ? `权益说明：${rights.join('；')}。` : '';
  return `开通入口在会员介绍页，目前套餐包括：${planText}。${rightsText}`.trim();
}

function buildPageAnswerTextById(pageId) {
  if (pageId === 'about') return buildContactAnswerText();
  if (pageId === 'membership') return buildMembershipAnswerText();
  return '';
}

function detectContactInfoIntent(question) {
  return /(联系方式|联系你们|联系信息|联系电话|电话|邮箱|电子邮箱|微信|公众号)/.test(safeText(question));
}

function detectMembershipInfoIntent(question) {
  return /(开通会员|续费|收费|价格|权益|付费会员|普通会员|套餐|月包|年包|怎么开通会员|如何收费)/.test(safeText(question));
}

function buildPageAnswerResponse({ pageId, goal, message, snippet }) {
  const citation = buildAssistantPageCard(pageId, snippet);
  return buildAssistantResponseEnvelope({
    mode: 'answer',
    goal,
    entities: {
      pageTarget: safeText(getYiyuTongSiteMapPage(pageId)?.url || ''),
      query: goal,
    },
    message,
    citations: citation ? [citation] : [],
    finalState: buildFinalState({
      pageId,
      url: safeText(getYiyuTongSiteMapPage(pageId)?.url || ''),
      note: message,
    }),
  });
}

function buildPageSectionTaskResponse({
  currentUrl,
  pageId,
  sectionId,
  goal,
  message,
  successMessage,
  mode = 'site_task',
  citations = [],
}) {
  const page = getYiyuTongSiteMapPage(pageId);
  if (!page?.url) {
    return buildAssistantResponseEnvelope({
      mode: 'answer',
      goal,
      message: '当前官网地图里还没有这条页面路径信息。',
      finalState: buildFinalState({ note: '当前官网地图里还没有这条页面路径信息。' }),
    });
  }

  const normalizedCurrent = normalizeAssistantTarget(currentUrl);
  const normalizedTarget = normalizeAssistantTarget(page.url);
  const graphSteps = [];

  if (!normalizedCurrent || normalizedCurrent !== normalizedTarget) {
    graphSteps.push(
      buildGraphStep('open_target_page', 'open_url', {
        target: page.url,
        pageId,
        detail: `正在进入${page.label}。`,
      })
    );
  }

  if (safeText(sectionId)) {
    graphSteps.push(
      buildGraphStep('scroll_target_section', 'scroll_section', {
        sectionId,
        passes: 1,
        detail: `正在定位${page.label}中的目标区域。`,
      })
    );
  }

  const routeTargets = [
    {
      label: page.label,
      target: page.url,
      pageId,
      detail: `进入${page.label}`,
    },
  ];

  return buildSiteTaskGraphResponse({
    mode,
    goal,
    message,
    prompt: [
      `请在益语官网当前标签页内完成这个请求：${goal}`,
      `先确保进入 ${page.label}（${page.url}）。`,
      safeText(sectionId) ? `然后滚动并定位到区块 ${sectionId}。` : '进入页面后确认页面已稳定打开。',
      '如果页面已经到达目标位置，立即调用 done。',
    ].join('\n'),
    entities: {
      pageTarget: page.url,
      query: goal,
    },
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', `识别到你想定位${page.label}里的指定区域。`),
      buildAssistantStep('planning', '正在规划操作步骤', `计划进入${page.label}并定位到目标区域。`),
      buildAssistantStep('locating', '正在定位相关页面', `准备进入${page.label}。`),
      buildAssistantStep('acting', '正在操作页面', `正在定位${page.label}中的目标区域。`),
    ),
    citations,
    route: buildRouteFromTargets(routeTargets),
    completionRules: buildTaskRules(['detail_opened']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    graphSteps,
    successMessage,
    expectedUrl: page.url,
    pageId,
    finalState: buildFinalState({
      pageId,
      url: page.url,
      note: successMessage,
    }),
    fallbackPlan: {
      action: buildAssistantAction('open_url', `前往${page.label}`, page.url),
    },
  });
}

function buildContactMembershipMixedTaskResponse({ currentUrl, question }) {
  const aboutContext = getYiyuTongSiteMapPage('about')?.answerContext?.contact || {};
  const contactSnippet = buildContactAnswerText();
  const membershipSnippet = buildMembershipAnswerText();
  const aboutCitation = buildAssistantPageCard('about', contactSnippet);
  const membershipCitation = buildAssistantPageCard('membership', membershipSnippet);
  const sectionId = safeText(aboutContext.sectionId || 'about-contact');
  const summary = `${contactSnippet}${membershipSnippet ? ` ${membershipSnippet}` : ''}`.trim();

  return buildPageSectionTaskResponse({
    currentUrl,
    pageId: 'about',
    sectionId,
    goal: safeText(question),
    message: '我先带你定位联系方式区域，再把会员开通、收费和权益告诉你。',
    successMessage: summary,
    mode: 'mixed_task',
    citations: [aboutCitation, membershipCitation].filter(Boolean),
  });
}

function summarizeAssistantSource(source) {
  const raw = safeText(source.summary || source.sourceSnippet || source.plainText || '');
  if (!raw) {
    return `已为你打开《${source.title}》。`;
  }
  const compact = raw.replace(/\s+/g, ' ').trim();
  const snippet = compact.length > 96 ? `${compact.slice(0, 96)}…` : compact;
  return `已为你打开《${source.title}》。主要内容：${snippet}`;
}

function buildAssistantFallbackAnswer(question, sources) {
  if (!sources.length) {
    return '当前官网已发布内容中未找到相关信息。';
  }
  const leading = sources.slice(0, 3).map((item) => item.title).join('、');
  if (/最新/.test(question)) {
    return `目前官网最新可查看的内容包括：${leading}。`;
  }
  return `我先帮你定位到这些相关内容：${leading}。`;
}

async function buildAssistantAnswer(question, sources) {
  if (!sources.length) {
    return '当前官网已发布内容中未找到相关信息。';
  }

  if (!isArkReady()) {
    return buildAssistantFallbackAnswer(question, sources);
  }

  try {
    const content = await callArkChat([
      {
        role: 'system',
        content: [
          '你是益语智库官网前台助手“益语通”。',
          '你只能依据提供的官网已发布内容回答。',
          '请用简洁中文回答，控制在120字以内。',
          '不要编造官网没有写明的事实。',
          '找不到明确依据时，直接回答：当前官网已发布内容中未找到相关信息。',
          '只返回 JSON，格式为 {"answer":"..."}。',
        ].join(''),
      },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          sources: sources.slice(0, 5).map((item) => ({
            type: YIYU_TONG_SOURCE_TYPE_LABELS[item.contentType] || item.contentType,
            title: item.title,
            tags: item.tags,
            summary: item.summary,
            snippet: item.sourceSnippet,
            authorOrPublisher: item.authorOrPublisher,
            publishDate: item.publishDate,
          })),
        }),
      },
    ]);
    const parsed = extractJsonObject(content);
    const answer = safeText(parsed.answer);
    return answer || buildAssistantFallbackAnswer(question, sources);
  } catch {
    return buildAssistantFallbackAnswer(question, sources);
  }
}

function detectConsultIntent(question) {
  return /(咨询|诊断|合作沟通|预约诊断|预约咨询|联系你们|怎么合作|申请咨询)/.test(safeText(question));
}

function detectFormFieldFollowupIntent(question) {
  return /(姓名|机构|单位|组织|手机号|手机|电话|邮箱|email|需求|备注|补充一下|继续填写|继续补充|再补充|更新一下|改成|是|来自)/i.test(
    safeText(question)
  );
}

function shouldContinueActiveFormTask(question, activeFormContext) {
  if (!activeFormContext?.active) return false;
  const q = safeText(question);
  if (!q) return false;
  if (detectConsultIntent(q)) return true;
  if (detectFormFieldFollowupIntent(q)) return true;
  if (/继续|接着|补填|补充|填写|填一下|写进去/.test(q)) return true;
  return false;
}

function detectNavigationIntent(question) {
  return /(打开|进入|带我去|前往|跳到|去看|去到|看看|定位|跳转|在哪|哪里|哪儿|打开最新|打开.*案例|进入.*案例|去.*案例|案例在哪|案例在哪里|页面在哪|详情在哪)/.test(
    safeText(question)
  );
}

function detectContentQuestionIntent(question) {
  return /(有哪些|有什么|推荐|总结|概述|介绍一下|做了什么|是什么|为什么|如何|怎么理解|内容|资料|区别|比较)/.test(
    safeText(question)
  );
}

function detectGuideIntent(question) {
  return /(第一次来|第一次用|先看看|先看什么|从哪里开始|适合.*负责人|负责人.*看什么)/.test(
    safeText(question)
  );
}

function detectActionIntent(question) {
  return /(打开|进入|带我去|前往|跳到|去看|去到|看看|定位|跳转|在哪|哪里|哪儿|搜索|筛选|找到|找出|点开|点进去|给我看|帮我开|帮我打开|帮我进入|帮我定位|帮我筛|帮我找|帮我看|浏览|查看|切到|切换到)/.test(
    safeText(question)
  );
}

function detectSummaryIntent(question) {
  return /(总结|概括|概述|主要内容|主要讲了什么|核心内容|说说内容|帮我总结|总结一下|概括一下)/.test(
    safeText(question)
  );
}

function detectMixedTaskIntent(question) {
  const safe = safeText(question);
  if (!safe) return false;
  const hasAction = detectActionIntent(safe);
  const hasAnswerNeed = detectContentQuestionIntent(safe) || detectSummaryIntent(safe) || /(告诉我|说明|说说|如何收费|怎么开通|对应的权益|联系方式)/.test(safe);
  return hasAction && hasAnswerNeed;
}

function detectLastIntent(question) {
  return /(最后一[本篇份个条项家]?|最后那个|最后一个|最末|排在最后|最后的)/.test(
    safeText(question)
  );
}

function detectFirstIntent(question) {
  return /(第一[本篇份个条项家]?|最前面|排在最前|第一个|第一个结果)/.test(
    safeText(question)
  );
}

function detectCommentIntent(question) {
  return /(评论|留言|评价)/.test(safeText(question));
}

function detectSubmitIntent(question) {
  return /(提交|发表|发布|发送)/.test(safeText(question));
}

function extractCommentText(question) {
  const safe = safeText(question);
  if (!safe) return '';
  const patterns = [
    /写(?:一条|一个|个|一句)?\s*([^，。；！？]+?)(?=并?(?:提交|发表|发布|发送|保存)|[，。；！？]|$)/,
    /评论(?:内容)?(?:是|写成|写为)?[:：]?\s*[“"「]?([^”"」]+?)[”"」]?(?=并?(?:提交|发表|发布|发送|保存)|[，。；！？]|$)/,
    /留言(?:内容)?(?:是|写成|写为)?[:：]?\s*[“"「]?([^”"」]+?)[”"」]?(?=并?(?:提交|发表|发布|发送|保存)|[，。；！？]|$)/,
    /评价(?:内容)?(?:是|写成|写为)?[:：]?\s*[“"「]?([^”"」]+?)[”"」]?(?=并?(?:提交|发表|发布|发送|保存)|[，。；！？]|$)/,
    /[“"「]([^”"」]{2,})[”"」]/,
  ];

  for (const pattern of patterns) {
    const match = safe.match(pattern);
    if (match?.[1]) {
      return safeText(match[1])
        .replace(/并?(提交|发表|发布|发送|保存).*$/, '')
        .replace(/^(在)?《[^》]+》(?:这本书|这篇文章|这个案例)?/,'')
        .trim();
    }
  }

  const genericMatch = safe.match(/评论(?:内容)?(?:是|写成|写为)?[:：]?\s*([^，。；！？]+)/);
  if (genericMatch?.[1]) {
    const text = safeText(genericMatch[1])
      .replace(/并?(提交|发表|发布|发送|保存).*$/, '')
      .trim();
    return text.includes('评论') ? text : `${text}评论`;
  }
  return '';
}

function splitSequentialClauses(question) {
  const safe = safeText(question);
  if (!safe) return [];
  const normalized = safe
    .replace(/[，,]\s*(然后|接着|随后)/g, '|||')
    .replace(/[，,]\s*再/g, '|||')
    .replace(/\s+(然后|接着|随后)\s+/g, '|||')
    .replace(/\s+再(?=给我|帮我|带我|看|去|打开|进入)/g, '|||');
  return normalized
    .split('|||')
    .map((item) => safeText(item))
    .filter(Boolean);
}

function getAssistantPageIdFromTarget(target) {
  const normalized = normalizeAssistantTarget(target);
  if (normalized === '/') return 'home';
  const params = new URLSearchParams(normalized.split('?')[1] || '');
  const pageParam = safeText(params.get('page'));
  if (!pageParam) return '';

  const direct = getYiyuTongSiteMapPage(pageParam);
  if (direct) return direct.id;

  const matched = Object.values(YIYU_TONG_SITE_MAP.pages || {}).find((page) => {
    if (safeText(page?.url) === normalized) return true;
    const pattern = safeText(page?.urlPattern);
    if (!pattern || !pattern.includes(':id')) return false;
    const prefix = pattern.split(':id')[0];
    return prefix ? normalized.startsWith(prefix) : false;
  });
  return matched?.id || pageParam;
}

function buildGraphStep(id, type, payload = {}) {
  return { id, type, ...payload };
}

function findQuotedTitleSource(question, sources) {
  const safe = safeText(question);
  const match = safe.match(/《([^》]+)》/);
  if (!match?.[1]) return null;
  const quoted = safeText(match[1]);
  return sources.find((item) => safeText(item.title) === quoted) || null;
}

function cleanNavigationSubject(question) {
  return safeText(question)
    .replace(/(带我去|帮我去|帮我打开|打开|进入|前往|跳到|去看|去到|看看|定位到|给我看|我想看|我想去|帮我找|带我看|请|请问|告诉我|我想知道)/g, ' ')
    .replace(/^(去)\s*/g, ' ')
    .replace(/(在哪里|在哪|哪里|哪儿|怎么去|怎么打开|怎么进入)/g, ' ')
    .replace(/(^我|^那|^这个|^那个|\b我\b|\b那\b|\b这个\b|\b那个\b)/g, ' ')
    .replace(/(一下|页面|网页|介绍页|详情页|详情|案例|文章|报告|书籍|图书|方法论|工具|内容|最新|最近)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDirectSourceNavigationQuery(question) {
  const q = safeText(question);
  if (!q) return false;
  return detectNavigationIntent(q) || /(案例|页面|详情|介绍|图书馆|文章中心|前沿报告|方法论|工具|书籍|报告)/.test(q);
}

function findDirectNavigationSource(question, sources) {
  if (!isDirectSourceNavigationQuery(question)) return null;
  const normalizedQuestion = safeText(question);
  const cleaned = cleanNavigationSubject(normalizedQuestion);
  if (!cleaned || cleaned.length < 2) return null;

  const scored = sources
    .map((source) => {
      const candidates = [safeText(source.title), safeText(source.clientName)].filter(Boolean);
      let score = 0;
      for (const candidate of candidates) {
        if (candidate === cleaned) {
          score = Math.max(score, 320 + candidate.length);
        } else if (candidate.includes(cleaned) || cleaned.includes(candidate)) {
          score = Math.max(score, 260 + Math.min(candidate.length, cleaned.length));
        } else if (normalizedQuestion.includes(candidate)) {
          score = Math.max(score, 220 + candidate.length);
        }
      }
      return { source, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  if (scored.length === 1) return scored[0].source;
  return scored[0].score - scored[1].score >= 20 ? scored[0].source : null;
}

function normalizeAssistantTarget(target) {
  if (!target) return '';
  if (/^https?:\/\//.test(target)) {
    const url = new URL(target);
    return `${url.pathname}${url.search}`;
  }
  return target;
}

function buildAssistantTaskPlan(targetLabel) {
  return [
    '正在理解你的目标',
    '正在规划操作步骤',
    `正在定位${targetLabel || '相关页面'}`,
    '正在操作页面',
  ];
}

function buildAssistantAction(type, label, target, prefillPayload = undefined) {
  return { type, label, target, prefillPayload };
}

function resolvePageNavigation(question) {
  const q = safeText(question);
  if (/(最新|最近)/.test(q) && /(报告|文章|洞察|书|图书|书籍|方法论|工具|案例|客户)/.test(q)) {
    return null;
  }
  if (/(联系方式|联系你们|联系信息|电话|邮箱|怎么联系)/.test(q)) {
    return { label: '关于我们', target: '/?page=about' };
  }
  if (/(开通会员|续费|收费|价格|权益|付费会员|普通会员)/.test(q)) {
    return { label: '会员介绍', target: '/?page=membership' };
  }
  if (/图书馆|书籍页|推荐书籍/.test(q)) {
    return { label: '图书馆', target: '/?page=book-library' };
  }
  if (/学习中心/.test(q)) {
    return { label: '学习中心', target: '/?page=learning' };
  }
  if (/文章中心|洞察文章/.test(q)) {
    return { label: '文章中心', target: '/?page=article-center' };
  }
  if (/前沿报告|报告库/.test(q)) {
    return { label: '前沿报告', target: '/?page=report-library' };
  }
  if (/前沿洞察|洞察页/.test(q)) {
    return { label: '前沿洞察', target: '/?page=insights' };
  }
  if (/方法论|工具/.test(q)) {
    return { label: '益语方法论', target: '/?page=methodology-library' };
  }
  if (/战略陪伴/.test(q)) {
    return { label: '战略陪伴', target: '/?page=strategy' };
  }
  if (/关于我们/.test(q)) {
    return { label: '关于我们', target: '/?page=about' };
  }
  if (/首页/.test(q)) {
    return { label: '首页', target: '/' };
  }
  return null;
}

function detectAssistantTopic(question) {
  const q = safeText(question);
  if (/AI/.test(q)) return 'AI 技术';
  if (/业务设计/.test(q)) return '业务设计';
  if (/组织/.test(q)) return '组织';
  if (/战略/.test(q)) return '战略';
  return '';
}

function buildPageTaskResponse({ label, target, currentUrl, message }) {
  const normalizedTarget = normalizeAssistantTarget(target);
  if (currentUrl && normalizedTarget && currentUrl === normalizedTarget) {
    return {
      mode: 'answer',
      message: `当前已经在${label}。`,
      citations: [],
      taskPlan: [],
      taskSpec: null,
      fallbackAction: null,
      handoff: null,
      collectedFields: null,
    };
  }

  return {
    mode: 'site_task',
    message: message || `我来带你进入${label}。`,
    citations: [],
    taskPlan: buildAssistantTaskPlan(label),
    taskSpec: {
      prompt: [
        `你的任务是在当前网站同一标签页内打开${label}。`,
        `必须先使用 open_internal_url 打开 "${target}"。`,
        '如果页面已经正确打开，立即调用 done。',
      ].join(''),
      bootstrapUrl: target,
      expectedUrl: target,
      pageId: (() => {
        const params = new URLSearchParams(target.split('?')[1] || '');
        return params.get('page') || 'home';
      })(),
      phaseDetails: {
        understanding: `识别到你想进入「${label}」。`,
        planning: `计划在当前标签页直接打开${label}。`,
        locating: `准备定位并进入${label}。`,
        acting: `正在完成${label}的页面切换。`,
      },
      openMode: 'none',
      successMessage: `已为你打开${label}。`,
      fallbackAction: buildAssistantAction('open_url', `前往${label}`, target),
    },
    fallbackAction: buildAssistantAction('open_url', `前往${label}`, target),
    handoff: null,
    collectedFields: null,
  };
}

function buildDirectSourceTaskResponse(source, currentUrl) {
  const normalizedTarget = normalizeAssistantTarget(source.publicUrl);
  if (currentUrl && normalizedTarget && currentUrl === normalizedTarget) {
    return {
      mode: 'answer',
      message: `当前就是《${source.title}》页面。`,
      citations: [],
      taskPlan: [],
      taskSpec: null,
      fallbackAction: null,
      handoff: null,
      collectedFields: null,
    };
  }

  return {
    mode: 'site_task',
    message: `我来带你打开《${source.title}》。`,
    citations: [],
    taskPlan: buildAssistantTaskPlan(source.title),
    taskSpec: {
      prompt: [
        `你的任务是在当前网站同一标签页内打开《${source.title}》。`,
        `必须先使用 open_internal_url 打开 "${source.publicUrl}"。`,
        '页面正确打开后立即调用 done，不要额外解释。',
      ].join(''),
      bootstrapUrl: source.publicUrl,
      expectedUrl: source.publicUrl,
      pageId: (() => {
        const params = new URLSearchParams(source.publicUrl.split('?')[1] || '');
        return params.get('page') || 'home';
      })(),
      phaseDetails: {
        understanding: `识别到你想查看《${source.title}》。`,
        planning: `计划直接进入《${source.title}》对应的前台页面。`,
        locating: `准备定位《${source.title}》页面。`,
        acting: `正在打开《${source.title}》。`,
      },
      openMode: 'none',
      successMessage: `已为你打开《${source.title}》。`,
      fallbackAction: buildAssistantAction('open_detail', '打开对应页面', source.publicUrl),
    },
    fallbackAction: buildAssistantAction('open_detail', '打开对应页面', source.publicUrl),
    handoff: null,
    collectedFields: null,
  };
}

function buildFilterTaskResponse({
  question,
  contentType,
  pageLabel,
  pageTarget,
  pageId,
  topic,
  targetSource,
  openMode = 'none',
  wantsSummary = false,
}) {
  const targetText = topic ? `${topic}相关的${pageLabel}` : pageLabel;
  const shouldOpenResult = detectActionIntent(question);
  const contentTypeLabel = {
    insight: '文章',
    report: '报告',
    book: '图书',
    methodology: '方法论',
  }[contentType] || pageLabel;
  const promptParts = [
    `你的任务是在当前网站同一标签页内帮用户找到${targetText}。`,
    `如果当前不在${pageLabel}页面，先使用 open_internal_url 打开 "${pageTarget}"。`,
  ];

  if (topic) {
    promptParts.push(`然后优先使用站内筛选工具，把标签切到“${topic}”。`);
  }

  if (shouldOpenResult) {
    if (targetSource?.title) {
      promptParts.push(
        `筛选完成后，优先打开标题为《${targetSource.title}》的内容。`
      );
    } else if (openMode === 'last') {
      promptParts.push('筛选完成后，直接打开当前结果列表中的最后一项。');
    } else if (openMode === 'first') {
      promptParts.push('筛选完成后，直接打开当前结果列表中的第一项。');
    } else {
      promptParts.push('如果筛选后只有一个明显匹配的结果，就直接打开它；否则停留在筛选后的结果页并调用 done。');
    }
  }

  promptParts.push('任务完成后立即调用 done，用一句中文说明你已经完成了什么。');

  return {
    mode: 'site_task',
    message: `我来帮你定位${targetText}。`,
    citations: [],
    taskPlan: buildAssistantTaskPlan(targetText),
    taskSpec: {
      prompt: promptParts.join(''),
      bootstrapUrl: pageTarget,
      expectedUrl: targetSource && shouldOpenResult ? targetSource.publicUrl : pageTarget,
      pageId,
      phaseDetails: {
        understanding: topic
          ? `识别到你想找和「${topic}」有关的${contentTypeLabel}。`
          : `识别到你想找${pageLabel}里的相关内容。`,
        planning: targetSource && shouldOpenResult
          ? `计划先进入${pageLabel}，完成筛选后直接打开《${targetSource.title}》。`
          : openMode === 'last' && shouldOpenResult
            ? `计划先进入${pageLabel}，完成筛选后打开最后一个结果。`
            : openMode === 'first' && shouldOpenResult
              ? `计划先进入${pageLabel}，完成筛选后打开第一个结果。`
          : `计划先进入${pageLabel}，完成筛选后停留在更合适的结果页。`,
        locating: `准备进入${pageLabel}并定位相关结果。`,
        acting: targetSource && shouldOpenResult
          ? `正在筛选并打开《${targetSource.title}》。`
          : openMode === 'last' && shouldOpenResult
            ? `正在筛选并打开最后一个结果。`
            : openMode === 'first' && shouldOpenResult
              ? `正在筛选并打开第一个结果。`
          : `正在筛选${targetText}。`,
      },
      filters: {
        topic: topic || '',
      },
      openTitle: targetSource && shouldOpenResult ? targetSource.title : '',
      openMode: targetSource && shouldOpenResult ? 'exact' : shouldOpenResult ? openMode : 'none',
      successMessage: targetSource && shouldOpenResult
        ? wantsSummary ? summarizeAssistantSource(targetSource) : `已帮你定位到《${targetSource.title}》。`
        : `已帮你定位到${targetText}。`,
      fallbackAction: buildAssistantAction(
        targetSource && shouldOpenResult ? 'open_detail' : 'open_list',
        targetSource && shouldOpenResult ? '打开对应页面' : `前往${pageLabel}`,
        targetSource && shouldOpenResult ? targetSource.publicUrl : pageTarget
      ),
    },
    fallbackAction: buildAssistantAction(
      targetSource && shouldOpenResult ? 'open_detail' : 'open_list',
      targetSource && shouldOpenResult ? '打开对应页面' : `前往${pageLabel}`,
      targetSource && shouldOpenResult ? targetSource.publicUrl : pageTarget
    ),
    handoff: null,
    collectedFields: null,
  };
}

function buildGuideTaskResponse(question) {
  const topic = detectAssistantTopic(question) || '组织';
  return {
    mode: 'site_task',
    message: '我先带你去看更适合上手的内容入口。',
    citations: [],
    taskPlan: buildAssistantTaskPlan('适合上手的内容入口'),
    taskSpec: {
      prompt: [
        '你的任务是为第一次来访的用户打开更适合入门的内容入口。',
        '请先使用 open_internal_url 打开 "/?page=article-center"。',
        `再优先使用站内筛选工具，将标签切换到“${topic}”。`,
        '如果页面中出现最上方的内容列表，说明任务完成，立即调用 done。',
      ].join(''),
      bootstrapUrl: '/?page=article-center',
      expectedUrl: '/?page=article-center',
      pageId: 'article-center',
      phaseDetails: {
        understanding: '识别到你是第一次来，希望先看更适合上手的内容。',
        planning: `计划先进入文章中心，再按「${topic}」整理更适合的入口。`,
        locating: '准备进入文章中心。',
        acting: `正在切换到「${topic}」相关内容并整理入口。`,
      },
      filters: {
        topic,
      },
      openMode: 'none',
      successMessage: '已为你打开更适合上手的内容入口。',
      fallbackAction: buildAssistantAction('open_url', '前往文章中心', '/?page=article-center'),
    },
    fallbackAction: buildAssistantAction('open_url', '前往文章中心', '/?page=article-center'),
    handoff: null,
    collectedFields: null,
  };
}

const YIYU_TONG_PAGE_TARGETS = {
  home: { label: '首页', target: '/' },
  insights: { label: '前沿洞察', target: '/?page=insights' },
  learning: { label: '学习中心', target: '/?page=learning' },
  'article-center': { label: '文章中心', target: '/?page=article-center' },
  'report-library': { label: '前沿报告', target: '/?page=report-library' },
  'book-library': { label: '图书馆', target: '/?page=book-library' },
  'methodology-library': { label: '益语方法论', target: '/?page=methodology-library' },
  strategy: { label: '战略陪伴', target: '/?page=strategy' },
  about: { label: '关于我们', target: '/?page=about' },
  membership: { label: '会员介绍', target: '/?page=membership' },
  'user-center': { label: '个人中心', target: '/?page=user-center' },
  'consult-apply': { label: '咨询申请', target: '/?page=consult-apply' },
};

function resolvePlannerPageTarget(key) {
  const normalized = safeText(key).toLowerCase();
  if (!normalized) return null;
  return YIYU_TONG_PAGE_TARGETS[normalized] || null;
}

function detectSiteTourIntent(question) {
  return /(带我逛|逛一下|滑动一下|滑动看个大概|看个大概|带我浏览|逐页看看|从头到尾滑动|从头到尾看|每个板块|整个网站)/.test(
    safeText(question)
  );
}

function buildAssistantStep(id, label, detail = '') {
  return { id, label, detail };
}

function buildAssistantSteps(...steps) {
  return steps.filter(Boolean);
}

function buildUserVisiblePlan(steps = []) {
  return (Array.isArray(steps) ? steps : [])
    .map((step, index) => {
      const label = safeText(step?.label);
      const detail = safeText(step?.detail);
      if (!label) return '';
      return detail ? `${index + 1}. ${label}：${detail}` : `${index + 1}. ${label}`;
    })
    .filter(Boolean)
    .join('\n');
}

function getYiyuTongSiteMapPage(pageId) {
  return YIYU_TONG_SITE_MAP?.pages?.[pageId] || null;
}

function getYiyuTongSharedSections() {
  return Array.isArray(YIYU_TONG_SITE_MAP?.sharedSections) ? YIYU_TONG_SITE_MAP.sharedSections : [];
}

function getYiyuTongCompletionRule(kind) {
  const rule = YIYU_TONG_SITE_MAP?.completionRules?.[kind];
  if (!rule) return null;
  return {
    kind: safeText(rule.kind || kind),
    detail: safeText(rule.successHint || rule.detail || ''),
    target: safeText(rule.adminState || ''),
  };
}

function buildTaskRules(kinds = []) {
  return kinds
    .map((kind) => getYiyuTongCompletionRule(kind) || { kind: safeText(kind), detail: '', target: '' })
    .filter((rule) => rule.kind);
}

function buildFailureRules(...rules) {
  return rules
    .flat()
    .map((rule) => {
      if (!rule) return null;
      if (typeof rule === 'string') {
        const mapped = getYiyuTongCompletionRule(rule);
        return mapped || { kind: safeText(rule), detail: '', target: '' };
      }
      return {
        kind: safeText(rule.kind),
        detail: safeText(rule.detail),
        target: safeText(rule.target),
      };
    })
    .filter(Boolean);
}

function buildFinalState({ pageId = '', url = '', note = '' } = {}) {
  const resolvedPage = getYiyuTongSiteMapPage(pageId);
  return {
    pageId: safeText(pageId),
    url: safeText(url || resolvedPage?.url || ''),
    note: safeText(note),
  };
}

function buildRouteNode({
  id = '',
  pageId = '',
  pageLabel = '',
  level = '',
  enterable = undefined,
  action = '',
  target = '',
  detail = '',
} = {}) {
  const resolvedPage = getYiyuTongSiteMapPage(pageId);
  return {
    id: safeText(id || pageId || target || pageLabel),
    pageId: safeText(pageId || resolvedPage?.id || ''),
    pageLabel: safeText(pageLabel || resolvedPage?.label || ''),
    level: safeText(level || resolvedPage?.level || ''),
    enterable: typeof enterable === 'boolean' ? enterable : resolvedPage?.publicTour !== false,
    action: safeText(action),
    target: safeText(target || resolvedPage?.url || ''),
    detail: safeText(detail),
  };
}

function buildRouteFromTargets(targets = []) {
  return targets
    .map((target, index) =>
      buildRouteNode({
        id: `route_${index + 1}`,
        pageId: target.pageId || getAssistantPageIdFromTarget(target.target || ''),
        pageLabel: target.label || '',
        target: target.target || '',
        level: getYiyuTongSiteMapPage(target.pageId || getAssistantPageIdFromTarget(target.target || ''))?.level || '',
        enterable: true,
        action: 'open',
        detail: safeText(target.detail || ''),
      })
    )
    .filter((item) => item.pageId || item.target || item.pageLabel);
}

function buildUserVisiblePlanFromRoute(targets = [], answerText = '') {
  const routeLines = (Array.isArray(targets) ? targets : [])
    .map((target, index) => {
      const label = safeText(target?.label || target?.pageLabel || target?.pageId || target?.target);
      const detail = safeText(target?.detail || target?.note);
      if (!label) return '';
      return `${index + 1}. ${label}${detail ? `：${detail}` : ''}`;
    })
    .filter(Boolean);
  if (answerText) {
    routeLines.push(`结果说明：${answerText}`);
  }
  return routeLines.join('\n');
}

function getRepresentativeContentTypeForPage(pageId) {
  return {
    'article-center': 'insight',
    'report-library': 'report',
    'book-library': 'book',
    'methodology-library': 'methodology',
    strategy: 'case',
  }[pageId] || '';
}

function getLatestRepresentativeSourceForPage(pageId, sources = []) {
  const contentType = getRepresentativeContentTypeForPage(pageId);
  if (!contentType) return null;
  return pickLatestSourceByType(sources, contentType) || null;
}

function mapSectionsForTourStop(page, options = {}) {
  const excludeTypes = new Set(Array.isArray(options.excludeTypes) ? options.excludeTypes : []);
  const sharedSections = getYiyuTongSharedSections()
    .filter((section) => section.tour)
    .filter((section) => !excludeTypes.has(section.type))
    .map((section) => ({
      id: section.id,
      title: section.title,
      type: section.type,
      order: Number(section.order || 0),
      enterable: Boolean(section.enterable),
    }));
  const pageSections = Array.isArray(page?.sections)
    ? page.sections
        .filter((section) => section.tour)
        .filter((section) => !excludeTypes.has(section.type))
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((section) => ({
          id: section.id,
          title: section.title,
          type: section.type,
          order: Number(section.order || 0),
          enterable: Boolean(section.enterable),
        }))
    : [];
  return [...sharedSections, ...pageSections].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function buildTourStopsFromSiteMap(sources = []) {
  const publicOrder = Array.isArray(YIYU_TONG_SITE_MAP?.tour?.publicOrder)
    ? YIYU_TONG_SITE_MAP.tour.publicOrder
    : [];
  const stops = [];

  for (const pageId of publicOrder) {
    const page = getYiyuTongSiteMapPage(pageId);
    if (!page) continue;
    stops.push({
      id: page.id,
      label: page.label,
      url: page.url,
      pageId: page.id,
      summary: `浏览${page.label}的主要公开内容。`,
      sections: mapSectionsForTourStop(page),
    });

    const representativeChildren = Array.isArray(page.representativeChildren) ? page.representativeChildren : [];
    for (const childPageId of representativeChildren) {
      const child = getYiyuTongSiteMapPage(childPageId);
      if (!child) continue;
      const childLatestSource = getLatestRepresentativeSourceForPage(child.id, sources);
      stops.push({
        id: `${page.id}__${child.id}`,
        label: child.level === 'detail' && childLatestSource ? childLatestSource.title : child.label,
        url: child.level === 'detail' && childLatestSource ? childLatestSource.publicUrl : child.url,
        pageId: child.id,
        summary:
          child.level === 'detail' && childLatestSource
            ? `进入${page.label}里的代表性详情页《${childLatestSource.title}》后返回${page.label}。`
            : `进入${child.label}看代表性内容后返回${page.label}。`,
        sections: mapSectionsForTourStop(child, child.level === 'detail' ? { excludeTypes: ['comments'] } : {}),
        isRepresentativeChild: true,
        isRepresentativeDetail: child.level === 'detail',
        returnUrl: page.url,
        returnPageId: page.id,
      });
      if (child.level === 'detail') {
        if (YIYU_TONG_SITE_MAP?.rules?.returnAfterRepresentativeVisit) {
          stops.push({
            id: `${page.id}__return_from__${child.id}`,
            label: `返回${page.label}`,
            url: page.url,
            pageId: page.id,
            summary: `返回${page.label}后继续后续导览。`,
            sections: [],
            isTransitStop: true,
          });
        }
        continue;
      }
      const representativeDetail = child.tourRepresentativeDetail === true ? child.representativeDetail : null;
      const latestSource = representativeDetail
        ? childLatestSource
        : null;
      const detailPage = representativeDetail?.pageId
        ? getYiyuTongSiteMapPage(representativeDetail.pageId)
        : null;
      if (representativeDetail && latestSource && detailPage) {
        stops.push({
          id: `${child.id}__detail__${latestSource.contentId}`,
          label: latestSource.title,
          url: latestSource.publicUrl,
          pageId: detailPage.id,
          summary: `进入${child.label}里的代表性详情页《${latestSource.title}》后返回${child.label}。`,
          sections: mapSectionsForTourStop(detailPage, { excludeTypes: ['comments'] }),
          isRepresentativeDetail: true,
          returnUrl: child.url,
          returnPageId: child.id,
        });
        if (YIYU_TONG_SITE_MAP?.rules?.returnAfterRepresentativeVisit) {
          stops.push({
            id: `${child.id}__return_from_detail__${latestSource.contentId}`,
            label: `返回${child.label}`,
            url: child.url,
            pageId: child.id,
            summary: `返回${child.label}后继续当前模块的导览。`,
            sections: [],
            isTransitStop: true,
          });
        }
      }
      if (YIYU_TONG_SITE_MAP?.rules?.returnAfterRepresentativeVisit) {
        stops.push({
          id: `${page.id}__return_from__${child.id}`,
          label: `返回${page.label}`,
          url: page.url,
          pageId: page.id,
          summary: `返回${page.label}后继续后续导览。`,
          sections: [],
          isTransitStop: true,
        });
      }
    }
  }

  return stops;
}

function getAssistantPageConfigByType(type) {
  return {
    insight: { pageId: 'article-center', ...YIYU_TONG_PAGE_TARGETS['article-center'] },
    report: { pageId: 'report-library', ...YIYU_TONG_PAGE_TARGETS['report-library'] },
    book: { pageId: 'book-library', ...YIYU_TONG_PAGE_TARGETS['book-library'] },
    methodology: { pageId: 'methodology-library', ...YIYU_TONG_PAGE_TARGETS['methodology-library'] },
    case: { pageId: 'strategy', ...YIYU_TONG_PAGE_TARGETS.strategy },
  }[type] || null;
}

function getAssistantMissingFields(fields) {
  const missing = [];
  if (!safeText(fields.organization)) missing.push('机构');
  if (!safeText(fields.name)) missing.push('姓名');
  if (!safeText(fields.role)) missing.push('角色');
  if (!safeText(fields.phone)) missing.push('手机号');
  if (!safeText(fields.email)) missing.push('邮箱');
  if (!safeText(fields.topic)) missing.push('核心问题');
  if (!safeText(fields.background)) missing.push('已有尝试');
  if (!safeText(fields.constraints)) missing.push('阻力或约束');
  if (!safeText(fields.commitment)) missing.push('可投入资源');
  return missing;
}

function buildSameTabExecutionPlan(input) {
  return {
    executor: 'same_tab_page_agent',
    ...input,
  };
}

function buildMultiTabExecutionPlan(input) {
  return {
    executor: 'multi_tab_extension',
    ...input,
  };
}

function buildNoopExecutionPlan() {
  return { executor: 'none' };
}

function buildAssistantResponseEnvelope({
  mode,
  goal,
  entities = null,
  message,
  steps = [],
  citations = [],
  executionPlan = buildNoopExecutionPlan(),
  fallbackPlan = null,
  formContext = null,
  userVisiblePlan = '',
  route = [],
  completionRules = [],
  failureRules = [],
  finalState = null,
}) {
  return {
    mode,
    goal,
    entities,
    message,
    userVisiblePlan: userVisiblePlan || buildUserVisiblePlan(steps),
    route,
    steps,
    completionRules,
    failureRules,
    citations,
    finalState,
    executionPlan,
    fallbackPlan,
    formContext,
  };
}

function buildSiteTaskGraphResponse({
  mode = 'site_task',
  goal,
  message,
  prompt = '',
  entities = null,
  steps = [],
  citations = [],
  graphSteps = [],
  successMessage = '',
  expectedUrl = '',
  pageId = '',
  completionCheck = null,
  fallbackPlan = null,
  formContext = null,
  route = [],
  completionRules = [],
  failureRules = [],
  finalState = null,
}) {
  const graphPrompt = graphSteps.map((step, index) => {
    switch (step.type) {
      case 'open_url':
        return `${index + 1}. 打开站内页面 ${step.target}`;
      case 'set_filters':
        return `${index + 1}. 设置页面筛选`;
      case 'set_sort_mode':
        return `${index + 1}. 切换排序为 ${step.sortMode}`;
      case 'go_to_page':
        return `${index + 1}. 切到第 ${step.pageNumber} 页`;
      case 'open_content_card':
        return `${index + 1}. 打开目标内容卡片`;
      case 'fill_local_form_fields':
        return `${index + 1}. 填写当前页面表单字段`;
      case 'fill_comment':
        return `${index + 1}. 写入评论内容`;
      case 'submit_comment':
        return `${index + 1}. 提交评论`;
      case 'scroll_section':
        return `${index + 1}. 滚动浏览页面`;
      case 'expand_section':
        return `${index + 1}. 展开页面区域`;
      default:
        return `${index + 1}. 执行页面动作`;
    }
  }).join('；');

  return buildAssistantResponseEnvelope({
    mode,
    goal,
    entities,
    message,
    steps,
    citations,
    route,
    completionRules,
    failureRules,
    finalState: finalState || buildFinalState({ pageId, url: expectedUrl, note: successMessage || message }),
    executionPlan: buildSameTabExecutionPlan({
      kind: mode === 'site_tour' ? 'site_tour' : mode === 'mixed_task' ? 'mixed_task' : 'site_task',
      prompt: prompt || graphPrompt || message,
      graphSteps,
      expectedUrl: expectedUrl || '',
      pageId: pageId || '',
      successMessage,
      route,
      completionRules,
      failureRules,
      completionCheck,
    }),
    fallbackPlan,
    formContext,
  });
}

function buildCurrentPageResponse(message, goal = '当前页面已满足目标') {
  const currentPageId = getAssistantPageIdFromTarget('/');
  return buildAssistantResponseEnvelope({
    mode: 'answer',
    goal,
    message,
    finalState: buildFinalState({ note: message, pageId: currentPageId }),
  });
}

function buildPageTargetTaskResponse({ label, target, currentUrl, goal, detail, mode = 'site_task', citations = [] }) {
  const normalizedTarget = normalizeAssistantTarget(target);
  const pageId = (() => {
    const params = new URLSearchParams(target.split('?')[1] || '');
    return params.get('page') || 'home';
  })();
  if (currentUrl && normalizedTarget && currentUrl === normalizedTarget) {
    return buildCurrentPageResponse(`当前已经在${label}。`, goal || `当前已在${label}`);
  }

  return buildAssistantResponseEnvelope({
    mode,
    goal: goal || `进入${label}`,
    entities: {
      pageTarget: target,
    },
    message: `我来带你进入${label}。`,
    citations,
    route: buildRouteFromTargets([{ label, target, pageId }]),
    completionRules: buildTaskRules(['detail_opened']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    finalState: buildFinalState({
      pageId,
      url: target,
      note: detail || `已为你打开${label}。`,
    }),
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', `识别到你想进入「${label}」。`),
      buildAssistantStep('planning', '正在规划操作步骤', `计划在当前标签页直接打开${label}。`),
      buildAssistantStep('locating', '正在定位相关页面', `准备进入${label}。`),
      buildAssistantStep('acting', '正在操作页面', `正在完成${label}的页面切换。`)
    ),
    executionPlan: buildSameTabExecutionPlan({
      kind: mode === 'mixed_task' ? 'mixed_task' : 'site_task',
      prompt: [
        `你的任务是在当前网站同一标签页内打开${label}。`,
        `先使用 open_internal_url 打开 "${target}"。`,
        '如果页面正确打开，立即调用 done。',
      ].join(' '),
      bootstrapUrl: target,
      expectedUrl: target,
      pageId,
      successMessage: detail || `已为你打开${label}。`,
      route: buildRouteFromTargets([{ label, target, pageId }]),
      completionRules: buildTaskRules(['detail_opened']),
      failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    }),
    fallbackPlan: {
      action: buildAssistantAction('open_url', `前往${label}`, target),
    },
  });
}

function buildDirectSourceTaskResponseV2(source, currentUrl, wantsSummary = false, mode = 'site_task') {
  const normalizedTarget = normalizeAssistantTarget(source.publicUrl);
  const pageId = (() => {
    const params = new URLSearchParams(source.publicUrl.split('?')[1] || '');
    return params.get('page') || 'home';
  })();
  if (currentUrl && normalizedTarget && currentUrl === normalizedTarget) {
    return buildCurrentPageResponse(`当前就是《${source.title}》页面。`, `查看《${source.title}》`);
  }

  return buildAssistantResponseEnvelope({
    mode,
    goal: `查看《${source.title}》`,
    entities: {
      contentTypes: [source.contentType],
      targetId: source.contentId,
      targetTitle: source.title,
    },
    message: `我来带你打开《${source.title}》。`,
    citations: wantsSummary ? [mapAssistantSourceCard(source)] : [],
    route: buildRouteFromTargets([{
      label: source.title,
      target: source.publicUrl,
      pageId,
      detail: `进入《${source.title}》详情页`,
    }]),
    completionRules: buildTaskRules(['detail_opened']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    finalState: buildFinalState({
      pageId,
      url: source.publicUrl,
      note: wantsSummary ? summarizeAssistantSource(source) : `已为你打开《${source.title}》。`,
    }),
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', `识别到你想查看《${source.title}》。`),
      buildAssistantStep('planning', '正在规划操作步骤', `计划直接进入《${source.title}》对应的前台页面。`),
      buildAssistantStep('locating', '正在定位相关页面', `准备定位《${source.title}》页面。`),
      buildAssistantStep('acting', '正在操作页面', `正在打开《${source.title}》。`)
    ),
    executionPlan: buildSameTabExecutionPlan({
      kind: mode === 'mixed_task' ? 'mixed_task' : 'site_task',
      prompt: [
        `你的任务是在当前网站同一标签页内打开《${source.title}》。`,
        `先使用 open_internal_url 打开 "${source.publicUrl}"。`,
        '页面正确打开后立即调用 done，不要额外解释。',
      ].join(' '),
      bootstrapUrl: source.publicUrl,
      expectedUrl: source.publicUrl,
      pageId,
      successMessage: wantsSummary ? summarizeAssistantSource(source) : `已为你打开《${source.title}》。`,
      route: buildRouteFromTargets([{
        label: source.title,
        target: source.publicUrl,
        pageId,
        detail: `进入《${source.title}》详情页`,
      }]),
      completionRules: buildTaskRules(['detail_opened']),
      failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    }),
    fallbackPlan: {
      action: buildAssistantAction('open_detail', '打开对应页面', source.publicUrl),
    },
  });
}

function buildFilterTaskResponseV2({
  question,
  contentType,
  pageLabel,
  pageTarget,
  pageId,
  topic,
  searchQuery,
  targetSource,
  openMode = 'none',
  wantsSummary = false,
  mode = 'site_task',
}) {
  const targetText = topic ? `${topic}相关的${pageLabel}` : pageLabel;
  const shouldOpenResult = true;
  const typeEntities = contentType ? [contentType] : [];
  const finalOpenMode = targetSource?.title ? 'exact' : openMode;
  const finalOpenTitle = targetSource?.title || '';

  const promptParts = [
    `请在益语官网当前标签页内完成这个请求：${question}`,
    `你需要帮用户定位${targetText}。`,
    `如果当前不在${pageLabel}页面，先使用 open_internal_url 打开 "${pageTarget}"。`,
  ];

  if (topic) {
    promptParts.push(`然后优先使用站内筛选工具，将标签切到“${topic}”。`);
  }

  if (searchQuery) {
    promptParts.push(`然后在当前列表页中搜索“${searchQuery}”。`);
  }

  if (targetSource?.title) {
    promptParts.push(`筛选完成后，打开标题为《${targetSource.title}》的内容。`);
  } else if (openMode === 'last') {
    promptParts.push('筛选完成后，直接打开当前结果列表中的最后一项。');
  } else if (openMode === 'first') {
    promptParts.push('筛选完成后，直接打开当前结果列表中的第一项。');
  } else if (!shouldOpenResult) {
    promptParts.push('筛选完成后停留在当前结果页并调用 done。');
  }

  promptParts.push('任务完成后立即调用 done，并用一句中文简要汇报结果。');

  return buildAssistantResponseEnvelope({
    mode,
    goal: `定位${targetText}`,
    entities: {
      contentTypes: typeEntities,
      topic: topic || '',
      targetTitle: targetSource?.title || '',
      targetId: targetSource?.contentId || '',
      query: safeText(searchQuery || question),
      wantsSummary,
      wantsFirst: openMode === 'first',
      wantsLast: openMode === 'last',
    },
    message: `我来帮你定位${targetText}。`,
    citations: targetSource && wantsSummary ? [mapAssistantSourceCard(targetSource)] : [],
    route: buildRouteFromTargets(
      [
        {
          label: pageLabel,
          target: pageTarget,
          pageId,
          detail: `进入${pageLabel}`,
        },
        targetSource
          ? {
              label: targetSource.title,
              target: targetSource.publicUrl,
              pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
              detail: `打开《${targetSource.title}》`,
            }
          : null,
      ].filter(Boolean)
    ),
    completionRules: buildTaskRules([targetSource ? 'detail_opened' : 'detail_opened']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    finalState: buildFinalState({
      pageId: targetSource ? getAssistantPageIdFromTarget(targetSource.publicUrl) : pageId,
      url: targetSource ? targetSource.publicUrl : pageTarget,
      note: targetSource && wantsSummary
        ? summarizeAssistantSource(targetSource)
        : targetSource
          ? `已帮你打开《${targetSource.title}》。`
          : `已帮你定位到${targetText}。`,
    }),
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', topic
        ? `识别到你想找和「${topic}」有关的${pageLabel}。`
        : searchQuery
          ? `识别到你想在${pageLabel}里搜索「${searchQuery}」。`
          : `识别到你想找${pageLabel}里的相关内容。`),
      buildAssistantStep('planning', '正在规划操作步骤', targetSource?.title
        ? `计划先进入${pageLabel}，完成筛选后打开《${targetSource.title}》。`
        : openMode === 'last'
          ? `计划先进入${pageLabel}，完成筛选后打开最后一个结果。`
          : openMode === 'first'
            ? `计划先进入${pageLabel}，完成筛选后打开第一个结果。`
            : `计划先进入${pageLabel}，完成筛选后停留在更合适的结果页。`),
      buildAssistantStep('locating', '正在定位相关页面', `准备进入${pageLabel}并定位相关结果。`),
      buildAssistantStep('acting', '正在操作页面', targetSource?.title
        ? `正在筛选并打开《${targetSource.title}》。`
        : openMode === 'last'
          ? '正在筛选并打开最后一个结果。'
          : openMode === 'first'
            ? '正在筛选并打开第一个结果。'
            : `正在筛选${targetText}。`),
    ),
    executionPlan: buildSameTabExecutionPlan({
      kind: mode === 'mixed_task' ? 'mixed_task' : 'site_task',
      prompt: promptParts.join(' '),
      bootstrapUrl: pageTarget,
      expectedUrl: targetSource && shouldOpenResult ? targetSource.publicUrl : pageTarget,
      pageId,
      filters: {
        searchQuery: searchQuery || '',
        topic: topic || '',
      },
      openTitle: finalOpenTitle,
      openMode: finalOpenMode,
      successMessage: targetSource && wantsSummary
        ? summarizeAssistantSource(targetSource)
        : targetSource
          ? `已帮你打开《${targetSource.title}》。`
          : `已帮你定位到${targetText}。`,
      route: buildRouteFromTargets(
        [
          {
            label: pageLabel,
            target: pageTarget,
            pageId,
            detail: `进入${pageLabel}`,
          },
          targetSource
            ? {
                label: targetSource.title,
                target: targetSource.publicUrl,
                pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
                detail: `打开《${targetSource.title}》`,
              }
            : null,
        ].filter(Boolean)
      ),
      completionRules: buildTaskRules([targetSource ? 'detail_opened' : 'detail_opened']),
      failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    }),
    fallbackPlan: {
      action: buildAssistantAction(
        targetSource ? 'open_detail' : 'open_list',
        targetSource ? '打开对应页面' : `前往${pageLabel}`,
        targetSource ? targetSource.publicUrl : pageTarget
      ),
    },
  });
}

function buildGuideTaskResponseV2(question) {
  const topic = detectAssistantTopic(question) || '组织';
  return buildAssistantResponseEnvelope({
    mode: 'site_task',
    goal: '带用户进入更适合上手的内容入口',
    entities: {
      contentTypes: ['insight'],
      topic,
    },
    message: '我先带你去看更适合上手的内容入口。',
    route: buildRouteFromTargets([{
      label: '文章中心',
      target: '/?page=article-center',
      pageId: 'article-center',
      detail: `进入文章中心并筛选「${topic}」`,
    }]),
    completionRules: buildTaskRules(['detail_opened']),
    failureRules: buildFailureRules('not_found_notice'),
    finalState: buildFinalState({
      pageId: 'article-center',
      url: '/?page=article-center',
      note: '已为你打开更适合上手的内容入口。',
    }),
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', '识别到你是第一次来，希望先看更适合上手的内容。'),
      buildAssistantStep('planning', '正在规划操作步骤', `计划先进入文章中心，再按「${topic}」整理更适合的入口。`),
      buildAssistantStep('locating', '正在定位相关页面', '准备进入文章中心。'),
      buildAssistantStep('acting', '正在操作页面', `正在切换到「${topic}」相关内容并整理入口。`),
    ),
    executionPlan: buildSameTabExecutionPlan({
      kind: 'site_task',
      prompt: [
        '你的任务是为第一次来访的用户打开更适合入门的内容入口。',
        '先使用 open_internal_url 打开 "/?page=article-center"。',
        `再优先使用站内筛选工具，将标签切换到“${topic}”。`,
        '如果页面中出现最上方的内容列表，说明任务完成，立即调用 done。',
      ].join(' '),
      bootstrapUrl: '/?page=article-center',
      expectedUrl: '/?page=article-center',
      pageId: 'article-center',
      filters: {
        topic,
      },
      successMessage: '已为你打开更适合上手的内容入口。',
      route: buildRouteFromTargets([{
        label: '文章中心',
        target: '/?page=article-center',
        pageId: 'article-center',
        detail: `进入文章中心并筛选「${topic}」`,
      }]),
      completionRules: buildTaskRules(['detail_opened']),
      failureRules: buildFailureRules('not_found_notice'),
    }),
    fallbackPlan: {
      action: buildAssistantAction('open_url', '前往文章中心', '/?page=article-center'),
    },
  });
}

function buildSiteTourResponse(question, sources = []) {
  const tourStops = buildTourStopsFromSiteMap(sources);
  const route = buildRouteFromTargets(
    tourStops.map((stop) => ({
      label: stop.label,
      target: stop.url,
      pageId: stop.pageId,
      detail: stop.isRepresentativeDetail
        ? `进入代表性详情页《${stop.label}》后返回${getYiyuTongSiteMapPage(stop.returnPageId)?.label || '上一级页面'}`
        : stop.isRepresentativeChild
        ? `进入${stop.label}看代表性内容后返回${getYiyuTongSiteMapPage(stop.returnPageId)?.label || '上一级页面'}`
        : `浏览${stop.label}`,
    }))
  );
  const tourPlan = tourStops.map((stop, index) => {
    const pageLabel = stop.label;
    const sectionText = Array.isArray(stop.sections) && stop.sections.length
      ? `浏览区块：${stop.sections
          .slice()
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          .map((section) => section.title)
          .join('、')}`
      : '浏览该页面主要内容';
    const childText = (stop.isRepresentativeChild || stop.isRepresentativeDetail) && stop.returnPageId
      ? `结束后返回${getYiyuTongSiteMapPage(stop.returnPageId)?.label || '上一级页面'}`
      : '';
    const transitText = stop.isTransitStop ? '这是过渡返回站点，到达后直接继续后续路线' : '';
    return `${index + 1}. ${pageLabel}：${sectionText}${childText ? `；${childText}` : ''}${transitText ? `；${transitText}` : ''}`;
  }).join('\n');

  return buildAssistantResponseEnvelope({
    mode: 'site_tour',
    goal: '带用户快速浏览整个网站',
    entities: {
      pageTarget: '/',
      query: safeText(question),
    },
    message: '我来带你快速逛一下整个网站。',
    userVisiblePlan: tourPlan,
    route,
    completionRules: buildTaskRules(['tour_completed']),
    failureRules: buildFailureRules('permission_notice', 'not_found_notice'),
    finalState: buildFinalState({
      pageId: safeText(YIYU_TONG_SITE_MAP?.tour?.finalPageId || 'about'),
      url: safeText(getYiyuTongSiteMapPage(YIYU_TONG_SITE_MAP?.tour?.finalPageId || 'about')?.url || '/?page=about'),
      note: '已按导览路线浏览完整个网站。',
    }),
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', '识别到你想快速浏览整个网站，看个整体概览。'),
      buildAssistantStep('planning', '正在规划操作步骤', tourPlan),
      buildAssistantStep('locating', '正在定位相关页面', '准备按官网公开结构顺序进入每个板块。'),
      buildAssistantStep('acting', '正在操作页面', '正在按区块连续缓慢滚动浏览，并在代表性二级页之间返回。'),
    ),
    executionPlan: buildSameTabExecutionPlan({
      kind: 'site_tour',
      prompt: [
        `请在益语官网当前标签页内完成这个导览请求：${question}`,
        '官网结构地图已经明确提供了导览站点和每个页面的区块顺序，你需要按路线依次浏览。',
        '同一页面内请优先使用 scroll_section 按区块连续缓慢浏览，不要直接滚半页、拉到底、回顶或反弹。',
        '如果当前站点是代表性二级页或详情页，并且带有 returnUrl，请浏览完成后回到 returnUrl 再继续路线。',
        '如果当前站点是过渡返回站点（isTransitStop=true 或标签以“返回”开头），确认已回到指定页面后可以直接切换下一站，不要再次完整浏览这一页。',
        `公开导览路线如下：\n${tourPlan}`,
        '完成导览后，用一句中文说明已经带用户看完主要板块。',
      ].join(' '),
      bootstrapUrl: '/',
      expectedUrl: safeText(getYiyuTongSiteMapPage(YIYU_TONG_SITE_MAP?.tour?.finalPageId || 'about')?.url || '/?page=about'),
      pageId: safeText(YIYU_TONG_SITE_MAP?.tour?.finalPageId || 'about'),
      successMessage: '已带你快速浏览完网站的主要板块。',
      tourStops,
      route,
      completionRules: buildTaskRules(['tour_completed']),
      failureRules: buildFailureRules('permission_notice', 'not_found_notice'),
    }),
  });
}

function resolveClauseToGraphTarget(clause, rankedSources, allSources) {
  const pageNavigation = resolvePageNavigation(clause);
  if (pageNavigation) {
    return {
      label: pageNavigation.label,
      target: pageNavigation.target,
      pageId: getAssistantPageIdFromTarget(pageNavigation.target),
      source: null,
    };
  }

  const directSource = findDirectNavigationSource(clause, rankedSources);
  if (directSource) {
    return {
      label: directSource.title,
      target: directSource.publicUrl,
      pageId: getAssistantPageIdFromTarget(directSource.publicUrl),
      source: directSource,
    };
  }

  const typedFilters = detectAssistantContentTypes(clause);
  if (typedFilters.length === 1 && /最新|最近/.test(clause)) {
    const latestSource = pickLatestRelevantSource(allSources, typedFilters[0], detectAssistantTopic(clause));
    if (latestSource) {
      return {
        label: latestSource.title,
        target: latestSource.publicUrl,
        pageId: getAssistantPageIdFromTarget(latestSource.publicUrl),
        source: latestSource,
      };
    }
  }

  return null;
}

function resolvePlannerRouteTarget(target, rankedSources, allSources) {
  const kind = safeText(target?.kind).toLowerCase();
  const sourceId = safeText(target?.sourceId);
  const pageId = safeText(target?.pageId);
  const note = safeText(target?.note);

  if (kind === 'source' && sourceId) {
    const source = rankedSources.find((item) => item.contentId === sourceId) || allSources.find((item) => item.contentId === sourceId);
    if (!source) return null;
    return {
      kind: 'source',
      label: source.title,
      target: source.publicUrl,
      pageId: getAssistantPageIdFromTarget(source.publicUrl),
      source,
      note,
    };
  }

  if (pageId) {
    const page = getYiyuTongSiteMapPage(pageId);
    if (!page?.url) return null;
    return {
      kind: 'page',
      label: page.label,
      target: page.url,
      pageId: page.id,
      source: null,
      note,
    };
  }

  return null;
}

function buildPlannerRouteTaskResponse({
  question,
  currentUrl,
  routeTargets,
  answerPageIds = [],
  mode = 'site_task',
  rankedSources = [],
  allSources = [],
}) {
  const targets = Array.isArray(routeTargets)
    ? routeTargets
        .map((item) => resolvePlannerRouteTarget(item, rankedSources, allSources))
        .filter(Boolean)
    : [];
  if (!targets.length) return null;

  const route = buildRouteFromTargets(targets);
  const answerSnippets = Array.isArray(answerPageIds)
    ? answerPageIds
        .map((pageId) => safeText(pageId))
        .filter(Boolean)
        .map((pageId) => ({
          pageId,
          text: buildPageAnswerTextById(pageId),
          citation: buildAssistantPageCard(pageId, buildPageAnswerTextById(pageId)),
        }))
        .filter((item) => item.text || item.citation)
    : [];
  const citations = answerSnippets.map((item) => item.citation).filter(Boolean);
  const answerText = answerSnippets.map((item) => item.text).filter(Boolean).join(' ');
  const normalizedCurrentUrl = normalizeAssistantTarget(currentUrl);
  const graphSteps = [];

  targets.forEach((target, index) => {
    const isFirstAndAlreadyThere = index === 0 && normalizedCurrentUrl && normalizedCurrentUrl === normalizeAssistantTarget(target.target);
    if (isFirstAndAlreadyThere) return;
    graphSteps.push(
      buildGraphStep(`route_open_${index + 1}`, 'open_url', {
        target: target.target,
        pageId: target.pageId,
        detail: `正在打开${target.label}。`,
      })
    );
  });

  const lastTarget = targets[targets.length - 1];
  const sequenceText = targets.map((target) => target.label).join(' -> ');
  const successMessage = answerText
    ? `已按顺序完成：${sequenceText}。${answerText}`.trim()
    : `已按顺序完成：${sequenceText}。`;
  const userVisiblePlan = buildUserVisiblePlanFromRoute(
    targets.map((target) => ({
      label: target.label,
      detail: target.note || `进入${target.label}`,
    })),
    answerText
  );

  if (!graphSteps.length) {
    return buildAssistantResponseEnvelope({
      mode: answerText ? 'mixed_task' : mode,
      goal: safeText(question) || `按顺序完成：${sequenceText}`,
      entities: {
        query: safeText(question),
      },
      message: answerText || `当前已经在${lastTarget.label}。`,
      userVisiblePlan,
      citations,
      route,
      completionRules: buildTaskRules(['detail_opened']),
      failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
      finalState: buildFinalState({
        pageId: lastTarget.pageId,
        url: lastTarget.target,
        note: successMessage,
      }),
    });
  }

  return buildSiteTaskGraphResponse({
    mode: answerText ? 'mixed_task' : mode,
    goal: safeText(question) || `按顺序完成：${sequenceText}`,
    prompt: [
      `请在益语官网当前标签页内按顺序完成这个请求：${question}`,
      `顺序目标如下：${sequenceText}。`,
      '如果已经在其中某一步的目标页，就从当前状态继续后面的步骤。',
      answerText ? '完成所有页面动作后，再给出任务要求的说明，并附上来源页面信息。' : '完成所有页面动作后立即结束。',
    ].join('\n'),
    entities: {
      query: safeText(question),
      targetTitle: lastTarget.source?.title || '',
      targetId: lastTarget.source?.contentId || '',
    },
    message: `我来按顺序帮你完成：${sequenceText}。`,
    userVisiblePlan,
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', '识别到你给了一个按顺序完成的任务。'),
      buildAssistantStep('planning', '正在规划操作步骤', `计划依次完成：${sequenceText}。`),
      buildAssistantStep('locating', '正在定位相关页面', '准备按顺序进入每个目标页面。'),
      buildAssistantStep('acting', '正在操作页面', `正在依次完成：${sequenceText}。`),
    ),
    citations,
    route,
    completionRules: buildTaskRules(['mixed_task_done']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    graphSteps,
    successMessage,
    expectedUrl: lastTarget.target,
    pageId: lastTarget.pageId,
    finalState: buildFinalState({
      pageId: lastTarget.pageId,
      url: lastTarget.target,
      note: successMessage,
    }),
    fallbackPlan: {
      action: buildAssistantAction('open_url', `前往${lastTarget.label}`, lastTarget.target),
    },
  });
}

function buildPlannerDrivenResponse({
  question,
  currentUrl,
  plannerMode,
  plannerRouteTargets,
  plannerAnswerPageIds,
  plannerPageTarget,
  plannerMatchedSource,
  rankedSources,
  allSources,
  hasMixedIntent,
}) {
  const routeTargets = Array.isArray(plannerRouteTargets) ? [...plannerRouteTargets] : [];
  if (!routeTargets.length) {
    if (plannerMatchedSource?.contentId) {
      routeTargets.push({
        kind: 'source',
        sourceId: plannerMatchedSource.contentId,
        note: `进入《${plannerMatchedSource.title}》详情页`,
      });
    } else if (plannerPageTarget?.pageId) {
      routeTargets.push({
        kind: 'page',
        pageId: plannerPageTarget.pageId,
        note: `进入${plannerPageTarget.label}`,
      });
    }
  }
  if (!routeTargets.length) return null;
  return buildPlannerRouteTaskResponse({
    question,
    currentUrl,
    routeTargets,
    answerPageIds: plannerAnswerPageIds,
    mode: plannerMode === 'mixed_task' || hasMixedIntent ? 'mixed_task' : 'site_task',
    rankedSources,
    allSources,
  });
}

function buildSequentialSiteTaskResponse(question, currentUrl, rankedSources, allSources) {
  const clauses = splitSequentialClauses(question);
  if (clauses.length < 2) return null;

  const targets = clauses
    .map((clause) => resolveClauseToGraphTarget(clause, rankedSources, allSources))
    .filter(Boolean);

  if (targets.length < 2 || targets.length !== clauses.length) return null;

  const graphSteps = [];
  targets.forEach((target, index) => {
    const normalizedCurrentUrl = normalizeAssistantTarget(currentUrl);
    const isFirstAndAlreadyThere = index === 0 && normalizedCurrentUrl && normalizedCurrentUrl === normalizeAssistantTarget(target.target);
    if (isFirstAndAlreadyThere) {
      return;
    }
    graphSteps.push(
      buildGraphStep(`open_${index + 1}`, 'open_url', {
        target: target.target,
        pageId: target.pageId,
        detail: `正在打开${target.label}。`,
      })
    );
  });

  if (!graphSteps.length) {
    return buildCurrentPageResponse('当前已经在这条连续任务的第一个目标页面。');
  }

  const lastTarget = targets[targets.length - 1];
  const message = `我先${targets.map((target) => `带你看${target.label}`).join('，再')}。`;

  return buildSiteTaskGraphResponse({
    goal: '按顺序完成多个站内查看目标',
    prompt: [
      `请在益语官网当前标签页内按顺序完成这个请求：${question}`,
      `你需要依次完成：${targets.map((target, index) => `${index + 1}.${target.label}`).join(' -> ')}。`,
      '每一步完成后继续下一步，不要提前结束，也不要忽略前面的目标。',
      '如果已经在某一步的目标页，就从当前状态继续往后完成。',
      `最终停留在${lastTarget.label}页面，并在结束时用一句中文说明已按顺序完成任务。`,
    ].join('\n'),
    entities: {
      targetTitle: lastTarget.source?.title || '',
      targetId: lastTarget.source?.contentId || '',
      query: safeText(question),
    },
    message,
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', '识别到你给了一个按顺序完成的连续任务。'),
      buildAssistantStep('planning', '正在规划操作步骤', `计划依次完成：${targets.map((target) => target.label).join(' -> ')}。`),
      buildAssistantStep('locating', '正在定位相关页面', '准备按顺序进入每个目标页面。'),
      buildAssistantStep('acting', '正在操作页面', `正在依次完成：${targets.map((target) => target.label).join(' -> ')}。`),
    ),
    citations: [],
    route: buildRouteFromTargets(targets),
    completionRules: buildTaskRules(['detail_opened']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    graphSteps,
    successMessage: `已按顺序完成：${targets.map((target) => target.label).join(' -> ')}。`,
    expectedUrl: lastTarget.target,
    pageId: lastTarget.pageId,
    finalState: buildFinalState({
      pageId: lastTarget.pageId,
      url: lastTarget.target,
      note: `已按顺序完成：${targets.map((target) => target.label).join(' -> ')}。`,
    }),
    fallbackPlan: {
      action: buildAssistantAction('open_url', `前往${lastTarget.label}`, lastTarget.target),
    },
  });
}

function buildCommentSiteTaskResponse({ question, currentUrl, targetSource, commentText, wantsSummary = false }) {
  if (!targetSource || !commentText) return null;

  const graphSteps = [];
  const normalizedCurrentUrl = normalizeAssistantTarget(currentUrl);
  const normalizedTarget = normalizeAssistantTarget(targetSource.publicUrl);
  const commentSectionId = ({
    insight: 'article-detail-comments',
    report: 'report-detail-comments',
    book: 'book-detail-comments',
    methodology: 'detail-comments',
  })[safeText(targetSource.contentType)] || 'detail-comments';

  if (!normalizedCurrentUrl || normalizedCurrentUrl !== normalizedTarget) {
    graphSteps.push(
      buildGraphStep('open_target', 'open_url', {
        target: targetSource.publicUrl,
        pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
        detail: `正在打开《${targetSource.title}》。`,
      })
    );
  }

  graphSteps.push(
    buildGraphStep('scroll_comment_section', 'scroll_section', {
      sectionId: commentSectionId,
      passes: 1,
      detail: '正在滚动到评论区，让用户能看到评论输入框。',
    }),
    buildGraphStep('fill_comment', 'fill_comment', {
      text: commentText,
      detail: `正在写入评论：${commentText}`,
    }),
    buildGraphStep('submit_comment', 'submit_comment', {
      detail: '正在提交评论。',
    })
  );

  const successMessage = wantsSummary
    ? `已为你在《${targetSource.title}》提交评论。${summarizeAssistantSource(targetSource).replace(/^已为你打开《.*?》。/, '')}`
    : `已为你在《${targetSource.title}》提交评论。`;

  return buildSiteTaskGraphResponse({
    goal: `打开《${targetSource.title}》并发表评论`,
    prompt: [
      `请在益语官网当前标签页内完成这个请求：${question}`,
      `目标内容是《${targetSource.title}》：${targetSource.publicUrl}`,
      '如果当前不在这条内容详情页，就先进入该详情页。',
      `然后滚动到评论区（区块 ${commentSectionId}），让用户能看到评论输入框。`,
      `在评论输入框里写入这条评论：${commentText}`,
      '最后点击发表评论按钮。只要评论进入“待管理员审核后显示”的提交成功状态，就立刻调用 done，不要再做任何额外无关操作。',
      wantsSummary
        ? '提交完成后，停留在当前内容页面，并用一句中文简要总结这篇内容的主要内容。'
        : '提交完成后，停留在当前内容页面，并用一句中文说明评论已提交。',
    ].join('\n'),
    entities: {
      contentTypes: [targetSource.contentType],
      targetId: targetSource.contentId,
      targetTitle: targetSource.title,
      query: safeText(question),
      wantsSummary,
    },
    message: `我来帮你打开《${targetSource.title}》，写好评论并提交。`,
    steps: buildAssistantSteps(
      buildAssistantStep('understanding', '正在理解你的目标', `识别到你想在《${targetSource.title}》页面完成评论提交。`),
      buildAssistantStep('planning', '正在规划操作步骤', `计划先打开《${targetSource.title}》，再写入评论并提交。`),
      buildAssistantStep('locating', '正在定位相关页面', `准备进入《${targetSource.title}》详情页。`),
      buildAssistantStep('acting', '正在操作页面', '正在写入评论并提交。'),
    ),
    citations: wantsSummary ? [mapAssistantSourceCard(targetSource)] : [],
    route: buildRouteFromTargets([
      {
        label: targetSource.title,
        target: targetSource.publicUrl,
        pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
        detail: `进入《${targetSource.title}》详情页`,
      },
      {
        label: '评论区',
        target: targetSource.publicUrl,
        pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
        detail: '滚动到评论区，写入评论并提交',
      },
    ]),
    completionRules: buildTaskRules(['comment_submission']),
    failureRules: buildFailureRules('not_found_notice', 'permission_notice'),
    graphSteps,
    successMessage,
    expectedUrl: targetSource.publicUrl,
    pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
    finalState: buildFinalState({
      pageId: getAssistantPageIdFromTarget(targetSource.publicUrl),
      url: targetSource.publicUrl,
      note: successMessage,
    }),
    completionCheck: {
      type: 'comment_submission',
      contentId: targetSource.contentId,
      contentType: targetSource.contentType,
      expectedText: commentText,
    },
    fallbackPlan: {
      action: buildAssistantAction('open_detail', '打开对应页面', targetSource.publicUrl),
    },
  });
}

function buildAnswerResponse(question, sources) {
  return buildAssistantResponseEnvelope({
    mode: 'answer',
    goal: '回答用户关于官网内容的问题',
    entities: {
      contentTypes: Array.from(new Set(sources.map((item) => item.contentType))),
      query: safeText(question),
    },
    message: '',
    citations: sources.map(mapAssistantSourceCard),
  });
}

async function planAssistantTaskWithArk(question, sources, currentUrl) {
  if (!isArkReady()) return null;
  const isTourPrompt = detectSiteTourIntent(question);
  const isConsultPrompt = detectConsultIntent(question);
  const hasContactPrompt = detectContactInfoIntent(question);
  const hasMembershipPrompt = detectMembershipInfoIntent(question);
  const preview = (isTourPrompt || isConsultPrompt || hasContactPrompt || hasMembershipPrompt ? [] : sources.slice(0, 6)).map((item) => ({
    id: item.contentId,
    type: item.contentType,
    title: item.title,
    clientName: item.clientName,
    tags: item.tags,
    url: item.publicUrl,
    publishDate: item.publishDate || item.updatedAt || item.createdAt || '',
  }));
  const summarizeSections = (page) =>
    Array.isArray(page?.sections)
      ? [...getYiyuTongSharedSections(), ...page.sections]
          .filter((section) => section.tour)
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          .map((section) => ({
            id: section.id,
            title: section.title,
            order: Number(section.order || 0),
            enterable: Boolean(section.enterable),
          }))
      : [];
  const summarizePage = (pageId) => {
    const page = getYiyuTongSiteMapPage(pageId);
    if (!page) return null;
    return {
      id: page.id,
      label: page.label,
      url: page.url || '',
      level: page.level,
      group: page.group,
      parentId: page.parentId || '',
      representativeChildren: Array.isArray(page.representativeChildren) ? page.representativeChildren : [],
      representativeDetailPageId: safeText(page.representativeDetail?.pageId || ''),
      tourRepresentativeDetail: page.tourRepresentativeDetail === true,
      sections: summarizeSections(page),
    };
  };
  const fullSiteMapSummary = {
    publicTourOrder: Array.isArray(YIYU_TONG_SITE_MAP?.tour?.publicOrder)
      ? YIYU_TONG_SITE_MAP.tour.publicOrder
      : [],
    finalTourPageId: safeText(YIYU_TONG_SITE_MAP?.tour?.finalPageId || 'about'),
    primaryPages: (YIYU_TONG_SITE_MAP?.tour?.publicOrder || [])
      .map((pageId) => summarizePage(pageId))
      .filter(Boolean),
    secondaryPages: Object.values(YIYU_TONG_SITE_MAP?.pages || {})
      .filter((page) => page.level === 'secondary')
      .map((page) => summarizePage(page.id))
      .filter(Boolean),
    detailPages: Object.values(YIYU_TONG_SITE_MAP?.pages || {})
      .filter((page) => page.level === 'detail')
      .map((page) => ({
        id: page.id,
        label: page.label,
        group: page.group,
        parentId: page.parentId || '',
        urlPattern: page.urlPattern || page.url || '',
        sections: summarizeSections(page),
        })),
    sharedSections: getYiyuTongSharedSections().map((section) => ({
      id: section.id,
      title: section.title,
      type: section.type,
      order: Number(section.order || 0),
      enterable: Boolean(section.enterable),
    })),
    utilityPages: ['user-center', 'membership', 'consult-apply', 'login', 'register', 'forgot-password', 'reset-password', 'payment-checkout', 'payment-result']
      .map((pageId) => getYiyuTongSiteMapPage(pageId))
      .filter(Boolean)
      .map((page) => ({
        id: page.id,
        label: page.label,
        url: page.url || '',
        group: page.group,
        level: page.level,
      })),
    answerPages: ['about', 'membership']
      .map((pageId) => getYiyuTongSiteMapPage(pageId))
      .filter(Boolean)
      .map((page) => ({
        id: page.id,
        label: page.label,
        url: page.url || '',
        answerContext: page.answerContext || null,
      })),
    tourRoute: detectSiteTourIntent(question)
      ? buildTourStopsFromSiteMap(sources).map((stop) => ({
          id: stop.id,
          label: stop.label,
          url: stop.url,
          pageId: stop.pageId || '',
          returnPageId: stop.returnPageId || '',
          isRepresentativeChild: Boolean(stop.isRepresentativeChild),
          isRepresentativeDetail: Boolean(stop.isRepresentativeDetail),
          sections: Array.isArray(stop.sections)
            ? stop.sections
                .slice()
                .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                .map((section) => ({
                  id: section.id,
                  title: section.title,
                  order: Number(section.order || 0),
                  enterable: Boolean(section.enterable),
                }))
            : [],
        }))
      : [],
    rules: {
      representativeDetailSelection: YIYU_TONG_SITE_MAP?.rules?.representativeDetailSelection || 'latest_published',
      returnAfterRepresentativeVisit: Boolean(YIYU_TONG_SITE_MAP?.rules?.returnAfterRepresentativeVisit),
      stopOnPermissionDenied: Boolean(YIYU_TONG_SITE_MAP?.rules?.stopOnPermissionDenied),
      stopOnMissingTarget: Boolean(YIYU_TONG_SITE_MAP?.rules?.stopOnMissingTarget),
      detailPagesAreNotSecondary: true,
      publicTourExcludesUserCenter: true,
    },
  };
  const siteMapSummary = isTourPrompt
    ? {
        publicTourOrder: fullSiteMapSummary.publicTourOrder,
        finalTourPageId: fullSiteMapSummary.finalTourPageId,
        primaryPages: fullSiteMapSummary.primaryPages,
        secondaryPages: fullSiteMapSummary.secondaryPages,
        detailPages: fullSiteMapSummary.detailPages,
        tourRoute: fullSiteMapSummary.tourRoute,
        rules: fullSiteMapSummary.rules,
      }
    : (hasContactPrompt || hasMembershipPrompt)
      ? {
          primaryPages: fullSiteMapSummary.primaryPages.map((page) => ({
            id: page.id,
            label: page.label,
            url: page.url,
            level: page.level,
            group: page.group,
          })),
          utilityPages: fullSiteMapSummary.utilityPages,
          answerPages: fullSiteMapSummary.answerPages,
          rules: fullSiteMapSummary.rules,
        }
      : {
          primaryPages: fullSiteMapSummary.primaryPages,
          secondaryPages: fullSiteMapSummary.secondaryPages,
          detailPages: fullSiteMapSummary.detailPages,
          answerPages: fullSiteMapSummary.answerPages,
          rules: fullSiteMapSummary.rules,
        };

  try {
    const content = await callArkChat([
      {
        role: 'system',
        content: [
          '你是益语通的前台任务编排器。',
          '你的目标不是先回答，而是先结合官网前台结构地图，把用户的模糊指令转成一个尽量清晰的任务图、回答方案或混合方案。',
          '你最了解益语官网结构：一级页面、二级列表页、详情页、功能页、共享顶部栏/底部栏、代表性子页和可导览区块都已提供在站点地图里。',
          '请先判断这是纯回答、纯操作，还是回答+操作混合任务。',
          '如果用户明显想找、跳、筛、开、看、比较、浏览网站，请优先返回 site_task、site_tour 或 mixed_task。',
          '如果用户要咨询、预约、合作、报名，请返回 form_task。',
          '只有真正无需页面操作时，才返回 answer；如果用户既要先定位官网里的某个页面或区域，又要你说明该页相关信息，请返回 mixed_task。',
          '多目标任务默认按顺序全部完成。',
          '模糊导航优先落到最合适的列表页并筛选，而不是直接放弃执行。',
          '站内导览时，应优先使用官网地图里定义的一级页面、代表性二级页和区块顺序。',
          '详情页不是二级页面；只有站点地图明确允许时，才把详情页作为代表性进入页。公开导览默认不进入个人中心等功能页。',
          '用户最不了解官网，你最了解官网；因此要主动把模糊指令翻译成清晰路线，不要要求用户先学会网站结构。',
          '路线里要写清楚去哪些页面、先后顺序、哪些只是定位区域、哪些页面默认进入后返回、什么算完成。',
          '如果用户要混合任务，你可以同时指定页面定位目标和说明需求；最终说明会在任务结束后附出处。',
          'routeHints 只保留最关键的 1 到 4 条，不要长篇复述官网地图。',
          '如果这是多目标或混合任务，可以在 routeTargets 中按顺序列出目标；单目标时 routeTargets 可为空。',
          '只返回 JSON，格式为 {"mode":"answer|site_task|site_tour|form_task|mixed_task","goal":"","contentType":"","targetSourceId":"","targetPage":"","topic":"","openMode":"none|exact|first|last","wantsSummary":false,"query":"","notes":"","routeHints":[""],"routeTargets":[{"kind":"page|source","pageId":"","sourceId":"","note":""}],"answerPageIds":[""],"finalPageId":"","finalUrl":""}。',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          currentUrl,
          siteMap: siteMapSummary,
          candidateSources: preview,
        }),
      },
    ], {
      maxTokens: 220,
      temperature: 0.1,
      reasoningEffort: 'low',
    });
    return extractJsonObject(content);
  } catch {
    return null;
  }
}

function pickLatestSourceByType(sources, type) {
  return sources
    .filter((item) => item.contentType === type)
    .sort((a, b) => {
      const aTime = Date.parse(a.publishDate || a.updatedAt || a.createdAt || '') || 0;
      const bTime = Date.parse(b.publishDate || b.updatedAt || b.createdAt || '') || 0;
      return bTime - aTime;
    })[0];
}

function pickRelevantSources(question, sources) {
  const tokens = extractAssistantTokens(question);
  const typedFilters = detectAssistantContentTypes(question);
  const latest = /最新|最近/.test(question);

  if (latest && typedFilters.length === 1) {
    const found = pickLatestSourceByType(sources, typedFilters[0]);
    return found ? [found] : [];
  }

  return sources
    .map((item) => ({
      item,
      score: scoreAssistantSource(item, question, tokens, typedFilters),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function mergeCollectedFields(...items) {
  const merged = {};
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    for (const [key, value] of Object.entries(item)) {
      const normalized = safeText(value);
      if (normalized) {
        merged[key] = normalized;
      }
    }
  }
  return merged;
}

async function extractConsultFields(question, knownUserInfo, history = [], existingFields = {}) {
  const historyText = Array.isArray(history)
    ? history
        .filter((item) => item && item.role === 'user')
        .map((item) => safeText(item.content))
        .filter(Boolean)
        .join('\n')
    : '';
  const fallback = mergeCollectedFields({
    name: safeText(knownUserInfo?.nickname || ''),
    organization: safeText(knownUserInfo?.organization || ''),
    role: safeText(knownUserInfo?.role || ''),
    phone: safeText(knownUserInfo?.phone || ''),
    email: safeText(knownUserInfo?.email || ''),
    topic: safeText(existingFields?.topic || question || historyText),
    notes: safeText(existingFields?.notes || ''),
  }, existingFields);

  if (!isArkReady()) {
    return fallback;
  }

  try {
    const content = await callArkChat([
      {
        role: 'system',
        content: [
          '你是一个表单字段提取助手。',
          '请根据用户输入和已有资料，提取组织诊断申请所需字段。',
          '如果字段不确定就返回空字符串。',
          '核心问题、已有尝试、阻力/约束、可投入资源都应尽量保留用户原意。',
          '只返回 JSON，格式为 {"name":"","organization":"","role":"","phone":"","email":"","topic":"","background":"","constraints":"","commitment":"","notes":""}。',
        ].join(''),
      },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          historyText,
          knownUserInfo: fallback,
        }),
      },
    ], {
      maxTokens: 180,
      temperature: 0.1,
      reasoningEffort: 'low',
    });
    const parsed = extractJsonObject(content);
    return mergeCollectedFields(fallback, {
      name: safeText(parsed.name, fallback.name),
      organization: safeText(parsed.organization, fallback.organization),
      role: safeText(parsed.role, fallback.role),
      phone: safeText(parsed.phone, fallback.phone),
      email: safeText(parsed.email, fallback.email),
      topic: safeText(parsed.topic, fallback.topic),
      background: safeText(parsed.background, fallback.background),
      constraints: safeText(parsed.constraints, fallback.constraints),
      commitment: safeText(parsed.commitment, fallback.commitment),
      notes: safeText(parsed.notes, fallback.notes),
    });
  } catch {
    return fallback;
  }
}

async function buildAssistantResponse(payload) {
  const question = safeText(payload?.question);
  const knownUserInfo = payload?.knownUserInfo && typeof payload.knownUserInfo === 'object' ? payload.knownUserInfo : {};
  const history = Array.isArray(payload?.history) ? payload.history : [];
  const activeFormContext = payload?.activeFormContext && typeof payload.activeFormContext === 'object'
    ? payload.activeFormContext
    : null;
  const currentUrl = normalizeAssistantTarget(payload?.currentUrl || '');
  if (!question) {
    return buildAssistantResponseEnvelope({
      mode: 'answer',
      goal: '等待用户发起任务',
      message: '你可以直接让我找内容、带你逛网站，或帮你打开并填写咨询表单。',
      citations: [],
    });
  }

  const sources = await listAssistantSources();
  const rankedSources = pickRelevantSources(question, sources);
  const topSources = rankedSources.slice(0, YIYU_TONG_SOURCE_LIMIT);
  const plannerOutput = await planAssistantTaskWithArk(question, rankedSources, currentUrl);
  const pageNavigation = resolvePageNavigation(question);
  const directSource = findDirectNavigationSource(question, rankedSources);
  const topic = detectAssistantTopic(question);
  const typedFilters = detectAssistantContentTypes(question);
  const wantsLatest = /最新|最近/.test(question);
  const wantsFirst = detectFirstIntent(question);
  const wantsLast = detectLastIntent(question);
  const wantsSummary = detectSummaryIntent(question);
  const hasActionIntent = detectActionIntent(question);
  const hasMixedIntent = detectMixedTaskIntent(question);
  const hasContactInfoIntent = detectContactInfoIntent(question);
  const hasMembershipInfoIntent = detectMembershipInfoIntent(question);
  const hasLocateCue = /(定位|那里|位置|在哪|哪里|哪儿|带我去|带我看|去看|去到|进入|打开|找到)/.test(safeText(question));
  const plannerMode = safeText(plannerOutput?.mode);
  const plannerType = safeText(plannerOutput?.contentType);
  const plannerTargetPage = safeText(plannerOutput?.targetPage);
  const plannerTopic = safeText(plannerOutput?.topic);
  const plannerOpenMode = safeText(plannerOutput?.openMode);
  const plannerWantsSummary = Boolean(plannerOutput?.wantsSummary);
  const plannerQuery = safeText(plannerOutput?.query);
  const plannerSourceId = safeText(plannerOutput?.targetSourceId);
  const plannerGoal = safeText(plannerOutput?.goal);
  const plannerRouteHints = Array.isArray(plannerOutput?.routeHints)
    ? plannerOutput.routeHints.map((item) => safeText(item)).filter(Boolean)
    : [];
  const plannerRouteTargets = Array.isArray(plannerOutput?.routeTargets)
    ? plannerOutput.routeTargets
        .map((item) => ({
          kind: safeText(item?.kind),
          pageId: safeText(item?.pageId),
          sourceId: safeText(item?.sourceId),
          note: safeText(item?.note),
        }))
        .filter((item) => item.kind && (item.pageId || item.sourceId))
    : [];
  const plannerAnswerPageIds = Array.isArray(plannerOutput?.answerPageIds)
    ? plannerOutput.answerPageIds.map((item) => safeText(item)).filter(Boolean)
    : [];
  const plannerFinalPageId = safeText(plannerOutput?.finalPageId);
  const plannerFinalUrl = safeText(plannerOutput?.finalUrl);
  const plannerPageTarget = resolvePlannerPageTarget(plannerTargetPage);
  const plannerMatchedSource = plannerSourceId
    ? rankedSources.find((item) => item.contentId === plannerSourceId) || sources.find((item) => item.contentId === plannerSourceId)
    : null;
  const quotedSource = findQuotedTitleSource(question, sources);
  const currentPageSource = sources.find((item) => normalizeAssistantTarget(item.publicUrl) === currentUrl) || null;

  if (shouldContinueActiveFormTask(question, activeFormContext) || detectConsultIntent(question) || plannerMode === 'form_task') {
    const collectedFields = await extractConsultFields(
      question,
      knownUserInfo,
      history,
      activeFormContext?.fields || {}
    );
    const missingFields = getAssistantMissingFields(collectedFields);
    const canSubmit = missingFields.length === 0;
    const graphSteps = [
      buildGraphStep('open_consult_apply', 'open_url', {
        target: YIYU_TONG_FORM_URL,
        pageId: 'consult-apply',
        detail: '进入组织诊断申请表。',
      }),
      buildGraphStep('fill_consult_apply', 'fill_local_form_fields', {
        fields: collectedFields,
        detail: '把你刚才提供的信息写进表单。',
      }),
      ...(canSubmit
        ? [
            buildGraphStep('submit_consult_apply', 'submit_local_form', {
              detail: '提交组织诊断申请。',
            }),
          ]
        : []),
    ];

    return buildSiteTaskGraphResponse({
      mode: 'form_task',
      goal: plannerGoal || '帮用户填写并提交组织诊断申请',
      prompt: [
        `请在益语官网当前标签页内完成这个请求：${question}`,
        '目标是打开组织诊断申请表，并把用户已经提供的字段写进去。',
        canSubmit
          ? '当前所需字段已经足够，请在填写完成后直接点击提交。'
          : `当前仍缺少这些字段：${missingFields.join('、')}。请先填写已知字段，不要盲填缺失字段。`,
        '如果页面出现“咨询申请已提交，我们会尽快与您联系”或等价成功提示，就立刻 done。',
      ].join('\n'),
      entities: {
        query: safeText(question),
      },
      message: canSubmit
        ? '我来直接帮你填写并提交组织诊断申请。'
        : `我先帮你把已知信息写进申请表，还缺：${missingFields.join('、')}。你继续直接告诉我，我会继续补填。`,
      steps: buildAssistantSteps(
        buildAssistantStep('understanding', '理解申请内容', '识别到你想发起组织诊断申请。'),
        buildAssistantStep('planning', '规划填写路径', canSubmit ? '准备打开申请表、填写字段并直接提交。' : `准备打开申请表并先写入已知字段，稍后继续补齐：${missingFields.join('、')}。`),
        buildAssistantStep('locating', '定位申请表', '准备进入站内组织诊断申请表。'),
        buildAssistantStep('acting', '填写申请信息', canSubmit ? '正在写入字段并提交申请。' : '正在把你已提供的信息写入申请表。'),
      ),
      route: buildRouteFromTargets([
        {
          label: '组织诊断申请表',
          target: YIYU_TONG_FORM_URL,
          pageId: 'consult-apply',
          detail: canSubmit ? '打开站内申请表，填写并提交' : '打开站内申请表并持续补填字段',
        },
      ]),
      completionRules: buildTaskRules([canSubmit ? 'form_submitted' : 'detail_opened']),
      failureRules: buildFailureRules('not_found_notice'),
      graphSteps,
      successMessage: canSubmit
        ? '组织诊断申请已提交，我们会尽快与您联系。'
        : `已写入当前已知字段，还缺：${missingFields.join('、')}。`,
      completionCheck: canSubmit
        ? {
            type: 'local_form_submission',
            statusText: '咨询申请已提交，我们会尽快与您联系',
          }
        : null,
      expectedUrl: YIYU_TONG_FORM_URL,
      pageId: 'consult-apply',
      finalState: buildFinalState({
        pageId: 'consult-apply',
        url: YIYU_TONG_FORM_URL,
        note: canSubmit
          ? '组织诊断申请已提交，我们会尽快与您联系。'
          : `已打开站内申请表并写入已知字段，还缺：${missingFields.join('、')}。`,
      }),
      fallbackPlan: {
        action: buildAssistantAction('open_consult_form', '打开组织诊断申请表', YIYU_TONG_FORM_URL, collectedFields),
      },
      formContext: {
        active: true,
        formUrl: YIYU_TONG_FORM_URL,
        fields: collectedFields,
        missingFields,
        extensionRequired: false,
      },
    });
  }

  if (detectSiteTourIntent(question) || plannerMode === 'site_tour') {
    return buildSiteTourResponse(question, sources);
  }

  if (hasContactInfoIntent && hasMembershipInfoIntent) {
    if (hasActionIntent || hasLocateCue || plannerMode === 'mixed_task' || plannerTargetPage === 'about' || plannerTargetPage === 'membership') {
      return buildContactMembershipMixedTaskResponse({ currentUrl, question });
    }
    const contactText = buildContactAnswerText();
    const membershipText = buildMembershipAnswerText();
    return buildAssistantResponseEnvelope({
      mode: 'answer',
      goal: '说明联系方式以及会员开通、收费与权益',
      entities: {
        pageTarget: '/?page=about',
        query: safeText(question),
      },
      message: `${contactText} ${membershipText}`.trim(),
      citations: [
        buildAssistantPageCard('about', contactText),
        buildAssistantPageCard('membership', membershipText),
      ].filter(Boolean),
      finalState: buildFinalState({
        pageId: 'about',
        url: '/?page=about',
        note: '已根据官网页面说明联系方式与会员信息。',
      }),
    });
  }

  if ((plannerMode === 'site_task' || plannerMode === 'mixed_task') && plannerRouteTargets.length) {
    const plannerRouteResponse = buildPlannerDrivenResponse({
      question,
      currentUrl,
      plannerMode,
      plannerRouteTargets,
      plannerAnswerPageIds,
      plannerPageTarget,
      plannerMatchedSource,
      rankedSources,
      allSources: sources,
      hasMixedIntent,
    });
    if (plannerRouteResponse) {
      return plannerRouteResponse;
    }
  }

  const sequentialTaskResponse = buildSequentialSiteTaskResponse(question, currentUrl, rankedSources, sources);
  if (sequentialTaskResponse) {
    return sequentialTaskResponse;
  }

  const commentTargetSource = plannerMatchedSource || directSource || quotedSource || currentPageSource;
  const commentText = extractCommentText(question);
  if (detectCommentIntent(question) && detectSubmitIntent(question) && commentTargetSource) {
    const commentTaskResponse = buildCommentSiteTaskResponse({
      question,
      currentUrl,
      targetSource: commentTargetSource,
      commentText,
      wantsSummary: wantsSummary || plannerWantsSummary,
    });
    if (commentTaskResponse) {
      return commentTaskResponse;
    }
  }

  if (hasContactInfoIntent) {
    const contactText = buildContactAnswerText();
    if (hasActionIntent || hasLocateCue || plannerTargetPage === 'about') {
      return buildPageSectionTaskResponse({
        currentUrl,
        pageId: 'about',
        sectionId: safeText(getYiyuTongSiteMapPage('about')?.answerContext?.contact?.sectionId || 'about-contact'),
        goal: '定位益语智库联系方式',
        message: '我先带你定位到联系方式区域。',
        successMessage: contactText,
        mode: hasMixedIntent ? 'mixed_task' : 'site_task',
        citations: [buildAssistantPageCard('about', contactText)].filter(Boolean),
      });
    }
    return buildPageAnswerResponse({
      pageId: 'about',
      goal: '回答益语智库联系方式',
      message: contactText,
      snippet: contactText,
    });
  }

  if (hasMembershipInfoIntent) {
    const membershipText = buildMembershipAnswerText();
    if ((hasActionIntent || hasLocateCue || plannerTargetPage === 'membership') && !detectConsultIntent(question)) {
      return buildPageSectionTaskResponse({
        currentUrl,
        pageId: 'membership',
        sectionId: 'membership-plans',
        goal: '定位会员开通与套餐信息',
        message: '我先带你到会员介绍页，再说明开通方式、收费和权益。',
        successMessage: membershipText,
        mode: 'mixed_task',
        citations: [buildAssistantPageCard('membership', membershipText)].filter(Boolean),
      });
    }
    return buildPageAnswerResponse({
      pageId: 'membership',
      goal: '回答会员开通、收费与权益',
      message: membershipText,
      snippet: membershipText,
    });
  }

  if ((plannerMode === 'site_task' || plannerMode === 'mixed_task') && plannerPageTarget) {
    return buildPageTargetTaskResponse({
      label: plannerPageTarget.label,
      target: plannerPageTarget.target,
      currentUrl,
      goal: plannerGoal || `进入${plannerPageTarget.label}`,
      mode: plannerMode === 'mixed_task' || hasMixedIntent ? 'mixed_task' : 'site_task',
    });
  }

  if ((plannerMode === 'site_task' || plannerMode === 'mixed_task') && plannerMatchedSource) {
    return buildDirectSourceTaskResponseV2(
      plannerMatchedSource,
      currentUrl,
      wantsSummary || plannerWantsSummary,
      plannerMode === 'mixed_task' ? 'mixed_task' : 'site_task'
    );
  }

  if (pageNavigation && (hasActionIntent || plannerMode === 'site_task' || plannerMode === 'mixed_task' || !detectContentQuestionIntent(question))) {
    return buildPageTargetTaskResponse({
      label: pageNavigation.label,
      target: pageNavigation.target,
      currentUrl,
      goal: plannerGoal || `进入${pageNavigation.label}`,
      mode: plannerMode === 'mixed_task' || hasMixedIntent ? 'mixed_task' : 'site_task',
      citations: hasMixedIntent ? topSources.slice(0, 3).map(mapAssistantSourceCard) : [],
    });
  }

  if (directSource && (hasActionIntent || /在哪|哪里|哪儿|案例|看看|看一下/.test(safeText(question)) || plannerMode === 'site_task' || plannerMode === 'mixed_task')) {
    return buildDirectSourceTaskResponseV2(
      directSource,
      currentUrl,
      wantsSummary || plannerWantsSummary,
      plannerMode === 'mixed_task' || hasMixedIntent ? 'mixed_task' : 'site_task'
    );
  }

  if (detectGuideIntent(question)) {
    return buildGuideTaskResponseV2(question);
  }

  const normalizedType = ['insight', 'report', 'book', 'methodology', 'case'].includes(plannerType)
    ? plannerType
    : typedFilters[0] || '';
  const relevantByType = normalizedType
    ? listRelevantSourcesByType(rankedSources, normalizedType, plannerTopic || topic)
    : [];
  const latestSource = normalizedType
    ? relevantByType[0] || rankedSources.find((item) => item.contentType === normalizedType) || pickLatestRelevantSource(sources, normalizedType, plannerTopic || topic)
    : null;
  const firstSource = relevantByType[0] || null;
  const lastSource = relevantByType[relevantByType.length - 1] || null;
  const resolvedOpenMode = plannerOpenMode || (wantsLast ? 'last' : wantsFirst ? 'first' : wantsLatest ? 'first' : 'none');
  const targetSource = plannerMatchedSource
    || (wantsLatest ? latestSource : null)
    || (resolvedOpenMode === 'last' ? lastSource : null)
    || (resolvedOpenMode === 'first' ? firstSource : null);

  if (normalizedType && (hasActionIntent || plannerMode === 'site_task' || plannerMode === 'mixed_task')) {
    const mapping = getAssistantPageConfigByType(normalizedType);
    if (mapping) {
      return buildFilterTaskResponseV2({
        question,
        contentType: normalizedType,
        pageLabel: mapping.label,
        pageTarget: mapping.target,
        pageId: mapping.pageId,
        topic: plannerTopic || topic,
        searchQuery: plannerQuery,
        targetSource,
        openMode: targetSource ? 'exact' : resolvedOpenMode,
        wantsSummary: wantsSummary || plannerWantsSummary,
        mode: plannerMode === 'mixed_task' || wantsSummary || plannerWantsSummary || hasMixedIntent ? 'mixed_task' : 'site_task',
      });
    }
  }

  const answer = await buildAssistantAnswer(question, topSources);
  const noEvidence = answer.includes('当前官网已发布内容中未找到相关信息');
  return buildAssistantResponseEnvelope({
    mode: 'answer',
    goal: plannerGoal || '回答用户关于官网内容的问题',
    entities: {
      contentTypes: Array.from(new Set(topSources.map((item) => item.contentType))),
      topic: plannerTopic || topic,
      query: plannerQuery || safeText(question),
      wantsSummary: false,
    },
    message: answer,
    route: plannerRouteHints.map((hint, index) => buildRouteNode({
      id: `hint_${index + 1}`,
      detail: hint,
      pageId: plannerFinalPageId,
      target: plannerFinalUrl,
    })),
    completionRules: [],
    failureRules: buildFailureRules(noEvidence ? 'not_found_notice' : null),
    finalState: buildFinalState({
      pageId: plannerFinalPageId,
      url: plannerFinalUrl,
      note: noEvidence ? '当前官网已发布内容中未找到相关信息' : '已给出基于官网前台内容的说明。',
    }),
    citations: noEvidence ? [] : topSources.map(mapAssistantSourceCard),
  });
}

function mapCaseShowcase(row) {
  return {
    id: row.id,
    slug: row.slug || toCaseShowcaseSlotSlug(row.sort_order, row.client_name || row.title || row.id),
    clientName: row.client_name || '',
    industry: row.industry || '',
    title: row.title || '',
    subtitle: row.subtitle || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    logoUrl: row.logo_url || '',
    pptFileUrl: row.ppt_file_url || '',
    pptFileName: row.ppt_file_name || '',
    slideImages: Array.isArray(row.slide_images) ? row.slide_images : [],
    isPublished: Boolean(row.is_published),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeCaseShowcasePayload(payload, fallbackRow = null) {
  const clientName = safeText(payload?.clientName, fallbackRow?.client_name || '未命名机构');
  const title = clientName;
  const sortOrder = toPositiveInt(payload?.sortOrder, Number(fallbackRow?.sort_order || 0));
  return {
    id: safeText(payload?.id, fallbackRow?.id || `case_${crypto.randomUUID()}`),
    slug: toCaseShowcaseSlotSlug(sortOrder, payload?.slug || fallbackRow?.slug || clientName),
    clientName,
    industry: '',
    title,
    subtitle: '',
    tags: [],
    logoUrl: safeText(payload?.logoUrl, fallbackRow?.logo_url || ''),
    pptFileUrl: safeText(payload?.pptFileUrl, fallbackRow?.ppt_file_url || ''),
    pptFileName: safeText(payload?.pptFileName, fallbackRow?.ppt_file_name || ''),
    slideImages: Array.isArray(payload?.slideImages)
      ? payload.slideImages.map((item) => safeText(item)).filter(Boolean)
      : Array.isArray(fallbackRow?.slide_images)
        ? fallbackRow.slide_images.map((item) => safeText(item)).filter(Boolean)
        : [],
    isPublished: normalizeBool(payload?.isPublished, fallbackRow?.is_published || false),
    sortOrder,
  };
}

async function syncCaseShowcaseSlotSlugs() {
  const duplicates = await pool.query(
    `SELECT sort_order
     FROM case_showcases
     WHERE is_active = true AND sort_order IS NOT NULL AND sort_order > 0
     GROUP BY sort_order
     HAVING COUNT(*) > 1`
  );
  if (duplicates.rows.length) {
    return;
  }
  await pool.query(
    `UPDATE case_showcases
     SET slug = 'case-' || sort_order::text,
         updated_at = now()
     WHERE is_active = true
       AND sort_order IS NOT NULL
       AND sort_order > 0
       AND slug IS DISTINCT FROM ('case-' || sort_order::text)`
  );
}

async function listCaseShowcases(scope = 'published') {
  const normalizedScope = normalizeCaseShowcaseScope(scope);
  const where = ['is_active = true'];
  if (normalizedScope !== 'admin') {
    where.push('is_published = true');
  }
  const q = await pool.query(
    `SELECT *
     FROM case_showcases
     WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC NULLS LAST, created_at ASC`
  );
  return q.rows.map(mapCaseShowcase);
}

async function findCaseShowcaseByIdOrSlug(db, value) {
  const q = await db.query(
    `SELECT *
     FROM case_showcases
     WHERE id=$1 OR slug=$1
     LIMIT 1`,
    [value]
  );
  return q.rows[0] || null;
}

async function upsertCaseShowcase(db, payload) {
  const existing = payload?.id ? await findCaseShowcaseByIdOrSlug(db, payload.id) : null;
  const normalized = sanitizeCaseShowcasePayload(payload, existing);
  await db.query(
    `INSERT INTO case_showcases(
       id, slug, client_name, industry, title, subtitle, tags, logo_url, ppt_file_url, ppt_file_name,
       slide_images, is_published, sort_order, is_active, created_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,COALESCE((SELECT created_at FROM case_showcases WHERE id=$1), now()),now())
     ON CONFLICT (id) DO UPDATE SET
       slug = EXCLUDED.slug,
       client_name = EXCLUDED.client_name,
       industry = EXCLUDED.industry,
       title = EXCLUDED.title,
       subtitle = EXCLUDED.subtitle,
       tags = EXCLUDED.tags,
       logo_url = EXCLUDED.logo_url,
       ppt_file_url = EXCLUDED.ppt_file_url,
       ppt_file_name = EXCLUDED.ppt_file_name,
       slide_images = EXCLUDED.slide_images,
       is_published = EXCLUDED.is_published,
       sort_order = EXCLUDED.sort_order,
       is_active = true,
       updated_at = now()`,
    [
      normalized.id,
      normalized.slug,
      normalized.clientName,
      normalized.industry,
      normalized.title,
      normalized.subtitle,
      normalized.tags,
      normalized.logoUrl || null,
      normalized.pptFileUrl || null,
      normalized.pptFileName || null,
      JSON.stringify(normalized.slideImages),
      normalized.isPublished,
      normalized.sortOrder,
    ]
  );
  return findCaseShowcaseByIdOrSlug(db, normalized.id);
}

async function deleteCaseShowcaseById(db, id) {
  const existing = await findCaseShowcaseByIdOrSlug(db, id);
  if (!existing) return false;
  await db.query(
    `UPDATE case_showcases
     SET is_active = false,
         updated_at = now()
     WHERE id = $1`,
    [existing.id]
  );
  return true;
}

async function seedDefaultCaseShowcases() {
  const q = await pool.query('SELECT count(*)::int AS c FROM case_showcases');
  if (Number(q.rows[0]?.c || 0) > 0) return;
  for (const item of DEFAULT_CASE_SHOWCASES) {
    await upsertCaseShowcase(pool, { ...item, isPublished: true });
  }
}

async function execWithFallback(binaries, args, options = {}) {
  let lastError = null;
  for (const binary of binaries) {
    try {
      return await execFileAsync(binary, args, options);
    } catch (error) {
      lastError = error;
      if (error?.code !== 'ENOENT') {
        break;
      }
    }
  }
  throw lastError || new Error('命令执行失败');
}

async function convertPresentationToSlides(presentationPath, presentationFilename) {
  const convertRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'yiyu-case-ppt-'));
  const pdfOutputDir = path.join(convertRoot, 'pdf');
  const slideOutputDir = path.join(convertRoot, 'slides');
  const libreofficeProfileDir = path.join(convertRoot, 'libreoffice-profile');
  await fs.mkdir(pdfOutputDir, { recursive: true });
  await fs.mkdir(slideOutputDir, { recursive: true });
  await fs.mkdir(libreofficeProfileDir, { recursive: true });

  try {
    await execWithFallback(
      ['soffice', 'libreoffice'],
      [
        `-env:UserInstallation=file://${libreofficeProfileDir}`,
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        pdfOutputDir,
        presentationPath,
      ],
      {
        timeout: 180000,
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          HOME: convertRoot,
          XDG_CACHE_HOME: path.join(convertRoot, '.cache'),
          XDG_CONFIG_HOME: path.join(convertRoot, '.config'),
          XDG_RUNTIME_DIR: convertRoot,
        },
      }
    );

    const sourceBase = path.basename(presentationFilename, path.extname(presentationFilename));
    const pdfPath = path.join(pdfOutputDir, `${sourceBase}.pdf`);
    const pdfStat = await fs.stat(pdfPath).catch(() => null);
    if (!pdfStat) {
      throw new Error('PPT 转 PDF 失败');
    }

    await execWithFallback(
      ['pdftoppm'],
      ['-png', '-r', '150', pdfPath, path.join(slideOutputDir, 'slide')],
      { timeout: 180000, maxBuffer: 20 * 1024 * 1024 }
    );

    const generatedFiles = (await fs.readdir(slideOutputDir))
      .filter((item) => item.startsWith('slide-') && item.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (generatedFiles.length === 0) {
      throw new Error('未生成 PPT 图片');
    }

    const publicDirName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sourceBase}`;
    const finalSlideDir = path.join(ADMIN_UPLOAD_ROOT, 'case-showcases', 'slides', publicDirName);
    await fs.mkdir(finalSlideDir, { recursive: true });

    const slideUrls = [];
    for (const file of generatedFiles) {
      const from = path.join(slideOutputDir, file);
      const to = path.join(finalSlideDir, file);
      await fs.copyFile(from, to);
      slideUrls.push(`/uploads/case-showcases/slides/${publicDirName}/${file}`);
    }

    return slideUrls;
  } finally {
    await fs.rm(convertRoot, { recursive: true, force: true }).catch(() => {});
  }
}

function normalizeLearningKind(input) {
  return input === '报告' || input === '课程' ? input : '文章';
}

function sanitizeProjectSnapshotPayload(payload, fallbackProject = null) {
  const project = payload?.project || {};
  const projectId = safeText(project.id, fallbackProject?.id || '');
  const clientName = safeText(project.clientName, fallbackProject?.client_name || fallbackProject?.clientName || '未命名机构');
  const projectName = safeText(project.projectName, fallbackProject?.project_name || fallbackProject?.projectName || `${clientName}战略陪伴`);
  const slug = toProjectSlug(project.slug || fallbackProject?.slug || clientName);
  const description = safeText(project.description, fallbackProject?.description || '');
  const logoUrl = safeText(project.logoUrl, fallbackProject?.logo_url || fallbackProject?.logoUrl || '');
  const hero = payload?.hero || {};
  const north = payload?.north || {};
  const timeline = Array.isArray(payload?.timeline) ? payload.timeline : [];
  const goals = Array.isArray(payload?.goals) ? payload.goals : [];
  const recent = Array.isArray(payload?.latest) ? payload.latest : [];
  const docs = Array.isArray(payload?.docs) ? payload.docs : [];
  const meetings = Array.isArray(payload?.meetings) ? payload.meetings : [];
  const learning = Array.isArray(payload?.learning) ? payload.learning : [];

  return {
    project: {
      id: projectId,
      clientName,
      projectName,
      slug,
      description,
      logoUrl,
      mission: safeText(hero.mission),
      vision: safeText(hero.vision),
      values: textArray(hero.values),
      northStar: safeText(north.northStar),
      northStarMetrics: textArray(north.northStarMetrics),
      annualDeliverables: textArray(north.annualDeliverables),
      next14Days: textArray(north.next14Days),
      isPublished: normalizeBool(project.isPublished, fallbackProject?.is_published || false),
    },
    timeline: timeline
      .map((item, index) => ({
        stage: safeText(item?.stage, `阶段 ${index + 1}`),
        date: safeText(item?.date, '待定'),
        status: normalizeStrategyStatus(item?.status),
        detail: safeText(item?.detail, '请补充阶段说明。'),
      }))
      .filter((item) => item.stage),
    goals: goals
      .map((item, index) => ({
        title: safeText(item?.title, `目标 ${index + 1}`),
        oneLiner: safeText(item?.oneLiner || item?.description, '请补充目标说明。'),
        progress: Math.max(0, Math.min(toPositiveInt(item?.progress, 0), 100)),
        kpis: textArray(item?.kpis),
        risks: textArray(item?.risks),
      }))
      .filter((item) => item.title),
    latest: recent
      .map((item) => ({
        title: safeText(item?.title, '近期事项'),
        date: safeText(item?.date, nowDateText()),
        duration: safeText(item?.duration, '90 分钟'),
        people: safeText(item?.people, '待补充'),
        scope: safeText(item?.scope, '请补充近期事项描述。'),
        doneItems: textArray(item?.doneItems),
        valueItems: textArray(item?.valueItems),
      }))
      .filter((item) => item.title),
    docs: docs
      .map((item) => ({
        title: safeText(item?.title, '未命名文档'),
        date: safeText(item?.date, nowDateText()),
        desc: safeText(item?.desc, ''),
        link: safeText(item?.link, ''),
      }))
      .filter((item) => item.title),
    meetings: meetings
      .map((item) => ({
        title: safeText(item?.title, '未命名会议'),
        date: safeText(item?.date, nowDateText()),
        duration: safeText(item?.duration, '90 分钟'),
        attendees: safeText(item?.attendees, '待补充'),
        keyPeople: safeText(item?.keyPeople, '待补充'),
        topic: safeText(item?.topic, '待补充'),
        link: safeText(item?.link, ''),
      }))
      .filter((item) => item.title),
    learning: learning
      .map((item) => ({
        title: safeText(item?.title, '未命名资源'),
        summary: safeText(item?.summary, ''),
        relation: safeText(item?.relation, ''),
        detail: textArray(item?.detail),
        kind: normalizeLearningKind(item?.kind),
        link: safeText(item?.link, ''),
        sourceType: item?.sourceType === 'internal' ? 'internal' : 'manual',
        internalType: safeText(item?.internalType, ''),
        internalId: safeText(item?.internalId, ''),
      }))
      .filter((item) => item.title),
  };
}

async function listStrategyProjects(scope = 'published') {
  const normalizedScope = normalizeStrategyScope(scope);
  const params = [];
  const where = [`cp.is_active = true`];
  if (normalizedScope !== 'admin') {
    where.push(`cp.is_published = true`);
  }
  const sql = `
    SELECT cp.*, case_logo.logo_url AS case_logo_url
    FROM client_projects cp
    LEFT JOIN LATERAL (
      SELECT cs.logo_url
      FROM case_showcases cs
      WHERE cs.slug = cp.slug
        AND cs.is_active = true
        AND COALESCE(cs.logo_url, '') <> ''
      ORDER BY cs.is_published DESC, cs.updated_at DESC NULLS LAST, cs.created_at DESC
      LIMIT 1
    ) case_logo ON true
    WHERE ${where.join(' AND ')}
    ORDER BY cp.sort_order ASC NULLS LAST, cp.created_at ASC
  `;
  const q = await pool.query(sql, params);
  return q.rows.map(mapStrategyProjectSummary);
}

async function findStrategyProjectById(db, projectId) {
  const q = await db.query(
    `SELECT cp.*, case_logo.logo_url AS case_logo_url
     FROM client_projects cp
     LEFT JOIN LATERAL (
       SELECT cs.logo_url
       FROM case_showcases cs
       WHERE cs.slug = cp.slug
         AND cs.is_active = true
         AND COALESCE(cs.logo_url, '') <> ''
       ORDER BY cs.is_published DESC, cs.updated_at DESC NULLS LAST, cs.created_at DESC
       LIMIT 1
     ) case_logo ON true
     WHERE cp.id=$1
     LIMIT 1`,
    [projectId]
  );
  return q.rows[0] || null;
}

async function buildStrategyProjectSnapshot(db, projectId) {
  const projectRow = await findStrategyProjectById(db, projectId);
  if (!projectRow) return null;

  const milestonesQ = await db.query(
    `SELECT * FROM strategic_milestones
     WHERE project_id=$1 AND is_active = true
     ORDER BY sort_order ASC NULLS LAST, phase_order ASC NULLS LAST, created_at ASC`,
    [projectId]
  );
  const goalsQ = await db.query(
    `SELECT * FROM strategic_goals
     WHERE project_id=$1 AND is_active = true
     ORDER BY created_at ASC`,
    [projectId]
  );
  const metricsQ = await db.query(
    `SELECT gm.*
     FROM goal_metrics gm
     JOIN strategic_goals g ON g.id = gm.goal_id
     WHERE g.project_id=$1
     ORDER BY gm.sort_order ASC NULLS LAST, gm.created_at ASC`,
    [projectId]
  );
  const eventsQ = await db.query(
    `SELECT * FROM project_events
     WHERE project_id=$1 AND is_active = true
     ORDER BY sort_order ASC NULLS LAST, created_at ASC`,
    [projectId]
  );
  const docsQ = await db.query(
    `SELECT * FROM project_documents
     WHERE project_id=$1 AND is_active = true
     ORDER BY sort_order ASC NULLS LAST, created_at ASC`,
    [projectId]
  );
  const meetingsQ = await db.query(
    `SELECT * FROM project_meetings
     WHERE project_id=$1 AND is_active = true
     ORDER BY sort_order ASC NULLS LAST, created_at ASC`,
    [projectId]
  );
  const learningQ = await db.query(
    `SELECT * FROM project_learning_resources
     WHERE project_id=$1 AND is_active = true
     ORDER BY sort_order ASC NULLS LAST, created_at ASC`,
    [projectId]
  );

  const metricsByGoalId = new Map();
  for (const row of metricsQ.rows) {
    const list = metricsByGoalId.get(row.goal_id) || [];
    list.push(safeText(row.label));
    metricsByGoalId.set(row.goal_id, list);
  }

  return {
    project: {
      ...mapStrategyProjectSummary(projectRow),
      mission: projectRow.mission || '',
      vision: projectRow.vision || '',
      values: Array.isArray(projectRow.values_text) ? projectRow.values_text : [],
      northStar: projectRow.north_star_metric || '',
      northStarMetrics: Array.isArray(projectRow.north_star_metrics) ? projectRow.north_star_metrics : [],
      annualDeliverables: Array.isArray(projectRow.yearly_deliverables) ? projectRow.yearly_deliverables : [],
      next14Days: Array.isArray(projectRow.next_14_days) ? projectRow.next_14_days : [],
    },
    hero: {
      mission: projectRow.mission || '',
      vision: projectRow.vision || '',
      values: Array.isArray(projectRow.values_text) ? projectRow.values_text : [],
    },
    north: {
      northStar: projectRow.north_star_metric || '',
      northStarMetrics: Array.isArray(projectRow.north_star_metrics) ? projectRow.north_star_metrics : [],
      annualDeliverables: Array.isArray(projectRow.yearly_deliverables) ? projectRow.yearly_deliverables : [],
      next14Days: Array.isArray(projectRow.next_14_days) ? projectRow.next_14_days : [],
    },
    timeline: milestonesQ.rows.map((row) => ({
      stage: row.title || '',
      date: row.milestone_date || '待定',
      status: row.status === 'completed' ? 'done' : row.status === 'in-progress' ? 'current' : normalizeStrategyStatus(row.status),
      detail: row.description || '',
    })),
    goals: goalsQ.rows.map((row) => ({
      title: row.title || '',
      oneLiner: row.one_liner || row.description || '',
      progress: Math.max(0, Math.min(Number(row.progress || 0), 100)),
      kpis: metricsByGoalId.get(row.id) || [],
      risks: Array.isArray(row.risks) ? row.risks : [],
    })),
    latest: eventsQ.rows.map((row) => ({
      title: row.title || '',
      date: row.event_date || nowDateText(),
      duration: row.duration || '90 分钟',
      people: row.people_text || (row.participants ? `${row.participants} 人` : '待补充'),
      scope: row.description || '',
      doneItems: Array.isArray(row.done_items) ? row.done_items : [],
      valueItems: Array.isArray(row.value_items) ? row.value_items : [],
    })),
    docs: docsQ.rows.map((row) => ({
      title: row.title || '',
      date: row.doc_date || nowDateText(),
      desc: row.description || '',
      link: row.file_url || '',
    })),
    meetings: meetingsQ.rows.map((row) => ({
      title: row.title || '',
      date: row.meeting_date || nowDateText(),
      duration: row.duration || '90 分钟',
      attendees: row.participants_count ? `${row.participants_count} 人` : '待补充',
      keyPeople: row.key_people || '',
      topic: row.topic || (Array.isArray(row.key_points) ? row.key_points.join('；') : ''),
      link: row.meeting_link || '',
    })),
    learning: learningQ.rows.map(mapStrategyLearningResource).map((row) => ({
      title: row.title,
      summary: row.summary,
      relation: row.relation,
      detail: row.detail,
      kind: normalizeLearningKind(row.kind),
      link: row.link,
      sourceType: row.sourceType,
      internalType: row.internalType,
      internalId: row.internalId,
    })),
  };
}

async function replaceStrategyProjectSnapshot(db, projectId, payload, options = {}) {
  const existing = await findStrategyProjectById(db, projectId);
  const normalized = sanitizeProjectSnapshotPayload(payload, existing);
  const now = new Date().toISOString();
  const publishFlag = Object.prototype.hasOwnProperty.call(options, 'publish')
    ? Boolean(options.publish)
    : normalized.project.isPublished;
  const publishAt = publishFlag ? now : null;

  await db.query(
    `INSERT INTO client_projects(
       id, client_name, project_name, status, description, sort_order, is_active, created_at, updated_at,
       slug, logo_url, mission, vision, values_text, north_star_metric, north_star_metrics,
       yearly_deliverables, next_14_days, is_published, published_at
     )
     VALUES ($1,$2,$3,'active',$4,COALESCE((SELECT sort_order FROM client_projects WHERE id=$1), 0), true, COALESCE((SELECT created_at FROM client_projects WHERE id=$1), now()), now(),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO UPDATE SET
       client_name = EXCLUDED.client_name,
       project_name = EXCLUDED.project_name,
       description = EXCLUDED.description,
       slug = EXCLUDED.slug,
       logo_url = EXCLUDED.logo_url,
       mission = EXCLUDED.mission,
       vision = EXCLUDED.vision,
       values_text = EXCLUDED.values_text,
       north_star_metric = EXCLUDED.north_star_metric,
       north_star_metrics = EXCLUDED.north_star_metrics,
       yearly_deliverables = EXCLUDED.yearly_deliverables,
       next_14_days = EXCLUDED.next_14_days,
       is_published = EXCLUDED.is_published,
       published_at = EXCLUDED.published_at,
       updated_at = now()`,
    [
      projectId,
      normalized.project.clientName,
      normalized.project.projectName,
      normalized.project.description,
      normalized.project.slug,
      normalized.project.logoUrl || null,
      normalized.project.mission || null,
      normalized.project.vision || null,
      normalized.project.values,
      normalized.project.northStar || null,
      normalized.project.northStarMetrics,
      normalized.project.annualDeliverables,
      normalized.project.next14Days,
      publishFlag,
      publishAt,
    ]
  );

  await db.query('DELETE FROM goal_metrics WHERE goal_id IN (SELECT id FROM strategic_goals WHERE project_id=$1)', [projectId]);
  await db.query('DELETE FROM strategic_milestones WHERE project_id=$1', [projectId]);
  await db.query('DELETE FROM strategic_goals WHERE project_id=$1', [projectId]);
  await db.query('DELETE FROM project_events WHERE project_id=$1', [projectId]);
  await db.query('DELETE FROM project_documents WHERE project_id=$1', [projectId]);
  await db.query('DELETE FROM project_meetings WHERE project_id=$1', [projectId]);
  await db.query('DELETE FROM project_learning_resources WHERE project_id=$1 AND source_type <> $2', [projectId, 'internal']);

  for (const [index, item] of normalized.timeline.entries()) {
    await db.query(
      `INSERT INTO strategic_milestones(
         id, project_id, title, description, status, phase_order, milestone_date, sort_order, is_active, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,now(),now())`,
      [
        `ms_${crypto.randomUUID()}`,
        projectId,
        item.stage,
        item.detail || null,
        item.status === 'done' ? 'completed' : item.status === 'current' ? 'in-progress' : 'pending',
        index + 1,
        item.date,
        index + 1,
      ]
    );
  }

  for (const item of normalized.goals) {
    const goalId = `goal_${crypto.randomUUID()}`;
    await db.query(
      `INSERT INTO strategic_goals(
         id, project_id, title, description, one_liner, progress, quarter, risks, is_active, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,'当前', $7, true, now(), now())`,
      [goalId, projectId, item.title, item.oneLiner || null, item.oneLiner || null, item.progress, item.risks]
    );
    for (const [metricIndex, label] of item.kpis.entries()) {
      await db.query(
        `INSERT INTO goal_metrics(id, goal_id, label, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,now(),now())`,
        [`metric_${crypto.randomUUID()}`, goalId, label, metricIndex + 1]
      );
    }
  }

  for (const [index, item] of normalized.latest.entries()) {
    await db.query(
      `INSERT INTO project_events(
         id, project_id, type, title, description, event_date, duration, people_text, done_items, value_items,
         participants, sort_order, is_active, created_at, updated_at
       )
       VALUES ($1,$2,'meeting',$3,$4,$5,$6,$7,$8,$9,$10,$11,true,now(),now())`,
      [
        `evt_${crypto.randomUUID()}`,
        projectId,
        item.title,
        item.scope || null,
        item.date || nowDateText(),
        item.duration || null,
        item.people || null,
        item.doneItems,
        item.valueItems,
        Number(String(item.people || '').replace(/\D/g, '')) || null,
        index + 1,
      ]
    );
  }

  for (const [index, item] of normalized.docs.entries()) {
    await db.query(
      `INSERT INTO project_documents(
         id, project_id, category, title, description, doc_date, file_url, sort_order, is_active, created_at, updated_at
       )
       VALUES ($1,$2,'strategy',$3,$4,$5,$6,$7,true,now(),now())`,
      [`doc_${crypto.randomUUID()}`, projectId, item.title, item.desc || null, item.date || nowDateText(), item.link || null, index + 1]
    );
  }

  for (const [index, item] of normalized.meetings.entries()) {
    await db.query(
      `INSERT INTO project_meetings(
         id, project_id, title, meeting_date, duration, participants_count, key_points, attendees,
         key_people, topic, meeting_link, sort_order, is_active, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now(),now())`,
      [
        `meeting_${crypto.randomUUID()}`,
        projectId,
        item.title,
        item.date || nowDateText(),
        item.duration || null,
        Number(String(item.attendees || '').replace(/\D/g, '')) || null,
        item.topic ? [item.topic] : [],
        item.attendees ? [item.attendees] : [],
        item.keyPeople || null,
        item.topic || null,
        item.link || null,
        index + 1,
      ]
    );
  }

  for (const [index, item] of normalized.learning.entries()) {
    await db.query(
      `INSERT INTO project_learning_resources(
         id, project_id, title, summary, relation, detail, kind, link, source_type, internal_type, internal_id,
         sort_order, is_active, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now(),now())`,
      [
        `learn_${crypto.randomUUID()}`,
        projectId,
        item.title,
        item.summary || null,
        item.relation || null,
        item.detail,
        item.kind,
        item.link || null,
        item.sourceType || 'manual',
        item.internalType || null,
        item.internalId || null,
        index + 1,
      ]
    );
  }

  return buildStrategyProjectSnapshot(db, projectId);
}

async function setStrategyProjectPublished(db, projectId, published) {
  await db.query(
    `UPDATE client_projects
     SET is_published = $2,
         published_at = CASE WHEN $2 THEN COALESCE(published_at, now()) ELSE NULL END,
         updated_at = now()
     WHERE id = $1`,
    [projectId, published]
  );
  return findStrategyProjectById(db, projectId);
}

async function resolveStrategyAccess(req) {
  const sessionRow = await getOptionalSession(req);
  if (!sessionRow) {
    return { mode: 'public' };
  }

  if (isAdminRow(sessionRow)) {
    return { mode: 'admin', projects: await listStrategyProjects('published') };
  }

  if (sessionRow.member_type !== 'regular' && sessionRow.strategy_project_id) {
    const project = await findStrategyProjectById(pool, sessionRow.strategy_project_id);
    if (project && project.is_active && project.is_published) {
      return {
        mode: 'project',
        project: mapStrategyProjectSummary(project),
      };
    }
  }

  return { mode: 'public' };
}

async function seedDefaultStrategyProjects() {
  const q = await pool.query('SELECT count(*)::int AS c FROM client_projects');
  if (Number(q.rows[0]?.c || 0) > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const seed of DEFAULT_STRATEGY_PROJECTS) {
      await replaceStrategyProjectSnapshot(
        client,
        seed.id,
        {
          project: {
            id: seed.id,
            clientName: seed.clientName,
            projectName: seed.projectName,
            slug: seed.slug,
            description: seed.description,
            logoUrl: seed.logoUrl,
            isPublished: true,
          },
          hero: {
            mission: seed.mission,
            vision: seed.vision,
            values: seed.values,
          },
          north: {
            northStar: seed.northStar,
            northStarMetrics: seed.northStarMetrics,
            annualDeliverables: seed.annualDeliverables,
            next14Days: seed.next14Days,
          },
          timeline: seed.timeline,
          goals: seed.goals,
          latest: seed.latest,
          docs: seed.docs,
          meetings: seed.meetings,
          learning: seed.learning.map((item) => ({ ...item, sourceType: 'manual' })),
        },
        { publish: true }
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listStrategyLearningResources() {
  const q = await pool.query(
    `SELECT plr.*, cp.client_name
     FROM project_learning_resources plr
     LEFT JOIN client_projects cp ON cp.id = plr.project_id
     WHERE plr.is_active = true
     ORDER BY cp.sort_order ASC NULLS LAST, plr.sort_order ASC NULLS LAST, plr.created_at ASC`
  );
  return q.rows.map((row) => ({ ...mapStrategyLearningResource(row), projectName: row.client_name || '' }));
}

async function upsertStrategyLearningResource(db, payload) {
  const projectId = safeText(payload.projectId);
  const title = safeText(payload.title);
  if (!projectId || !title) {
    throw new Error('学习资源参数不完整');
  }
  const id = safeText(payload.id, `learn_${crypto.randomUUID()}`);
  await db.query(
    `INSERT INTO project_learning_resources(
       id, project_id, title, summary, relation, detail, kind, link, source_type, internal_type, internal_id,
       sort_order, is_active, created_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       relation = EXCLUDED.relation,
       detail = EXCLUDED.detail,
       kind = EXCLUDED.kind,
       link = EXCLUDED.link,
       source_type = EXCLUDED.source_type,
       internal_type = EXCLUDED.internal_type,
       internal_id = EXCLUDED.internal_id,
       sort_order = EXCLUDED.sort_order,
       is_active = EXCLUDED.is_active,
       updated_at = now()`,
    [
      id,
      projectId,
      title,
      safeText(payload.summary) || null,
      safeText(payload.relation) || null,
      textArray(payload.detail),
      normalizeLearningKind(payload.kind),
      safeText(payload.link) || null,
      payload.sourceType === 'internal' ? 'internal' : 'manual',
      safeText(payload.internalType) || null,
      safeText(payload.internalId) || null,
      toPositiveInt(payload.sortOrder, 0),
      normalizeBool(payload.isActive, true),
    ]
  );
  const q = await db.query('SELECT * FROM project_learning_resources WHERE id=$1 LIMIT 1', [id]);
  return mapStrategyLearningResource(q.rows[0]);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  try {
    if (url.pathname === '/healthz') {
      await pool.query('SELECT 1');
      return json(res, 200, {
        ok: true,
        smsReady: Boolean(
          process.env.TC_SECRET_ID
          && process.env.TC_SECRET_KEY
          && process.env.TC_SMS_TEMPLATE_ID_REGISTER
          && process.env.TC_SMS_TEMPLATE_ID_RESET
          && process.env.TC_SMS_SIGN
          && process.env.TC_SMS_SDK_APP_ID
        ),
        emailReady: Boolean(
          process.env.AUTH_SMTP_HOST
          && process.env.AUTH_SMTP_USER
          && process.env.AUTH_SMTP_PASS
          && process.env.AUTH_EMAIL_FROM
        ),
        aiReady: isArkReady(),
        ocrReady: (await getOcrCapabilities()).binaryReady && (await getOcrCapabilities()).chineseReady,
        paymentReady: getPaymentReadiness().enabled,
      });
    }

    if (url.pathname === '/api/auth/bootstrap' && req.method === 'GET') {
      return json(res, 200, { ok: true, phase: 'pg-auth-api', authReady: true });
    }

    if (url.pathname === '/api/auth/assistant/query' && req.method === 'POST') {
      const payload = await readJsonBody(req);
      const data = await buildAssistantResponse(payload);
      return json(res, 200, { ok: true, data });
    }

    if (url.pathname === '/api/auth/assistant/page-agent' && req.method === 'POST') {
      if (!isArkReady()) {
        return json(res, 503, { error: { message: '火山方舟模型尚未就绪' } });
      }

      const payload = await readJsonBody(req);
      const arkPayload = buildArkPageAgentPayload(payload);
      const response = await fetch(`${ARK_BASE_URL}/api/v3/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ARK_API_KEY}`,
        },
        body: JSON.stringify(arkPayload),
      });

      const text = await response.text();
      let normalizedText = text;
      try {
        const parsed = JSON.parse(text);
        const normalized = normalizePageAgentProxyResponse(payload, parsed);
        normalizedText = JSON.stringify(normalized);
      } catch {
        normalizedText = text;
      }
      res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(normalizedText);
      return;
    }

    if (url.pathname === '/api/auth/assistant/page-agent-openai/chat/completions' && req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      });
      res.end();
      return;
    }

    if (url.pathname === '/api/auth/assistant/page-agent-openai/chat/completions' && req.method === 'POST') {
      if (!isArkReady()) {
        res.writeHead(503, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        });
        res.end(JSON.stringify({ error: { message: '火山方舟模型尚未就绪' } }));
        return;
      }

      const payload = await readJsonBody(req);
      const arkPayload = buildArkPageAgentPayload(payload);
      const response = await fetch(`${ARK_BASE_URL}/api/v3/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ARK_API_KEY}`,
        },
        body: JSON.stringify(arkPayload),
      });

      const text = await response.text();
      let normalizedText = text;
      try {
        const parsed = JSON.parse(text);
        const normalized = normalizePageAgentProxyResponse(payload, parsed);
        normalizedText = JSON.stringify(normalized);
      } catch {
        normalizedText = text;
      }

      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      });
      res.end(normalizedText);
      return;
    }

    if (url.pathname === '/api/auth/session' && req.method === 'GET') {
      const row = await requireSession(req);
      return json(res, 200, { ok: true, data: { user: mapUser(row), expiresAt: row.expires_at } });
    }

    if (url.pathname === '/api/auth/profile' && req.method === 'GET') {
      const row = await requireSession(req);
      return json(res, 200, { ok: true, data: { user: mapUser(row) } });
    }

    if (url.pathname === '/api/auth/cover-presets' && req.method === 'GET') {
      const contentType = normalizeCoverPresetContentType(url.searchParams.get('contentType'));
      if (!contentType) {
        return json(res, 400, { ok: false, error: '封面类型无效' });
      }
      return json(res, 200, { ok: true, data: await listCoverPresets(pool, contentType) });
    }

    if (url.pathname === '/api/auth/strategy-access' && req.method === 'GET') {
      const data = await resolveStrategyAccess(req);
      return json(res, 200, { ok: true, data });
    }

    if (url.pathname === '/api/auth/strategy/projects' && req.method === 'GET') {
      const scope = normalizeStrategyScope(url.searchParams.get('scope'));
      if (scope === 'admin') {
        await requireAdmin(req);
      }
      const data = await listStrategyProjects(scope);
      return json(res, 200, { ok: true, data });
    }

    if (url.pathname === '/api/auth/case-showcases' && req.method === 'GET') {
      const scope = normalizeCaseShowcaseScope(url.searchParams.get('scope'));
      if (scope === 'admin') {
        await requireAdmin(req);
      }
      return json(res, 200, { ok: true, data: await listCaseShowcases(scope) });
    }

    if (url.pathname === '/api/auth/strategy/learning-resources' && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, { ok: true, data: await listStrategyLearningResources() });
    }

    if (url.pathname === '/api/auth/invite-codes' && req.method === 'GET') {
      await requireAdmin(req);
      const q = await pool.query(
        `SELECT id, code, type, grant_kind, bonus_days, project_id, project_name_snapshot,
                max_uses, used_count, status, created_by, created_at, used_by
         FROM invite_codes
         ORDER BY created_at DESC`
      );
      return json(res, 200, { ok: true, data: q.rows.map(mapInviteCode) });
    }

    if (url.pathname === '/api/auth/admin/users' && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, { ok: true, data: await listAdminUsers() });
    }

    if (url.pathname === '/api/auth/admin/consult-requests' && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, { ok: true, data: await listConsultRequests() });
    }

    if (url.pathname === '/api/auth/comments' && req.method === 'GET') {
      const scope = url.searchParams.get('scope') || 'public';
      if (scope === 'admin') {
        await requireAdmin(req);
      }
      const contentId = url.searchParams.get('contentId');
      const contentType = url.searchParams.get('contentType');
      const status = url.searchParams.get('status');
      const comments = await listComments({ contentId, contentType, status, scope });
      return json(res, 200, { ok: true, data: comments });
    }

    if (url.pathname === '/api/auth/content-engagement' && req.method === 'GET') {
      const contentType = normalizeContentType(url.searchParams.get('contentType'));
      const contentId = safeText(url.searchParams.get('contentId'));
      if (!contentType || !contentId) {
        return json(res, 400, { ok: false, error: '内容参数不完整' });
      }
      return json(res, 200, { ok: true, data: await getContentEngagementState(pool, req, contentType, contentId) });
    }

    if (url.pathname === '/api/auth/me/favorites' && req.method === 'GET') {
      const row = await requireSession(req);
      return json(res, 200, { ok: true, data: await listUserFavorites(pool, row.id) });
    }

    if (url.pathname === '/api/auth/admin/assets' && req.method === 'POST') {
      await requireAdmin(req);
      const kind = normalizeUploadKind(url.searchParams.get('kind'));
      if (!kind) {
        return json(res, 400, { ok: false, error: '上传类型无效' });
      }

      const isCoverPreset = kind === 'cover-preset';
      const isCaseLogo = kind === 'case-logo';
      const isCasePpt = kind === 'case-ppt';
      const isInsightAsset = kind === 'insight';
      const isMethodologyAsset = kind === 'methodology';
      const contentType = isCoverPreset ? normalizeCoverPresetContentType(url.searchParams.get('contentType')) : null;
      const defaultExt = isCoverPreset || isCaseLogo ? '.png' : isCasePpt ? '.pptx' : '.pdf';
      const filename = sanitizeUploadFilename(
        url.searchParams.get('filename') || req.headers['x-file-name'] || '',
        defaultExt
      );
      const ext = path.extname(filename).toLowerCase();
      if (isCoverPreset) {
        if (!contentType) {
          return json(res, 400, { ok: false, error: '封面类型无效' });
        }
        if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
          return json(res, 400, { ok: false, error: '封面仅支持 png/jpg/webp/svg' });
        }
      } else if (isCaseLogo) {
        if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
          return json(res, 400, { ok: false, error: '案例 Logo 仅支持 png/jpg/webp/svg' });
        }
      } else if (isCasePpt) {
        if (!['.ppt', '.pptx'].includes(ext)) {
          return json(res, 400, { ok: false, error: '案例展示仅支持上传 PPT/PPTX 文件' });
        }
      } else if (isInsightAsset || isMethodologyAsset) {
        if (!['.pdf', '.docx'].includes(ext)) {
          return json(res, 400, { ok: false, error: '文章与方法论仅支持上传 PDF 或 DOCX 文件' });
        }
      } else if (ext !== '.pdf') {
        return json(res, 400, { ok: false, error: '目前仅支持上传 PDF 文件' });
      }

      const bodyBuffer = await readRawBody(req);
      if (!bodyBuffer.length) {
        return json(res, 400, { ok: false, error: '上传内容为空' });
      }

      const targetDir = path.join(
        ADMIN_UPLOAD_ROOT,
        kind === 'report'
          ? 'reports'
          : kind === 'book'
            ? 'books'
            : kind === 'insight'
              ? 'insights'
              : kind === 'methodology'
                ? 'methodologies'
            : kind === 'case-logo'
              ? path.join('case-showcases', 'logos')
              : kind === 'case-ppt'
                ? path.join('case-showcases', 'presentations')
                : path.join('cover-presets', contentType)
      );
      await fs.mkdir(targetDir, { recursive: true });
      const savedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${filename}`;
      const targetPath = path.join(targetDir, savedName);
      await fs.writeFile(targetPath, bodyBuffer);

      let publicUrl = '';
      let slides = [];
      try {
        if (isCoverPreset) {
          publicUrl = `/uploads/cover-presets/${contentType}/${savedName}`;
        } else if (isCaseLogo) {
          publicUrl = `/uploads/case-showcases/logos/${savedName}`;
        } else if (isCasePpt) {
          publicUrl = `/uploads/case-showcases/presentations/${savedName}`;
          slides = await convertPresentationToSlides(targetPath, savedName);
        } else {
          const uploadFolder = kind === 'report'
            ? 'reports'
            : kind === 'book'
              ? 'books'
              : kind === 'insight'
                ? 'insights'
                : 'methodologies';
          publicUrl = `/uploads/${uploadFolder}/${savedName}`;
        }
      } catch (error) {
        await fs.rm(targetPath, { force: true }).catch(() => {});
        throw error;
      }

      return json(res, 200, {
        ok: true,
        data: {
          url: publicUrl,
          size: bodyBuffer.length,
          filename: savedName,
          slides,
        },
      });
    }

    if (url.pathname === '/api/auth/admin/ai-prefill' && req.method === 'POST') {
      await requireAdmin(req);
      const payload = await readJsonBody(req);
      const contentType = safeText(payload.contentType);
      const fileUrl = safeText(payload.fileUrl);
      if (!['report', 'book', 'insight', 'methodology'].includes(contentType)) {
        return json(res, 400, { ok: false, error: 'AI 填充仅支持四类内容资源' });
      }
      if (!fileUrl) {
        return json(res, 400, { ok: false, error: '请先上传内容文件' });
      }

      const data = await buildAiPrefillResult({
        contentType,
        fileUrl,
        current: payload.current && typeof payload.current === 'object' ? payload.current : {},
      });
      return json(res, 200, { ok: true, data });
    }

    if (url.pathname === '/api/auth/payment/readiness' && req.method === 'GET') {
      await requireAdmin(req);
      const readiness = getPaymentReadiness();
      const q = await pool.query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'paid')::int AS paid,
           count(*) FILTER (WHERE status = 'pending')::int AS open
         FROM payment_orders`
      );
      return json(res, 200, {
        ok: true,
        data: {
          ...readiness,
          totalOrders: q.rows[0]?.total || 0,
          paidOrders: q.rows[0]?.paid || 0,
          openOrders: q.rows[0]?.open || 0,
        },
      });
    }

    if (url.pathname === '/api/auth/payment/orders' && req.method === 'GET') {
      const scope = url.searchParams.get('scope');
      const limit = Number(url.searchParams.get('limit') || 20);
      if (scope === 'admin') {
        await requireAdmin(req);
        return json(res, 200, { ok: true, data: await listPaymentOrders({ admin: true, limit }) });
      }
      const row = await requireSession(req);
      return json(res, 200, { ok: true, data: await listPaymentOrders({ admin: false, userId: row.id, limit }) });
    }

    const paymentOrderMatch = url.pathname.match(/^\/api\/auth\/payment\/orders\/([^/]+)$/);
    if (paymentOrderMatch && req.method === 'GET') {
      const orderNo = decodeURIComponent(paymentOrderMatch[1]);
      const sessionRow = await requireSession(req);
      const admin = isAdminRow(sessionRow);
      let orderRow = await getPaymentOrderRowByOrderNo(pool, orderNo);
      if (!orderRow) {
        return json(res, 404, { ok: false, error: '订单不存在' });
      }
      if (!admin && orderRow.user_id !== sessionRow.id) {
        return json(res, 403, { ok: false, error: '无权查看该订单' });
      }
      if (orderRow.status === 'pending') {
        try {
          orderRow = await syncPaymentOrderWithProvider(orderRow);
        } catch {
          // 订单查询页以本地状态兜底，不让三方查询失败阻断页面。
        }
      }
      return json(res, 200, { ok: true, data: mapPaymentOrder(orderRow) });
    }

    const caseShowcaseMatch = url.pathname.match(/^\/api\/auth\/case-showcases\/([^/]+)$/);
    if (caseShowcaseMatch && req.method === 'GET') {
      const value = decodeURIComponent(caseShowcaseMatch[1]);
      const scope = normalizeCaseShowcaseScope(url.searchParams.get('scope'));
      if (scope === 'admin') {
        await requireAdmin(req);
      }
      const row = await findCaseShowcaseByIdOrSlug(pool, value);
      if (!row || row.is_active === false) {
        return json(res, 404, { ok: false, error: '案例不存在' });
      }
      if (scope !== 'admin' && !row.is_published) {
        return json(res, 404, { ok: false, error: '案例不存在或未发布' });
      }
      return json(res, 200, { ok: true, data: mapCaseShowcase(row) });
    }

    if (url.pathname === '/api/auth/case-showcases/upsert' && req.method === 'POST') {
      await requireAdmin(req);
      const body = await readJsonBody(req);
      const saved = await upsertCaseShowcase(pool, body);
      return json(res, 200, { ok: true, data: saved ? mapCaseShowcase(saved) : null, message: '案例展示已保存到腾讯云。' });
    }

    if (caseShowcaseMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      const value = decodeURIComponent(caseShowcaseMatch[1]);
      const removed = await deleteCaseShowcaseById(pool, value);
      if (!removed) {
        return json(res, 404, { ok: false, error: '案例不存在' });
      }
      return json(res, 200, { ok: true, message: '案例展示已删除' });
    }

    const strategySnapshotMatch = url.pathname.match(/^\/api\/auth\/strategy\/projects\/([^/]+)\/snapshot$/);
    if (strategySnapshotMatch && req.method === 'GET') {
      const projectId = decodeURIComponent(strategySnapshotMatch[1]);
      const access = await resolveStrategyAccess(req);

      if (access.mode === 'public') {
        return json(res, 403, { ok: false, error: '当前用户无机构战略陪伴权限' });
      }
      if (access.mode === 'project' && access.project?.id !== projectId) {
        return json(res, 403, { ok: false, error: '当前用户无权查看该机构页面' });
      }
      const snapshot = await buildStrategyProjectSnapshot(pool, projectId);
      if (!snapshot) {
        return json(res, 404, { ok: false, error: '机构项目不存在' });
      }
      if (access.mode !== 'admin' && !snapshot.project?.isPublished) {
        return json(res, 404, { ok: false, error: '机构项目不存在或未发布' });
      }
      return json(res, 200, { ok: true, data: snapshot });
    }

    if (url.pathname === '/api/auth/payment/wechat/notify' && req.method === 'POST') {
      const signature = String(req.headers['wechatpay-signature'] || '').trim();
      const timestamp = String(req.headers['wechatpay-timestamp'] || '').trim();
      const nonce = String(req.headers['wechatpay-nonce'] || '').trim();
      const bodyBuffer = await readRawBody(req, 2 * 1024 * 1024);
      const bodyText = bodyBuffer.toString('utf8');
      const config = await loadWeChatPayConfig();
      await ensurePlatformCert(config);

      if (!signature || !timestamp || !nonce || !config.platformCertPem || !config.apiV3Key) {
        return json(res, 400, { code: 'FAIL', message: '回调验签参数缺失' });
      }

      const valid = verifyWithPlatformCert(
        config.platformCertPem,
        buildWechatNotifySignatureMessage(timestamp, nonce, bodyText),
        signature
      );
      if (!valid) {
        return json(res, 401, { code: 'FAIL', message: '回调验签失败' });
      }

      const payload = JSON.parse(bodyText || '{}');
      const resource = payload?.resource;
      if (!resource?.ciphertext) {
        return json(res, 400, { code: 'FAIL', message: '回调内容无效' });
      }

      const notifyData = decryptWechatResource(config.apiV3Key, resource);
      const orderNo = String(notifyData.out_trade_no || '').trim();
      if (!orderNo) {
        return json(res, 400, { code: 'FAIL', message: '订单号缺失' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const orderRow = await getPaymentOrderRowByOrderNo(client, orderNo, { forUpdate: true });
        if (!orderRow) {
          throw new Error('订单不存在');
        }
        if (Number(notifyData.amount?.total || 0) !== Number(orderRow.amount_fen || 0)) {
          throw new Error('订单金额校验失败');
        }
        const tradeState = mapWechatTradeStateToOrderStatus(notifyData.trade_state);
        if (tradeState === 'paid') {
          await markPaymentOrderPaid(client, orderRow, {
            providerOrderId: notifyData.transaction_id,
            notifyPayload: payload,
            providerPayload: notifyData,
            paidAt: notifyData.success_time,
          });
        } else {
          await updatePaymentOrderState(client, orderNo, {
            status: tradeState,
            provider_order_id: notifyData.transaction_id || null,
            notify_payload: JSON.stringify(payload),
            provider_payload: JSON.stringify(notifyData),
            note: tradeState === 'closed' ? '订单已关闭' : tradeState === 'failed' ? '支付失败' : '待支付',
          });
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { code: 'FAIL', message: error.message || '回调处理失败' });
      } finally {
        client.release();
      }

      return json(res, 200, { code: 'SUCCESS', message: '成功' });
    }

    const packageDownloadMatch = url.pathname.match(/^\/api\/v1\/downloads\/package\/([^/]+)(?:\/blockmap)?$/);
    if (packageDownloadMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      await requireAdmin(req);
      const packageId = decodeURIComponent(packageDownloadMatch[1]);
      const q = await pool.query('SELECT * FROM release_packages WHERE id=$1 LIMIT 1', [packageId]);
      if (!q.rows[0]) return json(res, 404, { ok: false, error: '安装包不存在' });
      return streamReleaseFile(req, res, q.rows[0], url.pathname.endsWith('/blockmap') ? 'blockmap' : 'installer');
    }

    const updatePackageDownloadMatch = url.pathname.match(/^\/api\/v1\/updates\/packages\/(release|custom)\/([^/]+)(?:\/blockmap)?$/);
    if (updatePackageDownloadMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const kind = updatePackageDownloadMatch[1];
      const packageId = decodeURIComponent(updatePackageDownloadMatch[2]);
      const table = kind === 'custom' ? 'release_custom_packages' : 'release_packages';
      const q = await pool.query(`SELECT * FROM ${table} WHERE id=$1 LIMIT 1`, [packageId]);
      if (!q.rows[0]) return json(res, 404, { ok: false, error: '安装包不存在' });
      return streamReleaseFile(req, res, q.rows[0], url.pathname.endsWith('/blockmap') ? 'blockmap' : 'installer');
    }

    const tokenDownloadMatch = url.pathname.match(/^\/api\/v1\/downloads\/([^/]+)$/);
    if (tokenDownloadMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const token = decodeURIComponent(tokenDownloadMatch[1]);
      const q = await pool.query(
        `SELECT t.*, p.*
         FROM beta_download_tokens t
         JOIN release_packages p ON p.id = t.package_id
         WHERE t.token_hash=$1 AND t.expires_at > now()
         LIMIT 1`,
        [hashToken(token)]
      );
      if (!q.rows[0]) return json(res, 404, { ok: false, error: '下载链接已失效，请重新输入内测码' });
      if (req.method === 'GET') {
        await pool.query('UPDATE beta_download_tokens SET used_at=COALESCE(used_at, now()) WHERE token_hash=$1', [hashToken(token)]);
      }
      return streamReleaseFile(req, res, q.rows[0]);
    }

    if (url.pathname === '/api/v1/release-orgs/resolve' && req.method === 'POST') {
      const payload = await readJsonBody(req);
      return json(res, 200, await resolveReleaseOrgIdentity(payload));
    }

    const updateResolveMatch = url.pathname.match(/^\/api\/v1\/updates\/([^/]+)\/([^/]+)\/(latest|latest-mac\.yml|latest\.yml)$/);
    if (updateResolveMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const orgCode = decodeURIComponent(updateResolveMatch[1]);
      const platform = normalizeReleasePlatform(decodeURIComponent(updateResolveMatch[2]));
      const update = await resolveUpdateTarget(orgCode, platform);
      if (!update) return json(res, 404, { ok: false, error: '当前暂无可用更新包' });
      if (updateResolveMatch[3] === 'latest-mac.yml' || updateResolveMatch[3] === 'latest.yml') {
        const body = req.method === 'HEAD' ? '' : renderLatestYml(update);
        res.writeHead(200, {
          'Content-Type': 'text/yaml; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Length': Buffer.byteLength(body),
        });
        return res.end(body);
      }
      return json(res, 200, update);
    }

    if (url.pathname === '/api/v1/releases/latest' && req.method === 'GET') {
      const platform = normalizeReleasePlatform(url.searchParams.get('platform'));
      const latest = await getLatestPackage(platform);
      if (!latest) return json(res, 200, null);
      const rel = await pool.query('SELECT * FROM release_versions WHERE id=$1 LIMIT 1', [latest.release_id]);
      if (!rel.rows[0]) return json(res, 200, null);
      return json(res, 200, mapRelease(rel.rows[0], await listReleasePackages(rel.rows[0].id)));
    }

    if (url.pathname === '/api/v1/admin/custom-packages' && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, await listCustomPackages());
    }

    if (url.pathname === '/api/v1/admin/custom-packages' && req.method === 'POST') {
      const admin = await requireAdmin(req);
      const bodyBuffer = await readRawBody(req, 900 * 1024 * 1024);
      if (!bodyBuffer.length) return json(res, 400, { detail: '上传内容为空' });
      const pkg = await createCustomPackage({
        baseReleaseId: url.searchParams.get('baseReleaseId'),
        platform: url.searchParams.get('platform'),
        arch: url.searchParams.get('arch'),
        name: url.searchParams.get('name'),
        versionLabel: url.searchParams.get('versionLabel'),
        differenceNotes: url.searchParams.get('differenceNotes'),
        status: url.searchParams.get('status'),
        createdBy: admin.id,
      }, bodyBuffer, url.searchParams.get('filename') || req.headers['x-file-name'] || '');
      return json(res, 200, pkg);
    }

    const customPackageMatch = url.pathname.match(/^\/api\/v1\/admin\/custom-packages\/([^/]+)$/);
    if (customPackageMatch && req.method === 'PATCH') {
      await requireAdmin(req);
      const payload = await readJsonBody(req);
      return json(res, 200, await patchCustomPackage(decodeURIComponent(customPackageMatch[1]), payload));
    }

    const customBlockmapMatch = url.pathname.match(/^\/api\/v1\/admin\/custom-packages\/([^/]+)\/blockmap$/);
    if (customBlockmapMatch && req.method === 'POST') {
      await requireAdmin(req);
      const bodyBuffer = await readRawBody(req, 20 * 1024 * 1024);
      if (!bodyBuffer.length) return json(res, 400, { detail: '上传内容为空' });
      return json(res, 200, await attachCustomPackageBlockmap(
        decodeURIComponent(customBlockmapMatch[1]),
        bodyBuffer,
        url.searchParams.get('filename') || req.headers['x-file-name'] || ''
      ));
    }

    if (url.pathname === '/api/v1/admin/assignments' && req.method === 'GET') {
      await requireAdmin(req);
      const q = await pool.query(
        `SELECT a.*, r.version AS release_version, cp.name AS custom_package_name, cp.status AS custom_package_status
         FROM release_assignments a
         JOIN release_versions r ON r.id = a.release_id
         LEFT JOIN release_custom_packages cp ON cp.id = a.custom_package_id
         ORDER BY a.updated_at DESC, a.created_at DESC`
      );
      return json(res, 200, q.rows.map(mapAssignment));
    }

    if (url.pathname === '/api/v1/admin/releases' && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, await listReleaseRows());
    }

    if (url.pathname === '/api/v1/admin/releases' && req.method === 'POST') {
      const admin = await requireAdmin(req);
      const payload = await readJsonBody(req);
      const version = safeText(payload.version);
      if (!version) return json(res, 400, { detail: '请填写版本号' });
      const platforms = Array.isArray(payload.platforms) && payload.platforms.length
        ? payload.platforms.map(normalizeReleasePlatform)
        : ['mac', 'windows'];
      const q = await pool.query(
        `INSERT INTO release_versions(id, version, git_tag, source_commit, status, platforms, mandatory, user_notes, internal_notes, screenshots, created_by)
         VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10)
         ON CONFLICT (version) DO UPDATE SET
           git_tag=EXCLUDED.git_tag,
           source_commit=EXCLUDED.source_commit,
           platforms=EXCLUDED.platforms,
           mandatory=EXCLUDED.mandatory,
           user_notes=EXCLUDED.user_notes,
           internal_notes=EXCLUDED.internal_notes,
           screenshots=EXCLUDED.screenshots,
           updated_at=now()
         RETURNING *`,
        [
          crypto.randomUUID(),
          version,
          safeText(payload.gitTag) || null,
          safeText(payload.sourceCommit) || null,
          platforms,
          Boolean(payload.mandatory),
          JSON.stringify(payload.userNotes || {}),
          safeText(payload.internalNotes),
          Array.isArray(payload.screenshots) ? payload.screenshots.map(safeText).filter(Boolean) : [],
          admin.id,
        ]
      );
      return json(res, 200, mapRelease(q.rows[0], await listReleasePackages(q.rows[0].id)));
    }

    const releaseMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)$/);
    if (releaseMatch && req.method === 'PATCH') {
      await requireAdmin(req);
      const releaseId = decodeURIComponent(releaseMatch[1]);
      const payload = await readJsonBody(req);
      const fields = [];
      const values = [];
      const add = (sql, value) => { values.push(value); fields.push(`${sql}=$${values.length}`); };
      if (payload.status != null) {
        const status = normalizeReleaseStatus(payload.status);
        if (status === 'published') {
          const pkgCount = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM release_packages
             WHERE release_id=$1 AND platform IN ('mac','windows') AND downloadable=true`,
            [releaseId]
          );
          if (!Number(pkgCount.rows[0]?.count || 0)) {
            return json(res, 400, { detail: '至少上传一个 Mac 或 Windows 安装包后才能正式发布' });
          }
        }
        add('status', status);
        if (status === 'published') fields.push('published_at=COALESCE(published_at, now())');
      }
      if (payload.platforms != null) add('platforms', Array.isArray(payload.platforms) ? payload.platforms.map(normalizeReleasePlatform) : ['mac']);
      if (payload.gitTag != null) add('git_tag', safeText(payload.gitTag) || null);
      if (payload.sourceCommit != null) add('source_commit', safeText(payload.sourceCommit) || null);
      if (payload.mandatory != null) add('mandatory', Boolean(payload.mandatory));
      if (payload.userNotes != null) add('user_notes', JSON.stringify(payload.userNotes || {}));
      if (payload.internalNotes != null) add('internal_notes', safeText(payload.internalNotes));
      if (payload.screenshots != null) add('screenshots', Array.isArray(payload.screenshots) ? payload.screenshots.map(safeText).filter(Boolean) : []);
      if (!fields.length) return json(res, 400, { detail: '没有可更新字段' });
      fields.push('updated_at=now()');
      values.push(releaseId);
      const q = await pool.query(`UPDATE release_versions SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`, values);
      if (!q.rows[0]) return json(res, 404, { detail: '版本不存在' });
      return json(res, 200, mapRelease(q.rows[0], await listReleasePackages(releaseId)));
    }

    if (releaseMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      const releaseId = decodeURIComponent(releaseMatch[1]);
      const existing = await pool.query('SELECT * FROM release_versions WHERE id=$1 LIMIT 1', [releaseId]);
      if (!existing.rows[0]) return json(res, 404, { detail: '版本不存在' });

      const artifacts = await pool.query(
        `SELECT storage_path, blockmap_path FROM release_packages WHERE release_id=$1
         UNION ALL
         SELECT storage_path, blockmap_path FROM release_custom_packages WHERE base_release_id=$1`,
        [releaseId]
      );
      await pool.query('DELETE FROM release_versions WHERE id=$1', [releaseId]);

      const releaseRoot = path.resolve(RELEASE_ASSET_ROOT);
      for (const row of artifacts.rows) {
        for (const filePath of [row.storage_path, row.blockmap_path]) {
          if (!filePath) continue;
          const resolvedPath = path.resolve(String(filePath));
          if (!resolvedPath.startsWith(`${releaseRoot}${path.sep}`)) continue;
          try {
            await fs.rm(resolvedPath, { force: true });
          } catch (error) {
            console.warn('[release] artifact cleanup skipped:', error?.message || error);
          }
        }
      }

      return json(res, 200, { ok: true, deleted: true, id: releaseId });
    }

    const releaseTosSyncJobMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/tos-sync\/([^/]+)$/);
    if (releaseTosSyncJobMatch && req.method === 'GET') {
      await requireAdmin(req);
      const releaseId = decodeURIComponent(releaseTosSyncJobMatch[1]);
      const jobId = decodeURIComponent(releaseTosSyncJobMatch[2]);
      const job = await getTosSyncJob(jobId, releaseId);
      if (!job || job.releaseId !== releaseId) return json(res, 404, { detail: 'TOS 更新任务不存在或已过期' });
      return json(res, 200, serializeTosSyncJob(job));
    }

    const releaseTosSyncMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/tos-sync$/);
    if (releaseTosSyncMatch && req.method === 'POST') {
      const admin = await requireAdmin(req);
      const releaseId = decodeURIComponent(releaseTosSyncMatch[1]);
      const release = await getReleaseById(releaseId);
      if (!release) return json(res, 404, { detail: '版本不存在' });
      const pkgCount = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM release_packages
         WHERE release_id=$1 AND platform IN ('mac','windows') AND downloadable=true`,
        [releaseId]
      );
      if (!Number(pkgCount.rows[0]?.count || 0)) {
        return json(res, 400, { detail: '至少上传一个 Mac 或 Windows 安装包后才能同步 TOS 更新源' });
      }
      const job = await startReleaseTosSyncJob(releaseId, admin.id);
      return json(res, 202, serializeTosSyncJob(job));
    }

    const releasePackagesMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/packages$/);
    if (releasePackagesMatch && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, await listReleasePackages(decodeURIComponent(releasePackagesMatch[1])));
    }

    if (releasePackagesMatch && req.method === 'POST') {
      await requireAdmin(req);
      const releaseId = decodeURIComponent(releasePackagesMatch[1]);
      const platform = normalizeReleasePlatform(url.searchParams.get('platform'));
      const arch = normalizeReleaseArch(url.searchParams.get('arch'), platform);
      const filename = url.searchParams.get('filename') || req.headers['x-file-name'] || '';
      const bodyBuffer = await readRawBody(req, 900 * 1024 * 1024);
      if (!bodyBuffer.length) return json(res, 400, { detail: '上传内容为空' });
      const pkg = await upsertReleasePackage(releaseId, platform, bodyBuffer, filename, arch);
      return json(res, 200, pkg);
    }

    const blockmapMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/packages\/([^/]+)\/blockmap$/);
    if (blockmapMatch && req.method === 'POST') {
      await requireAdmin(req);
      const releaseId = decodeURIComponent(blockmapMatch[1]);
      const packageId = decodeURIComponent(blockmapMatch[2]);
      const filename = url.searchParams.get('filename') || req.headers['x-file-name'] || '';
      const bodyBuffer = await readRawBody(req, 20 * 1024 * 1024);
      if (!bodyBuffer.length) return json(res, 400, { detail: '上传内容为空' });
      return json(res, 200, await attachReleaseBlockmap(releaseId, packageId, bodyBuffer, filename));
    }

    const assignmentsMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/assignments$/);
    if (assignmentsMatch && req.method === 'GET') {
      await requireAdmin(req);
      const q = await pool.query(
        `SELECT a.*, r.version AS release_version, cp.name AS custom_package_name, cp.status AS custom_package_status
         FROM release_assignments a
         JOIN release_versions r ON r.id = a.release_id
         LEFT JOIN release_custom_packages cp ON cp.id = a.custom_package_id
         WHERE a.release_id=$1
         ORDER BY a.created_at DESC`,
        [decodeURIComponent(assignmentsMatch[1])]
      );
      return json(res, 200, q.rows.map(mapAssignment));
    }

    if (assignmentsMatch && req.method === 'POST') {
      const admin = await requireAdmin(req);
      const releaseId = decodeURIComponent(assignmentsMatch[1]);
      const payload = await readJsonBody(req);
      const customPackageId = safeText(payload.customPackageId) || null;
      const targetType = normalizeAssignmentTargetType(payload.targetType);
      const orgCode = targetType === 'org' ? await resolveCanonicalOrgCode(payload.orgCode) : null;
      if (targetType === 'org' && !orgCode) return json(res, 400, { detail: '请先选择组织' });
      const platform = 'all';
      if (customPackageId) {
        const custom = await pool.query(
          'SELECT id, platform FROM release_custom_packages WHERE id=$1 AND base_release_id=$2 LIMIT 1',
          [customPackageId, releaseId]
        );
        if (!custom.rows[0]) return json(res, 400, { detail: '定制包不存在或不属于该基准版本' });
      }
      await pool.query(
        `UPDATE release_assignments
         SET status='rolled_back', updated_at=now()
         WHERE status='active' AND target_type=$1
           AND (($1='org' AND org_code=$2) OR ($1='all' AND org_code IS NULL))`,
        [targetType, orgCode]
      );
      const q = await pool.query(
        `INSERT INTO release_assignments(id, release_id, custom_package_id, platform, target_type, org_code, rollout_pct, mandatory, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
         RETURNING *`,
        [
          crypto.randomUUID(),
          releaseId,
          customPackageId,
          platform,
          targetType,
          orgCode,
          Math.min(100, Math.max(0, toPositiveInt(payload.rolloutPct, 100))),
          Boolean(payload.mandatory),
          admin.id,
        ]
      );
      return json(res, 200, mapAssignment(q.rows[0]));
    }

    const assignmentMatch = url.pathname.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/assignments\/([^/]+)$/);
    if (assignmentMatch && req.method === 'PATCH') {
      await requireAdmin(req);
      const pathReleaseId = decodeURIComponent(assignmentMatch[1]);
      const assignmentId = decodeURIComponent(assignmentMatch[2]);
      const payload = await readJsonBody(req);
      const targetReleaseId = safeText(payload.releaseId) || pathReleaseId;
      const currentAssignmentQ = await pool.query('SELECT * FROM release_assignments WHERE id=$1 AND release_id=$2 LIMIT 1', [assignmentId, pathReleaseId]);
      const currentAssignment = currentAssignmentQ.rows[0];
      if (!currentAssignment) return json(res, 404, { detail: '指派不存在' });
      const releaseExists = await pool.query('SELECT id FROM release_versions WHERE id=$1 LIMIT 1', [targetReleaseId]);
      if (!releaseExists.rows[0]) return json(res, 404, { detail: '版本不存在' });
      const customPackageId = payload.customPackageId === undefined ? undefined : (safeText(payload.customPackageId) || null);
      const targetType = payload.targetType ? normalizeAssignmentTargetType(payload.targetType) : normalizeAssignmentTargetType(currentAssignment.target_type);
      const orgCode = targetType === 'org'
        ? (payload.orgCode == null ? currentAssignment.org_code : await resolveCanonicalOrgCode(payload.orgCode))
        : null;
      if (targetType === 'org' && !orgCode) return json(res, 400, { detail: '请先选择组织' });
      const nextCustomPackageId = customPackageId === undefined ? currentAssignment.custom_package_id : customPackageId;
      const nextPlatform = 'all';
      if (nextCustomPackageId) {
        const custom = await pool.query(
          'SELECT id, platform FROM release_custom_packages WHERE id=$1 AND base_release_id=$2 LIMIT 1',
          [nextCustomPackageId, targetReleaseId]
        );
        if (!custom.rows[0]) return json(res, 400, { detail: '定制包不存在或不属于该基准版本' });
      }
      const nextStatus = normalizeAssignmentStatus(payload.status, currentAssignment.status || 'active');
      const nextRolloutPct = payload.rolloutPct == null
        ? Number(currentAssignment.rollout_pct || 100)
        : Math.min(100, Math.max(0, toPositiveInt(payload.rolloutPct, 100)));
      const nextMandatory = payload.mandatory == null ? Boolean(currentAssignment.mandatory) : Boolean(payload.mandatory);
      if (nextStatus === 'active') {
        await pool.query(
          `UPDATE release_assignments
           SET status='rolled_back', updated_at=now()
           WHERE id<>$1 AND status='active' AND target_type=$2
             AND (($2='org' AND org_code=$3) OR ($2='all' AND org_code IS NULL))`,
          [assignmentId, targetType, orgCode]
        );
      }
      const q = await pool.query(
        `UPDATE release_assignments
         SET release_id=$1, status=$2, target_type=$3, org_code=$4,
             rollout_pct=$5, mandatory=$6, custom_package_id=$7, platform=$8, updated_at=now()
         WHERE id=$9 AND release_id=$10
         RETURNING *`,
        [
          targetReleaseId,
          nextStatus,
          targetType,
          orgCode,
          nextRolloutPct,
          nextMandatory,
          nextCustomPackageId,
          nextPlatform,
          assignmentId,
          pathReleaseId,
        ]
      );
      return json(res, 200, mapAssignment(q.rows[0]));
    }

    if (url.pathname === '/api/v1/admin/feedback' && req.method === 'GET') {
      await requireAdmin(req);
      const clauses = [];
      const values = [];
      for (const [key, column] of [['status', 'status'], ['kind', 'kind'], ['severity', 'severity']]) {
        const value = safeText(url.searchParams.get(key));
        if (value && value !== 'all') {
          values.push(value);
          clauses.push(`${column}=$${values.length}`);
        }
      }
      const limit = Math.min(200, Math.max(1, toPositiveInt(url.searchParams.get('limit'), 100)));
      const offset = toPositiveInt(url.searchParams.get('offset'), 0);
      values.push(limit, offset);
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const q = await pool.query(
        `SELECT * FROM release_feedback ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
      );
      return json(res, 200, q.rows.map(mapFeedback));
    }

    const feedbackMatch = url.pathname.match(/^\/api\/v1\/admin\/feedback\/([^/]+)$/);
    if (feedbackMatch && req.method === 'PATCH') {
      await requireAdmin(req);
      const payload = await readJsonBody(req);
      const q = await pool.query(
        `UPDATE release_feedback
         SET status=COALESCE($1,status), severity=COALESCE($2,severity), dup_of=$3,
             linked_task_id=$4, linked_release_id=$5, updated_at=now()
         WHERE id=$6
         RETURNING *`,
        [
          payload.status ? normalizeFeedbackStatus(payload.status) : null,
          payload.severity ? normalizeFeedbackSeverity(payload.severity) : null,
          payload.dupOf == null ? null : safeText(payload.dupOf),
          payload.linkedTaskId == null ? null : safeText(payload.linkedTaskId),
          payload.linkedReleaseId == null ? null : safeText(payload.linkedReleaseId),
          decodeURIComponent(feedbackMatch[1]),
        ]
      );
      if (!q.rows[0]) return json(res, 404, { detail: '反馈不存在' });
      return json(res, 200, mapFeedback(q.rows[0]));
    }

    if (url.pathname === '/api/v1/feedback' && req.method === 'POST') {
      const session = await getOptionalSession(req);
      const payload = await readJsonBody(req);
      const title = safeText(payload.title, '用户反馈');
      const q = await pool.query(
        `INSERT INTO release_feedback(
          id, kind, severity, title, description, submitter_user_id, submitter_name, org_code, version, page, os, screenshot_url, log_excerpt
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
        [
          crypto.randomUUID(),
          normalizeFeedbackKind(payload.kind),
          normalizeFeedbackSeverity(payload.severity),
          title,
          safeText(payload.description),
          session?.id || null,
          safeText(payload.submitterName, session?.nickname || session?.email || '匿名用户'),
          safeText(payload.orgCode) || null,
          safeText(payload.version) || null,
          safeText(payload.page) || null,
          safeText(payload.os) || null,
          safeText(payload.screenshotUrl) || null,
          safeText(payload.logExcerpt).slice(0, 4000) || null,
        ]
      );
      return json(res, 200, mapFeedback(q.rows[0]));
    }

    if (url.pathname === '/api/v1/admin/organizations' && req.method === 'GET') {
      await requireAdmin(req);
      return json(res, 200, await listOrganizationSummaries());
    }

    if (url.pathname === '/api/v1/beta/applications' && req.method === 'POST') {
      const session = await requireSession(req);
      const payload = await readJsonBody(req);
      const userEmail = safeText(payload.userEmail || session.email).toLowerCase();
      if (!userEmail || isPhoneLocalEmail(userEmail)) return json(res, 400, { detail: '请先绑定邮箱后再申请内测' });
      const userName = safeText(payload.userName || session.nickname || session.email || session.phone, '用户');
      const userType = normalizeBetaUserType(payload.userType);
      const orgName = safeText(payload.orgName);
      const purpose = safeText(payload.purpose);
      const ALLOWED_HEADCOUNT = ['5人以内','6-20人','21-50人','50人以上'];
      const headcount = ALLOWED_HEADCOUNT.includes(payload.headcount) ? payload.headcount : '';
      const focusIssue = safeText(payload.focusIssue);
      const beneficiaryCount = safeText(payload.beneficiaryCount);
      const ALLOWED_CLOUD = ['tencent','volcano','self','none'];
      const cloudCredit = Array.isArray(payload.cloudCredit) ? payload.cloudCredit.filter(v => ALLOWED_CLOUD.includes(v)) : [];
      if ((userType === 'nonprofit' || userType === 'enterprise') && !orgName) return json(res, 400, { detail: '请填写机构名称' });
      if (userType === 'individual' && !purpose) return json(res, 400, { detail: '请填写使用用途' });
      const existing = await pool.query('SELECT id FROM beta_applications WHERE lower(user_email)=lower($1) LIMIT 1', [userEmail]);
      const q = existing.rows[0]
        ? await pool.query(
          `UPDATE beta_applications
           SET user_id=$1, user_name=$2, user_type=$3, org_name=$4, purpose=$5, headcount=$6, focus_issue=$7, beneficiary_count=$8, cloud_credit=$9::jsonb, updated_at=now()
           WHERE id=$10
           RETURNING *`,
          [session.id, userName, userType, orgName || null, purpose || null, headcount || null, focusIssue || null, beneficiaryCount || null, JSON.stringify(cloudCredit), existing.rows[0].id]
        )
        : await pool.query(
          `INSERT INTO beta_applications(id, user_id, user_name, user_email, user_type, org_name, purpose, headcount, focus_issue, beneficiary_count, cloud_credit)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
           RETURNING *`,
          [crypto.randomUUID(), session.id, userName, userEmail, userType, orgName || null, purpose || null, headcount || null, focusIssue || null, beneficiaryCount || null, JSON.stringify(cloudCredit)]
        );
      return json(res, 200, mapBetaApplication(q.rows[0]));
    }

    if (url.pathname === '/api/v1/admin/beta/applications' && req.method === 'GET') {
      await requireAdmin(req);
      const q = await pool.query('SELECT * FROM beta_applications ORDER BY created_at DESC');
      return json(res, 200, q.rows.map(mapBetaApplication));
    }

    const betaAppMatch = url.pathname.match(/^\/api\/v1\/admin\/beta\/applications\/([^/]+)$/);
    if (betaAppMatch && req.method === 'PATCH') {
      await requireAdmin(req);
      const payload = await readJsonBody(req);
      const requestedCode = normalizeBetaCode(payload.code);
      const fallbackCode = generateBetaCode();
      const markSent = Boolean(payload.sent);
      const q = await pool.query(
        `UPDATE beta_applications
         SET status='approved',
             code=COALESCE(NULLIF($1, ''), code, $2),
             updated_at=now()
         WHERE id=$3
         RETURNING *`,
        [requestedCode, fallbackCode, decodeURIComponent(betaAppMatch[1])]
      );
      if (!q.rows[0]) return json(res, 404, { detail: '申请不存在' });
      let row = q.rows[0];
      if (markSent) {
        await sendBetaInviteEmail(row);
        const sent = await pool.query(
          `UPDATE beta_applications
           SET sent_at=now(), updated_at=now()
           WHERE id=$1
           RETURNING *`,
          [row.id]
        );
        row = sent.rows[0] || row;
      }
      return json(res, 200, mapBetaApplication(row));
    }

    if (betaAppMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      await pool.query('DELETE FROM beta_applications WHERE id=$1', [decodeURIComponent(betaAppMatch[1])]);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/v1/beta/verify-code' && req.method === 'POST') {
      const payload = await readJsonBody(req);
      const result = await createDownloadTokenForCode(payload.code, payload.platform || 'mac');
      return json(res, 200, {
        ok: true,
        downloadUrl: `/api/v1/downloads/${result.token}`,
        package: result.package,
        application: result.application,
      });
    }

    if (url.pathname.startsWith('/api/admin/ai/') && req.method === 'POST') {
      const apiPath = url.pathname.replace(/^\/api\/admin\/ai/, '/api/v3');
      if (apiPath.includes('/images/')) await requireAdmin(req);
      else await requireSession(req);
      const payload = await readJsonBody(req);
      const data = await arkProxy(apiPath, payload);
      return json(res, 200, data);
    }

    if (url.pathname === '/api/admin-ai/manifest' && req.method === 'GET') {
      return json(res, 200, await readAiManifest());
    }

    if (url.pathname === '/api/admin-ai/list-articles' && req.method === 'GET') {
      await requireAdmin(req);
      const articles = await listPublishedAiArticles();
      const manifest = await readAiManifest();
      return json(res, 200, {
        articles: articles.map((article) => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt,
          topics: article.topics || [],
          publishDate: article.publish_date,
          originalCoverImage: article.cover_image || null,
          hasAiCover: Boolean(manifest[article.id]?.cover),
          aiIllustrationCount: manifest[article.id]?.illustrations?.length || 0,
        })),
        manifest,
        total: articles.length,
      });
    }

    if ((url.pathname === '/api/admin-ai/regenerate' || url.pathname === '/api/admin-ai/generate-summaries') && req.method === 'POST') {
      await requireAdmin(req);
      const payload = await readJsonBody(req);
      const taskId = `${url.pathname.includes('summaries') ? 'sum' : 'task'}_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      const task = { id: taskId, status: 'running', total: 0, done: 0, errors: 0, startedAt: Date.now(), log: [] };
      adminAiTasks.set(taskId, task);
      runAdminAiTask(taskId, payload.ids || [], Boolean(payload.force)).catch((error) => {
        task.status = 'failed';
        task.log.push(error?.message || String(error));
        task.finishedAt = Date.now();
      });
      return json(res, 200, { taskId });
    }

    const adminAiTaskMatch = url.pathname.match(/^\/api\/admin-ai\/task\/([^/]+)$/);
    if (adminAiTaskMatch && req.method === 'GET') {
      await requireAdmin(req);
      const task = adminAiTasks.get(decodeURIComponent(adminAiTaskMatch[1]));
      if (!task) return json(res, 404, { error: 'task not found' });
      return json(res, 200, task);
    }

    const adminAiCancelMatch = url.pathname.match(/^\/api\/admin-ai\/cancel\/([^/]+)$/);
    if (adminAiCancelMatch && req.method === 'POST') {
      await requireAdmin(req);
      const task = adminAiTasks.get(decodeURIComponent(adminAiCancelMatch[1]));
      if (!task) return json(res, 404, { error: 'task not found' });
      if (task.status === 'running') task.status = 'cancelled';
      return json(res, 200, { ok: true, status: task.status });
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return json(res, 404, { ok: false, error: 'not found' });
    }

    const body = req.method === 'POST' ? await readJsonBody(req) : {};

    if (url.pathname === '/api/auth/send-code' && req.method === 'POST') {
      const channel = normalizeChannel(body.channel);
      const scene = normalizeScene(body.scene);
      if (!channel || !scene) {
        return json(res, 400, { ok: false, error: '参数错误(channel/scene)' });
      }
      const target = normalizeTarget(channel, body.target);
      if (!target) {
        return json(res, 400, { ok: false, error: channel === 'phone' ? '手机号格式错误' : '邮箱格式错误' });
      }
      const exists = await findUserByChannel(pool, channel, target);
      if (scene === 'register' && exists) {
        return json(res, 400, { ok: false, error: '账号已存在，请直接登录' });
      }
      if (scene === 'reset' && !exists) {
        return json(res, 400, { ok: false, error: '账号不存在，请先注册' });
      }
      if (scene === 'bind') {
        const sessionRow = await requireSession(req);
        const currentTarget = channel === 'phone'
          ? (sessionRow.phone || null)
          : (isPhoneLocalEmail(sessionRow.email) ? null : sessionRow.email || null);
        if (currentTarget === target) {
          return json(res, 400, { ok: false, error: '该联系方式已绑定当前账号' });
        }
        if (exists && exists.id !== sessionRow.id) {
          return json(res, 400, { ok: false, error: '该联系方式已被其他账号使用' });
        }
      }
      if (scene === 'unbind') {
        const sessionRow = await requireSession(req);
        const currentTarget = channel === 'phone'
          ? (sessionRow.phone || null)
          : (isPhoneLocalEmail(sessionRow.email) ? null : sessionRow.email || null);
        if (!currentTarget) {
          return json(res, 400, { ok: false, error: channel === 'phone' ? '当前账号未绑定手机号' : '当前账号未绑定邮箱' });
        }
        if (currentTarget !== target) {
          return json(res, 400, { ok: false, error: '请对当前已绑定的联系方式进行解绑验证' });
        }
      }
      if (scene === 'deactivate') {
        const sessionRow = await requireSession(req);
        const currentTarget = channel === 'phone'
          ? (sessionRow.phone || null)
          : (isPhoneLocalEmail(sessionRow.email) ? null : sessionRow.email || null);
        if (!currentTarget) {
          return json(res, 400, { ok: false, error: channel === 'phone' ? '当前账号未绑定手机号' : '当前账号未绑定邮箱' });
        }
        if (currentTarget !== target) {
          return json(res, 400, { ok: false, error: '请对当前已绑定的联系方式进行注销验证' });
        }
      }
      const code = await createCode(pool, channel, target, scene, req.socket.remoteAddress || '');
      if (channel === 'phone') await sendSmsCode(target, scene, code);
      else await sendEmailCode(target, scene, code);
      return json(res, 200, { ok: true, message: '验证码发送成功' });
    }

    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      const channel = normalizeChannel(body.channel);
      const target = normalizeTarget(channel, body.target);
      const code = String(body.code || '').trim();
      const password = String(body.password || '');
      const nickname = String(body.nickname || '').trim();
      const inviteCode = normalizeInviteCode(body.inviteCode);
      if (!channel || !target || !code) {
        return json(res, 400, { ok: false, error: '参数不完整' });
      }
      if (password.length < 8) {
        return json(res, 400, { ok: false, error: '密码至少8位' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existed = await findUserByChannel(client, channel, target);
        if (existed) {
          throw new Error('账号已存在');
        }

        if (inviteCode) {
          await getInviteCodeForUse(client, inviteCode);
        }

        await consumeValidCode(client, channel, target, 'register', code);

        const id = crypto.randomUUID();
        const adminRole = channel === 'email' && DEFAULT_ADMIN_EMAILS.has(target.toLowerCase()) ? 'admin' : null;
        await client.query(
          `INSERT INTO auth_users(id, phone, email, nickname, password_hash, admin_role)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            id,
            channel === 'phone' ? target : null,
            channel === 'email' ? target : null,
            nickname || null,
            hashPassword(password),
            adminRole,
          ]
        );

        let userRow = await findUserById(client, id);
        if (inviteCode) {
          const result = await applyInviteCodeToUser(client, inviteCode, userRow);
          userRow = result.user;
        }

        await client.query('COMMIT');
        const session = await createSession(id, req);
        return json(res, 200, {
          ok: true,
          data: {
            user: mapUser(userRow),
            token: session.token,
            expiresAt: session.expiresAt,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const channel = normalizeChannel(body.channel);
      const target = normalizeTarget(channel, body.target);
      const password = String(body.password || '');
      if (!channel || !target || !password) {
        return json(res, 400, { ok: false, error: '参数不完整' });
      }
      const row = await findUserByChannel(pool, channel, target);
      if (!row) {
        return json(res, 400, { ok: false, error: '账号或密码错误' });
      }
      if (row.status !== 'active') {
        return json(res, 403, { ok: false, error: '账号不可用，请联系管理员' });
      }
      if (!verifyPassword(password, row.password_hash)) {
        return json(res, 400, { ok: false, error: '账号或密码错误' });
      }
      await pool.query(
        'UPDATE auth_users SET last_login_at=now(), login_count=COALESCE(login_count, 0) + 1 WHERE id=$1',
        [row.id]
      );
      const updated = await findUserById(pool, row.id);
      const session = await createSession(row.id, req);
      return json(res, 200, {
        ok: true,
        data: {
          user: mapUser(updated),
          token: session.token,
          expiresAt: session.expiresAt,
        },
      });
    }

    if (url.pathname === '/api/auth/reset-password' && req.method === 'POST') {
      const channel = normalizeChannel(body.channel);
      const target = normalizeTarget(channel, body.target);
      const code = String(body.code || '').trim();
      const newPassword = String(body.newPassword || '');
      if (!channel || !target || !code) {
        return json(res, 400, { ok: false, error: '参数不完整' });
      }
      if (newPassword.length < 8) {
        return json(res, 400, { ok: false, error: '密码至少8位' });
      }
      const row = await findUserByChannel(pool, channel, target);
      if (!row) {
        return json(res, 400, { ok: false, error: '账号不存在' });
      }
      await consumeValidCode(pool, channel, target, 'reset', code);
      await pool.query('UPDATE auth_users SET password_hash=$1 WHERE id=$2', [hashPassword(newPassword), row.id]);
      return json(res, 200, { ok: true, message: '密码重置成功' });
    }

    if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
      const sessionRow = await requireSession(req);
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 8) {
        return json(res, 400, { ok: false, error: '密码至少8位' });
      }

      await pool.query('UPDATE auth_users SET password_hash=$2 WHERE id=$1', [sessionRow.id, hashPassword(newPassword)]);
      const updated = await findUserById(pool, sessionRow.id);
      return json(res, 200, {
        ok: true,
        message: '密码修改成功',
        data: { user: mapUser(updated) },
      });
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = parseBearerToken(req);
      if (token) {
        await revokeSessionByToken(token);
      }
      return json(res, 200, { ok: true, message: '已退出登录' });
    }

    if (url.pathname === '/api/auth/consult-requests' && req.method === 'POST') {
      try {
        const saved = await createConsultRequest(body);
        return json(res, 200, { ok: true, data: saved, message: '咨询申请已提交，我们会尽快与您联系。' });
      } catch (error) {
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (url.pathname === '/api/auth/profile' && req.method === 'POST') {
      const sessionRow = await requireSession(req);
      const nickname = String(body.nickname || '').trim();
      const avatarUrlRaw = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
      const avatarUrl = avatarUrlRaw || null;

      if (!nickname) {
        return json(res, 400, { ok: false, error: '昵称不能为空' });
      }
      if (nickname.length > 24) {
        return json(res, 400, { ok: false, error: '昵称不能超过24个字' });
      }
      if (
        avatarUrl
        && !avatarUrl.startsWith('data:image/')
        && !/^https?:\/\//i.test(avatarUrl)
      ) {
        return json(res, 400, { ok: false, error: '头像格式不支持' });
      }
      if (avatarUrl && avatarUrl.length > 2_500_000) {
        return json(res, 400, { ok: false, error: '头像图片过大，请压缩后重试' });
      }

      await pool.query(
        `UPDATE auth_users
         SET nickname = $2,
             avatar = $3
         WHERE id = $1`,
        [sessionRow.id, nickname, avatarUrl]
      );
      const updated = await findUserById(pool, sessionRow.id);
      return json(res, 200, {
        ok: true,
        message: '个人资料已保存',
        data: { user: mapUser(updated) },
      });
    }

    if (url.pathname === '/api/auth/strategy/learning-resources/upsert' && req.method === 'POST') {
      await requireAdmin(req);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const saved = await upsertStrategyLearningResource(client, body);
        await client.query('COMMIT');
        return json(res, 200, { ok: true, data: saved, message: '学习资源已保存' });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    const strategySnapshotWriteMatch = url.pathname.match(/^\/api\/auth\/strategy\/projects\/([^/]+)\/snapshot$/);
    if (strategySnapshotWriteMatch && req.method === 'POST') {
      await requireAdmin(req);
      const projectId = decodeURIComponent(strategySnapshotWriteMatch[1]);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const snapshot = await replaceStrategyProjectSnapshot(client, projectId, body, {});
        await client.query('COMMIT');
        return json(res, 200, { ok: true, data: snapshot, message: '战略陪伴内容已保存到云端' });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    const strategyPublishMatch = url.pathname.match(/^\/api\/auth\/strategy\/projects\/([^/]+)\/publish$/);
    if (strategyPublishMatch && req.method === 'POST') {
      await requireAdmin(req);
      const projectId = decodeURIComponent(strategyPublishMatch[1]);
      const publish = normalizeBool(body.publish, true);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const row = await setStrategyProjectPublished(client, projectId, publish);
        await client.query('COMMIT');
        return json(res, 200, {
          ok: true,
          data: mapStrategyProjectSummary(row),
          message: publish ? '机构战略陪伴页已发布' : '机构战略陪伴页已取消发布',
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    if (url.pathname === '/api/auth/bind-contact' && req.method === 'POST') {
      const sessionRow = await requireSession(req);
      const channel = normalizeChannel(body.channel);
      const target = normalizeTarget(channel, body.target);
      const code = String(body.code || '').trim();
      const currentPassword = String(body.currentPassword || '');

      if (!channel || !target || !code || !currentPassword) {
        return json(res, 400, { ok: false, error: '参数不完整' });
      }
      if (!verifyPassword(currentPassword, sessionRow.password_hash)) {
        return json(res, 400, { ok: false, error: '当前密码错误' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const currentUser = await findUserById(client, sessionRow.id);
        if (!currentUser) {
          throw new Error('登录状态已失效，请重新登录');
        }

        const currentTarget = channel === 'phone'
          ? (currentUser.phone || null)
          : (isPhoneLocalEmail(currentUser.email) ? null : currentUser.email || null);
        if (currentTarget === target) {
          throw new Error('该联系方式已绑定当前账号');
        }

        const existed = await findUserByChannel(client, channel, target);
        if (existed && existed.id !== currentUser.id) {
          throw new Error('该联系方式已被其他账号使用');
        }

        await consumeValidCode(client, channel, target, 'bind', code);

        if (channel === 'phone') {
          await client.query('UPDATE auth_users SET phone=$2 WHERE id=$1', [currentUser.id, target]);
        } else {
          await client.query('UPDATE auth_users SET email=$2 WHERE id=$1', [currentUser.id, target]);
        }

        await client.query('COMMIT');
        const updated = await findUserById(pool, currentUser.id);
        return json(res, 200, {
          ok: true,
          message: currentTarget ? '绑定方式已更新' : '绑定成功',
          data: { user: mapUser(updated) },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    if (url.pathname === '/api/auth/unbind-contact' && req.method === 'POST') {
      const sessionRow = await requireSession(req);
      const channel = normalizeChannel(body.channel);
      const code = String(body.code || '').trim();
      const currentPassword = String(body.currentPassword || '');

      if (!channel || !code || !currentPassword) {
        return json(res, 400, { ok: false, error: '参数不完整' });
      }
      if (!verifyPassword(currentPassword, sessionRow.password_hash)) {
        return json(res, 400, { ok: false, error: '当前密码错误' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const currentUser = await findUserById(client, sessionRow.id);
        if (!currentUser) {
          throw new Error('登录状态已失效，请重新登录');
        }

        const currentTarget = channel === 'phone'
          ? (currentUser.phone || null)
          : (isPhoneLocalEmail(currentUser.email) ? null : currentUser.email || null);
        if (!currentTarget) {
          throw new Error(channel === 'phone' ? '当前账号未绑定手机号' : '当前账号未绑定邮箱');
        }

        const remainingEmail = channel === 'email' ? null : (isPhoneLocalEmail(currentUser.email) ? null : currentUser.email || null);
        const remainingPhone = channel === 'phone' ? null : (currentUser.phone || null);
        const deactivated = !remainingEmail && !remainingPhone;

        await consumeValidCode(client, channel, currentTarget, 'unbind', code);

        if (deactivated) {
          await client.query(
            `UPDATE auth_users
             SET phone = NULL,
                 email = NULL,
                 status = 'deactivated',
                 deactivated_at = now()
             WHERE id = $1`,
            [currentUser.id]
          );
        } else if (channel === 'phone') {
          await client.query(
            `UPDATE auth_users
             SET phone = NULL
             WHERE id = $1`,
            [currentUser.id]
          );
        } else {
          await client.query(
            `UPDATE auth_users
             SET email = NULL
             WHERE id = $1`,
            [currentUser.id]
          );
        }

        await client.query('COMMIT');

        if (deactivated) {
          await revokeSessionsByUserId(currentUser.id);
          return json(res, 200, {
            ok: true,
            message: '最后一种绑定方式已解除，账号已注销',
            data: { deactivated: true },
          });
        }

        const updated = await findUserById(pool, currentUser.id);
        return json(res, 200, {
          ok: true,
          message: channel === 'phone' ? '手机号已解除绑定' : '邮箱已解除绑定',
          data: { user: mapUser(updated), deactivated: false },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    if (url.pathname === '/api/auth/deactivate-account' && req.method === 'POST') {
      const sessionRow = await requireSession(req);
      const channel = normalizeChannel(body.channel);
      const code = String(body.code || '').trim();
      const currentPassword = String(body.currentPassword || '');

      if (!channel || !code || !currentPassword) {
        return json(res, 400, { ok: false, error: '参数不完整' });
      }
      if (!verifyPassword(currentPassword, sessionRow.password_hash)) {
        return json(res, 400, { ok: false, error: '当前密码错误' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const currentUser = await findUserById(client, sessionRow.id);
        if (!currentUser) {
          throw new Error('登录状态已失效，请重新登录');
        }

        const currentTarget = channel === 'phone'
          ? (currentUser.phone || null)
          : (isPhoneLocalEmail(currentUser.email) ? null : currentUser.email || null);
        if (!currentTarget) {
          throw new Error(channel === 'phone' ? '当前账号未绑定手机号' : '当前账号未绑定邮箱');
        }

        await consumeValidCode(client, channel, currentTarget, 'deactivate', code);

        await client.query(
          `UPDATE auth_users
           SET phone = NULL,
               email = NULL,
               status = 'deactivated',
               deactivated_at = now()
           WHERE id = $1`,
          [currentUser.id]
        );

        await client.query('COMMIT');
        await revokeSessionsByUserId(currentUser.id);
        return json(res, 200, {
          ok: true,
          message: '账号已注销',
          data: { deactivated: true },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    if (url.pathname === '/api/auth/invite-codes' && req.method === 'POST') {
      const admin = await requireAdmin(req);
      const grantKind = normalizeInviteGrantKind(body.grantKind);
      const type = String(body.type || '');
      const maxUses = Math.max(1, Number(body.maxUses || 1));
      const projectId = grantKind === 'strategy_project' ? safeText(body.projectId) : '';
      const bonusDays = type === '30days' ? 30 : type === '365days' ? 365 : type === '1095days' ? 1095 : 0;
      let projectNameSnapshot = null;

      if (grantKind === 'strategy_project') {
        if (!projectId) {
          return json(res, 400, { ok: false, error: '请选择已发布机构项目' });
        }
        const projectRow = await findStrategyProjectById(pool, projectId);
        if (!projectRow || !projectRow.is_active) {
          return json(res, 400, { ok: false, error: '机构项目不存在' });
        }
        if (!projectRow.is_published) {
          return json(res, 400, { ok: false, error: '仅已发布机构可生成战略邀请码' });
        }
        projectNameSnapshot = projectRow.client_name;
      } else if (!bonusDays) {
        return json(res, 400, { ok: false, error: '无效的邀请码类型' });
      }

      const code = crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 12);
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO invite_codes(
           id, code, type, grant_kind, bonus_days, project_id, project_name_snapshot, max_uses,
           used_count, status, created_by, used_by
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,'valid',$9,'[]'::jsonb)`,
        [
          id,
          code,
          grantKind === 'strategy_project' ? 'strategy_project' : type,
          grantKind,
          grantKind === 'strategy_project' ? 0 : bonusDays,
          projectId || null,
          projectNameSnapshot,
          maxUses,
          admin.email || admin.nickname || 'admin',
        ]
      );
      const q = await pool.query(
        `SELECT id, code, type, grant_kind, bonus_days, project_id, project_name_snapshot,
                max_uses, used_count, status, created_by, created_at, used_by
         FROM invite_codes
         WHERE id=$1`,
        [id]
      );
      return json(res, 200, { ok: true, data: mapInviteCode(q.rows[0]) });
    }

    if (url.pathname === '/api/auth/cover-presets' && req.method === 'POST') {
      await requireAdmin(req);
      const contentType = normalizeCoverPresetContentType(body.contentType);
      const imageUrl = normalizePublicLink(body.imageUrl) || safeText(body.imageUrl);
      if (!contentType || !imageUrl) {
        return json(res, 400, { ok: false, error: '封面参数不完整' });
      }
      const q = await pool.query(
        `SELECT coalesce(max(sort_order), -1) + 1 AS next_sort
         FROM content_cover_presets
         WHERE content_type=$1`,
        [contentType]
      );
      const nextSort = Number(q.rows[0]?.next_sort || 0);
      const id = `preset_${crypto.randomUUID()}`;
      await pool.query(
        `INSERT INTO content_cover_presets(id, content_type, title, image_url, source_type, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,now(),now())`,
        [
          id,
          contentType,
          safeText(body.title, `${contentType === 'insight' ? '文章封面' : '方法论封面'} ${String(nextSort + 1).padStart(2, '0')}`),
          imageUrl,
          body.sourceType === 'upload' ? 'upload' : 'seed',
          nextSort,
        ]
      );
      const created = await pool.query(
        'SELECT id, content_type, title, image_url, source_type, sort_order, created_at, updated_at FROM content_cover_presets WHERE id=$1 LIMIT 1',
        [id]
      );
      return json(res, 200, { ok: true, data: mapCoverPreset(created.rows[0]) });
    }

    if (url.pathname === '/api/auth/invite-codes/redeem' && req.method === 'POST') {
      const userRow = await requireSession(req);
      const code = normalizeInviteCode(body.code);
      if (!code) {
        return json(res, 400, { ok: false, error: '请输入邀请码' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const currentUser = await findUserById(client, userRow.id);
        const result = await applyInviteCodeToUser(client, code, currentUser);
        await client.query('COMMIT');
        const message = result.user?.strategy_project_id
          ? '邀请码兑换成功，已绑定机构战略陪伴并开通付费资格'
          : '邀请码兑换成功，付费资格已更新';
        return json(res, 200, {
          ok: true,
          message,
          data: { user: mapUser(result.user) },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    }

    const coverPresetDeleteMatch = url.pathname.match(/^\/api\/auth\/cover-presets\/([^/]+)$/);
    if (coverPresetDeleteMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      const id = decodeURIComponent(coverPresetDeleteMatch[1]);
      return json(res, 200, { ok: true, data: { deleted: await deleteCoverPresetById(pool, id) } });
    }

    if (url.pathname === '/api/auth/content-engagement/like' && req.method === 'POST') {
      const row = await requireSession(req);
      const contentType = normalizeContentType(body.contentType);
      const contentId = safeText(body.contentId);
      if (!contentType || !contentId) {
        return json(res, 400, { ok: false, error: '内容参数不完整' });
      }
      await toggleContentReaction(pool, row.id, contentType, contentId, 'like');
      return json(res, 200, { ok: true, data: await getContentEngagementState(pool, req, contentType, contentId) });
    }

    if (url.pathname === '/api/auth/content-engagement/favorite' && req.method === 'POST') {
      const row = await requireSession(req);
      const contentType = normalizeContentType(body.contentType);
      const contentId = safeText(body.contentId);
      if (!contentType || !contentId) {
        return json(res, 400, { ok: false, error: '内容参数不完整' });
      }
      await toggleContentReaction(pool, row.id, contentType, contentId, 'favorite');
      return json(res, 200, { ok: true, data: await getContentEngagementState(pool, req, contentType, contentId) });
    }

    if (url.pathname === '/api/auth/comments' && req.method === 'POST') {
      const contentId = String(body.contentId || '').trim();
      const contentType = String(body.contentType || '').trim();
      const contentTitle = String(body.contentTitle || '').trim();
      const text = String(body.text || '').trim();
      if (!contentId || !contentType || !text) {
        return json(res, 400, { ok: false, error: '评论参数不完整' });
      }

      const sessionRow = await getOptionalSession(req);
      const userId = sessionRow?.id || String(body.userId || 'guest');
      const userName = sessionRow?.nickname || sessionRow?.email || String(body.userName || '访客');
      const userAvatar = sessionRow?.avatar || String(body.userAvatar || '').trim() || null;
      const id = `comment_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      await pool.query(
        `INSERT INTO comments(id, content_id, content_type, content_title, user_id, user_name, user_avatar, text, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',now(),now())`,
        [id, contentId, contentType, contentTitle || '', userId, userName, userAvatar, text]
      );

      if (sessionRow?.id) {
        await pool.query(
          'UPDATE auth_users SET comments_count = GREATEST(COALESCE(comments_count, 0) + 1, 0) WHERE id=$1',
          [sessionRow.id]
        );
      }

      const q = await pool.query(
        'SELECT id, content_id, content_type, content_title, user_id, user_name, user_avatar, text, status, reply, created_at, updated_at FROM comments WHERE id=$1',
        [id]
      );
      return json(res, 200, {
        ok: true,
        message: '评论已提交，待管理员审核后显示',
        data: mapComment(q.rows[0]),
      });
    }

    if (url.pathname === '/api/auth/payment/orders' && req.method === 'POST') {
      const sessionRow = await requireSession(req);
      const planId = normalizePlanId(String(body.planId || ''));
      if (!planId) {
        return json(res, 400, { ok: false, error: '无效的会员套餐' });
      }
      try {
        const { order, readiness, h5Url, timeExpire } = await createPaymentOrderRow(sessionRow, {
          planId,
          buyerName: body.buyerName,
          buyerOrg: body.buyerOrg,
          buyerPhone: body.buyerPhone,
          buyerEmail: body.buyerEmail,
          buyerNote: body.buyerNote,
        }, req);
        return json(res, 200, {
          ok: true,
          message: '订单已创建，正在跳转微信支付。',
          data: {
            order,
            readiness,
            h5Url,
            timeExpire,
          },
        });
      } catch (error) {
        const statusCode = Number(error?.statusCode || 500);
        if (statusCode === 503) {
          return json(res, 503, {
            ok: false,
            error: error.message || '支付配置未完成',
            data: { readiness: error.readiness || getPaymentReadiness() },
          });
        }
        return json(res, statusCode, { ok: false, error: paymentProviderError(error, '创建支付订单失败') });
      }
    }

    const inviteDisableMatch = url.pathname.match(/^\/api\/auth\/invite-codes\/([^/]+)\/disable$/);
    if (inviteDisableMatch && req.method === 'POST') {
      await requireAdmin(req);
      const code = decodeURIComponent(inviteDisableMatch[1]);
      await pool.query('UPDATE invite_codes SET status=\'disabled\' WHERE code=$1', [code]);
      return json(res, 200, { ok: true, message: '邀请码已禁用' });
    }

    const commentStatusMatch = url.pathname.match(/^\/api\/auth\/comments\/([^/]+)\/status$/);
    if (commentStatusMatch && req.method === 'POST') {
      await requireAdmin(req);
      const commentId = decodeURIComponent(commentStatusMatch[1]);
      const status = normalizeCommentStatus(body.status);
      if (!status || status === 'pending') {
        return json(res, 400, { ok: false, error: '评论状态无效' });
      }
      await pool.query('UPDATE comments SET status=$2, updated_at=now() WHERE id=$1', [commentId, status]);
      return json(res, 200, { ok: true, message: status === 'approved' ? '评论已显示' : '评论已隐藏' });
    }

    const commentReplyMatch = url.pathname.match(/^\/api\/auth\/comments\/([^/]+)\/reply$/);
    if (commentReplyMatch && req.method === 'POST') {
      await requireAdmin(req);
      const commentId = decodeURIComponent(commentReplyMatch[1]);
      const reply = String(body.reply || '');
      await pool.query('UPDATE comments SET reply=$2, updated_at=now() WHERE id=$1', [commentId, reply]);
      return json(res, 200, { ok: true, message: reply.trim() ? '回复已保存' : '回复已撤回' });
    }

    const adminUserStatusMatch = url.pathname.match(/^\/api\/auth\/admin\/users\/([^/]+)\/status$/);
    if (adminUserStatusMatch && req.method === 'POST') {
      await requireAdmin(req);
      const userId = decodeURIComponent(adminUserStatusMatch[1]);
      const status = normalizeUserStatus(body.status);
      if (!status) {
        return json(res, 400, { ok: false, error: '账号状态无效' });
      }
      await pool.query('UPDATE auth_users SET status=$2 WHERE id=$1', [userId, status]);
      const updated = await findUserById(pool, userId);
      return json(res, 200, { ok: true, message: status === 'active' ? '账号已启用' : '账号已禁用', data: { user: mapUser(updated) } });
    }

    const adminUserPaidMatch = url.pathname.match(/^\/api\/auth\/admin\/users\/([^/]+)\/paid\/set$/);
    if (adminUserPaidMatch && req.method === 'POST') {
      await requireAdmin(req);
      const userId = decodeURIComponent(adminUserPaidMatch[1]);
      const enabled = Boolean(body.enabled);
      const source = normalizePaidSource(body.source) || 'manual';
      const note = body.note ? String(body.note).trim() : null;
      if (enabled) {
        await pool.query(
          `UPDATE auth_users
           SET member_type='gold',
               paid_source=$2,
               paid_started_at=COALESCE(paid_started_at, now()),
               paid_note=COALESCE($3, paid_note)
           WHERE id=$1`,
          [userId, source, note]
        );
      } else {
        await pool.query(
          `UPDATE auth_users
           SET member_type='regular',
               invitation_code=NULL,
               invited_by=NULL,
               paid_source=NULL,
               paid_started_at=NULL,
               paid_expires_at=NULL,
               paid_note=NULL,
               strategy_project_id=NULL,
               strategy_bound_at=NULL,
               strategy_access_source=NULL
           WHERE id=$1`,
          [userId]
        );
      }
      const updated = await findUserById(pool, userId);
      return json(res, 200, {
        ok: true,
        message: enabled ? '已开通付费资格' : '已转为普通会员',
        data: { user: mapUser(updated) },
      });
    }

    const adminUserPaidExtendMatch = url.pathname.match(/^\/api\/auth\/admin\/users\/([^/]+)\/paid\/extend$/);
    if (adminUserPaidExtendMatch && req.method === 'POST') {
      await requireAdmin(req);
      const userId = decodeURIComponent(adminUserPaidExtendMatch[1]);
      const days = Math.max(1, Math.min(Number(body.days || 30), 3650));
      const row = await findUserById(pool, userId);
      if (!row) {
        return json(res, 404, { ok: false, error: '用户不存在' });
      }
      const baseDate = row.paid_expires_at && new Date(row.paid_expires_at).getTime() > Date.now()
        ? new Date(row.paid_expires_at)
        : new Date();
      const nextExpire = new Date(baseDate.getTime() + days * 24 * 3600 * 1000).toISOString();
      await pool.query(
        `UPDATE auth_users
         SET member_type='gold',
             paid_started_at=COALESCE(paid_started_at, now()),
             paid_source=COALESCE(paid_source, 'manual'),
             paid_expires_at=$2
         WHERE id=$1`,
        [userId, nextExpire]
      );
      const updated = await findUserById(pool, userId);
      return json(res, 200, {
        ok: true,
        message: `已顺延 ${days} 天付费资格`,
        data: { user: mapUser(updated) },
      });
    }

    const inviteDeleteMatch = url.pathname.match(/^\/api\/auth\/invite-codes\/([^/]+)$/);
    if (inviteDeleteMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      const code = decodeURIComponent(inviteDeleteMatch[1]);
      await pool.query('DELETE FROM invite_codes WHERE code=$1', [code]);
      return json(res, 200, { ok: true, message: '邀请码已删除' });
    }

    const learningDeleteMatch = url.pathname.match(/^\/api\/auth\/strategy\/learning-resources\/([^/]+)$/);
    if (learningDeleteMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      const resourceId = decodeURIComponent(learningDeleteMatch[1]);
      await pool.query('DELETE FROM project_learning_resources WHERE id=$1', [resourceId]);
      return json(res, 200, { ok: true, message: '学习资源已删除' });
    }

    const commentDeleteMatch = url.pathname.match(/^\/api\/auth\/comments\/([^/]+)$/);
    if (commentDeleteMatch && req.method === 'DELETE') {
      await requireAdmin(req);
      const commentId = decodeURIComponent(commentDeleteMatch[1]);
      const q = await pool.query('SELECT user_id FROM comments WHERE id=$1 LIMIT 1', [commentId]);
      await pool.query('DELETE FROM comments WHERE id=$1', [commentId]);
      const userId = q.rows[0]?.user_id;
      if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
        await pool.query(
          'UPDATE auth_users SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id=$1',
          [userId]
        );
      }
      return json(res, 200, { ok: true, message: '评论已删除' });
    }

    return json(res, 404, { ok: false, error: 'not found' });
  } catch (error) {
    return json(res, httpStatusForError(error), { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

await ensureSchema();
await seedDefaultStrategyProjects();
server.listen(PORT, () => console.log(`[pg-auth-api] listening on http://127.0.0.1:${PORT}`));
