import http from 'node:http';
import crypto from 'node:crypto';
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
  `);

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
  await client.SendSms({
    SmsSdkAppId: smsSdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code],
    PhoneNumberSet: [`+86${phone}`],
  });
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
    logoUrl: row.logo_url || '',
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at || undefined,
    status: row.status || 'active',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
  const where = [`is_active = true`];
  if (normalizedScope !== 'admin') {
    where.push(`is_published = true`);
  }
  const sql = `
    SELECT *
    FROM client_projects
    WHERE ${where.join(' AND ')}
    ORDER BY sort_order ASC NULLS LAST, created_at ASC
  `;
  const q = await pool.query(sql, params);
  return q.rows.map(mapStrategyProjectSummary);
}

async function findStrategyProjectById(db, projectId) {
  const q = await db.query('SELECT * FROM client_projects WHERE id=$1 LIMIT 1', [projectId]);
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
