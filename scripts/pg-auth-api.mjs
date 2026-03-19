import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import tencentcloud from 'tencentcloud-sdk-nodejs';
import { DEFAULT_STRATEGY_PROJECTS } from './strategy-companion-seeds.mjs';

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
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PAYMENT_PLANS = {
  monthly: { id: 'monthly', name: '月卡', amountFen: 9900, currency: 'CNY', durationDays: 30 },
  yearly: { id: 'yearly', name: '年卡', amountFen: 99900, currency: 'CNY', durationDays: 365 },
  lifetime: { id: 'lifetime', name: '终身会员', amountFen: 299900, currency: 'CNY', durationDays: null },
};

const PAYMENT_PREP_CHECKS = [
  { env: 'WECHAT_PAY_MCHID', label: '商户号' },
  { env: 'WECHAT_PAY_APPID', label: 'AppID' },
  { env: 'WECHAT_PAY_MCH_SERIAL_NO', label: '商户证书序列号' },
  { env: 'WECHAT_PAY_PRIVATE_KEY', label: '商户私钥' },
  { env: 'WECHAT_PAY_NOTIFY_URL', label: '支付结果通知地址' },
  { env: 'WECHAT_PAY_H5_DOMAIN', label: 'H5 支付域名' },
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
const SITE_PUBLIC_ROOT = process.env.YIYU_SITE_ROOT || '/var/www/yiyu-site';
const ADMIN_UPLOAD_ROOT = process.env.YIYU_UPLOAD_ROOT || '/var/www/yiyu-site/uploads';
const ARK_BASE_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com').replace(/\/$/, '');
const ARK_MODEL = process.env.ARK_MODEL || 'doubao-seed-2-0-lite-260215';
const AI_PREFILL_TOPIC_OPTIONS = ['战略', '业务设计', '组织', 'AI 技术'];
const execFileAsync = promisify(execFile);
let ocrCapabilityPromise = null;

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

async function callArkChat(messages) {
  if (!isArkReady()) {
    throw new Error('未配置火山方舟模型，请先完成后端密钥配置');
  }

  const response = await fetch(`${ARK_BASE_URL}/api/v3/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: ARK_MODEL,
      reasoning_effort: 'low',
      temperature: 0.2,
      max_tokens: 600,
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
    slug: 'blue-letter',
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
    slug: 'vision-capital',
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
    slug: 'beike-foundation',
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
    slug: 'rici-foundation',
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
    slug: 'tianzige',
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
    slug: 'abc-consulting',
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
    slug: 'lithium-sodium-krypton-strontium',
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
    slug: 'china-rural-foundation',
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
    slug: 'nio',
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

function normalizeCoverPresetContentType(input) {
  return input === 'methodology' ? 'methodology' : input === 'insight' ? 'insight' : null;
}

function normalizeCaseShowcaseScope(input) {
  return input === 'admin' ? 'admin' : 'published';
}

function toCaseShowcaseSlug(input) {
  return toProjectSlug(input).replace(/^project-/, 'case-');
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
    memberTypeTarget: row.member_type_target || 'gold',
    channel: row.channel || 'wechat_h5',
    providerName: row.provider_name || 'wechatpay',
    status: row.status,
    note: row.note || undefined,
    expiresAt: row.expires_at || undefined,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPaymentReadiness() {
  const items = PAYMENT_PREP_CHECKS.map((item) => ({
    key: item.env,
    label: item.label,
    configured: Boolean(String(process.env[item.env] || '').trim()),
  }));
  const enabled = items.every((item) => item.configured);
  return {
    provider: 'wechatpay',
    channel: 'wechat_h5',
    mode: 'prep_only',
    enabled,
    items,
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || undefined,
    h5Domain: process.env.WECHAT_PAY_H5_DOMAIN || undefined,
  };
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
      member_type_target TEXT NOT NULL DEFAULT 'gold',
      channel TEXT NOT NULL DEFAULT 'wechat_h5',
      provider_name TEXT NOT NULL DEFAULT 'wechatpay',
      status TEXT NOT NULL DEFAULT 'awaiting_configuration',
      note TEXT,
      expires_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      provider_order_id TEXT,
      provider_payload JSONB,
      notify_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_content_status_created ON comments(content_id, content_type, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON payment_orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created ON payment_orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_case_showcases_publish_sort ON case_showcases(is_published, sort_order, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_case_showcases_slug ON case_showcases(slug);
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

async function createPaymentOrderRow(userRow, planId) {
  const plan = PAYMENT_PLANS[planId];
  if (!plan) throw new Error('无效的会员套餐');
  const readiness = getPaymentReadiness();
  const id = crypto.randomUUID();
  const orderNo = `YY${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const status = readiness.enabled ? 'awaiting_provider_integration' : 'awaiting_configuration';
  const note = readiness.enabled
    ? '支付链路预埋已完成，待正式接入微信支付下单与回调。'
    : '支付通道配置未完成，订单已预创建用于后续接入验证。';
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO payment_orders(
       id, order_no, user_id, user_nickname, plan_id, plan_name, amount_fen, currency, duration_days,
       member_type_target, channel, provider_name, status, note, expires_at, provider_payload
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'gold','wechat_h5','wechatpay',$10,$11,$12,$13)`,
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
      status,
      note,
      expiresAt,
      JSON.stringify({ readiness, plan }),
    ]
  );

  const q = await pool.query('SELECT * FROM payment_orders WHERE id=$1 LIMIT 1', [id]);
  return { order: mapPaymentOrder(q.rows[0]), readiness };
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

function mapCaseShowcase(row) {
  return {
    id: row.id,
    slug: row.slug || toCaseShowcaseSlug(row.client_name || row.title || row.id),
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
  const title = safeText(payload?.title, fallbackRow?.title || clientName);
  return {
    id: safeText(payload?.id, fallbackRow?.id || `case_${crypto.randomUUID()}`),
    slug: toCaseShowcaseSlug(payload?.slug || fallbackRow?.slug || clientName),
    clientName,
    industry: safeText(payload?.industry, fallbackRow?.industry || ''),
    title,
    subtitle: safeText(payload?.subtitle, fallbackRow?.subtitle || ''),
    tags: textArray(payload?.tags || fallbackRow?.tags || []),
    logoUrl: safeText(payload?.logoUrl, fallbackRow?.logo_url || ''),
    pptFileUrl: safeText(payload?.pptFileUrl, fallbackRow?.ppt_file_url || ''),
    pptFileName: safeText(payload?.pptFileName, fallbackRow?.ppt_file_name || ''),
    slideImages: Array.isArray(payload?.slideImages)
      ? payload.slideImages.map((item) => safeText(item)).filter(Boolean)
      : Array.isArray(fallbackRow?.slide_images)
        ? fallbackRow.slide_images.map((item) => safeText(item)).filter(Boolean)
        : [],
    isPublished: normalizeBool(payload?.isPublished, fallbackRow?.is_published || false),
    sortOrder: toPositiveInt(payload?.sortOrder, Number(fallbackRow?.sort_order || 0)),
  };
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
           count(*) FILTER (WHERE status IN ('awaiting_configuration', 'awaiting_provider_integration', 'pending'))::int AS open
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
      const { order, readiness } = await createPaymentOrderRow(sessionRow, planId);
      return json(res, 200, {
        ok: true,
        message: readiness.enabled
          ? '订单已创建，支付接口预埋已完成，待正式接入微信支付下单流程。'
          : '订单已创建，当前仅完成支付预埋，待商户参数配置完成后再拉起支付。',
        data: {
          order,
          readiness,
          paymentUrl: null,
        },
      });
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
    return json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

await ensureSchema();
await seedDefaultStrategyProjects();
server.listen(PORT, () => console.log(`[pg-auth-api] listening on http://127.0.0.1:${PORT}`));
