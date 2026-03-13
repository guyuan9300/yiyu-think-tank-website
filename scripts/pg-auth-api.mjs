import http from 'node:http';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import tencentcloud from 'tencentcloud-sdk-nodejs';

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
    bonusDays: Number(row.bonus_days || 0),
    maxUses: Number(row.max_uses || 0),
    usedCount: Number(row.used_count || 0),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    usedBy: Array.isArray(row.used_by) ? row.used_by : [],
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
      bonus_days INT NOT NULL DEFAULT 0,
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
      ADD COLUMN IF NOT EXISTS login_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
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
    `SELECT s.*, u.*
     FROM auth_sessions s
     JOIN auth_users u ON u.id = s.user_id
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

  const now = new Date();
  const currentExpire = userRow.paid_expires_at ? new Date(userRow.paid_expires_at) : null;
  const baseDate = currentExpire && currentExpire.getTime() > Date.now() ? currentExpire : now;
  const nextExpire = inviteRow.bonus_days > 0
    ? new Date(baseDate.getTime() + inviteRow.bonus_days * 24 * 3600 * 1000)
    : null;
  const nextUsedCount = Number(inviteRow.used_count || 0) + 1;
  const nextStatus = nextUsedCount >= Number(inviteRow.max_uses || 0) ? 'redeemed' : 'valid';
  const nextUsedBy = [...usedBy, userRow.id];

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
  const q = await pool.query('SELECT * FROM auth_users ORDER BY created_at DESC');
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

    if (url.pathname === '/api/auth/invite-codes' && req.method === 'GET') {
      await requireAdmin(req);
      const q = await pool.query(
        'SELECT id, code, type, bonus_days, max_uses, used_count, status, created_by, created_at, used_by FROM invite_codes ORDER BY created_at DESC'
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
      await requireAdmin(req);
      const type = String(body.type || '');
      const maxUses = Math.max(1, Number(body.maxUses || 1));
      const bonusDays = type === '30days' ? 30 : type === '365days' ? 365 : type === '1095days' ? 1095 : 0;
      if (!bonusDays) {
        return json(res, 400, { ok: false, error: '无效的邀请码类型' });
      }
      const code = crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 12);
      const id = crypto.randomUUID();
      const admin = await requireAdmin(req);
      await pool.query(
        `INSERT INTO invite_codes(id, code, type, bonus_days, max_uses, used_count, status, created_by, used_by)
         VALUES ($1,$2,$3,$4,$5,0,'valid',$6,'[]'::jsonb)`,
        [id, code, type, bonusDays, maxUses, admin.email || admin.nickname || 'admin']
      );
      const q = await pool.query(
        'SELECT id, code, type, bonus_days, max_uses, used_count, status, created_by, created_at, used_by FROM invite_codes WHERE id=$1',
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
        return json(res, 200, {
          ok: true,
          message: '邀请码兑换成功，付费资格已更新',
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
               paid_note=NULL
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
server.listen(PORT, () => console.log(`[pg-auth-api] listening on http://127.0.0.1:${PORT}`));
