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
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SmsClient = tencentcloud.sms.v20210111.Client;
const SesClient = tencentcloud.ses.v20201002.Client;
let smsClient = null;
let sesClient = null;

function initSmsClient() {
  const sid = process.env.TC_SECRET_ID;
  const sk = process.env.TC_SECRET_KEY;
  if (!sid || !sk) return null;
  smsClient = new SmsClient({ credential: { secretId: sid, secretKey: sk }, region: process.env.TC_SMS_REGION || 'ap-guangzhou', profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } } });
  return smsClient;
}
function buildMailer() {
  const host = process.env.AUTH_SMTP_HOST; const user = process.env.AUTH_SMTP_USER; const pass = process.env.AUTH_SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port: Number(process.env.AUTH_SMTP_PORT || 465), secure: String(process.env.AUTH_SMTP_SECURE || 'true') === 'true', auth: { user, pass }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 });
}
function initSesClient() {
  const sid = process.env.TC_SECRET_ID; const sk = process.env.TC_SECRET_KEY;
  if (!sid || !sk) return null;
  sesClient = new SesClient({ credential: { secretId: sid, secretKey: sk }, region: process.env.TC_SES_REGION || 'ap-hongkong', profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } } });
  return sesClient;
}
const mailer = buildMailer();
function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders }); res.end(JSON.stringify(payload)); }
function readJsonBody(req) { return new Promise((resolve, reject) => { let body=''; req.on('data', c => body += c); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } }); req.on('error', reject); }); }
function normalizeChannel(input) { return input === 'phone' ? 'phone' : input === 'email' ? 'email' : null; }
function normalizeScene(input) { return input === 'register' ? 'register' : input === 'reset' ? 'reset' : null; }
function normalizeTarget(channel, target) { const t = String(target || '').trim(); if (channel === 'phone') return /^1[3-9]\d{9}$/.test(t) ? t : null; if (channel === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t.toLowerCase() : null; return null; }
function hashCode(code) { return crypto.createHash('sha256').update(code).digest('hex'); }
function generateCode() { return String(Math.floor(Math.random() * 900000) + 100000); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { const digest = crypto.scryptSync(password, salt, 64).toString('hex'); return `scrypt$${salt}$${digest}`; }
function verifyPassword(password, encoded) { const [alg, salt, digest] = String(encoded || '').split('$'); if (alg !== 'scrypt' || !salt || !digest) return false; const target = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(target, 'hex'), Buffer.from(digest, 'hex')); }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      nickname TEXT,
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
  `);
}
async function sendSmsCode(phone, scene, code) {
  const client = smsClient || initSmsClient();
  if (!client) throw new Error('短信服务未配置');
  const templateId = scene === 'register' ? process.env.TC_SMS_TEMPLATE_ID_REGISTER : process.env.TC_SMS_TEMPLATE_ID_RESET;
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
async function sendEmailCode(email, scene, code) { const from = process.env.AUTH_EMAIL_FROM; if (!from) throw new Error('未配置发件人'); const subject = scene === 'register' ? '注册验证码' : '找回密码验证码'; const action = scene === 'register' ? '注册' : '重置密码'; const minutes = Math.ceil(CODE_TTL_SECONDS / 60); const text = `您的${action}验证码是 ${code}，${minutes} 分钟内有效。如非本人操作请忽略。`; const html = `<p>您的${action}验证码是 <b style="font-size:20px">${code}</b>，${minutes} 分钟内有效。</p><p>如非本人操作请忽略。</p>`; if (mailer) { try { await mailer.sendMail({ from, to: email, subject: `【益语智库】${subject}`, text, html }); return; } catch (_) {} } const client = sesClient || initSesClient(); if (!client) throw new Error('邮件服务未配置'); const templateId = Number(scene === 'register' ? (process.env.TC_SES_TEMPLATE_ID_REGISTER || 0) : (process.env.TC_SES_TEMPLATE_ID_RESET || 0)); if (!templateId) throw new Error('未配置邮件模板ID'); await client.SendEmail({ FromEmailAddress: from, Destination: [email], Subject: `【益语智库】${subject}`, Template: { TemplateID: templateId, TemplateData: JSON.stringify({ code, expire_min: String(minutes), minutes: String(minutes) }) } }); }
async function checkSendLimit(target, scene) { const intervalRes = await pool.query(`SELECT count(*)::int AS c FROM auth_verification_codes WHERE target=$1 AND scene=$2 AND created_at > now() - ($3::text || ' second')::interval`, [target, scene, SEND_INTERVAL_SECONDS]); const dayRes = await pool.query(`SELECT count(*)::int AS c FROM auth_verification_codes WHERE target=$1 AND scene=$2 AND created_at >= date_trunc('day', now())`, [target, scene]); if ((intervalRes.rows[0]?.c || 0) > 0) throw new Error(`发送太频繁，请 ${SEND_INTERVAL_SECONDS} 秒后再试`); if ((dayRes.rows[0]?.c || 0) >= MAX_PER_TARGET_PER_DAY) throw new Error('今日发送次数已达上限'); }
async function createCode(channel, target, scene, ip) { await checkSendLimit(target, scene); const code = generateCode(); await pool.query(`INSERT INTO auth_verification_codes(id, channel, target, scene, code_hash, expires_at, request_ip) VALUES ($1,$2,$3,$4,$5, now() + ($6::text || ' second')::interval, $7)`, [crypto.randomUUID(), channel, target, scene, hashCode(code), CODE_TTL_SECONDS, ip || null]); return code; }
async function consumeValidCode(channel, target, scene, code) { const q = await pool.query(`SELECT * FROM auth_verification_codes WHERE channel=$1 AND target=$2 AND scene=$3 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`, [channel, target, scene]); const row = q.rows[0]; if (!row) throw new Error('请先获取验证码'); if (row.attempt_count >= MAX_VERIFY_RETRY) throw new Error('验证码已失效，请重新获取'); if (new Date(row.expires_at).getTime() < Date.now()) throw new Error('验证码已过期'); if (row.code_hash !== hashCode(code)) { await pool.query('UPDATE auth_verification_codes SET attempt_count=attempt_count+1 WHERE id=$1', [row.id]); throw new Error('验证码错误'); } await pool.query('UPDATE auth_verification_codes SET used_at=now() WHERE id=$1', [row.id]); }
async function findUserByChannel(channel, target) { return channel === 'phone' ? pool.query('SELECT * FROM auth_users WHERE phone=$1 LIMIT 1', [target]).then(r => r.rows[0] || null) : pool.query('SELECT * FROM auth_users WHERE email=$1 LIMIT 1', [target]).then(r => r.rows[0] || null); }
function mapUser(row) { return { id: row.id, phone: row.phone || undefined, email: row.email || undefined, nickname: row.nickname || undefined, memberType: row.member_type || 'regular', status: row.status || 'active', createdAt: row.created_at, lastLoginAt: row.last_login_at }; }
async function createSession(userId, req) { const token = crypto.randomBytes(32).toString('hex'); const tokenHash = hashToken(token); const id = crypto.randomUUID(); const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); await pool.query(`INSERT INTO auth_sessions(id, user_id, token_hash, expires_at, user_agent, ip) VALUES ($1,$2,$3,$4,$5,$6)`, [id, userId, tokenHash, expiresAt, req.headers['user-agent'] || null, req.socket.remoteAddress || null]); return { token, expiresAt }; }
async function findSessionByToken(token) { const q = await pool.query(`SELECT s.*, u.* FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > now()) LIMIT 1`, [hashToken(token)]); return q.rows[0] || null; }
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  try {
    if (url.pathname === '/healthz') { await pool.query('SELECT 1'); return json(res, 200, { ok: true, smsReady: !!(process.env.TC_SECRET_ID && process.env.TC_SECRET_KEY && process.env.TC_SMS_TEMPLATE_ID_REGISTER && process.env.TC_SMS_TEMPLATE_ID_RESET && process.env.TC_SMS_SIGN && process.env.TC_SMS_SDK_APP_ID), emailReady: !!(process.env.AUTH_SMTP_HOST && process.env.AUTH_SMTP_USER && process.env.AUTH_SMTP_PASS && process.env.AUTH_EMAIL_FROM) }); }
    if (url.pathname === '/api/auth/bootstrap' && req.method === 'GET') return json(res, 200, { ok: true, phase: 'pg-auth-api', authReady: true });
    if (url.pathname === '/api/auth/session' && req.method === 'GET') { const auth = String(req.headers.authorization || ''); const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''; if (!token) return json(res, 401, { ok: false, error: 'missing token' }); const row = await findSessionByToken(token); if (!row) return json(res, 401, { ok: false, error: 'invalid session' }); return json(res, 200, { ok: true, data: { user: mapUser(row), expiresAt: row.expires_at } }); }
    if (req.method !== 'POST') return json(res, 404, { ok: false, error: 'not found' });
    const body = await readJsonBody(req);
    if (url.pathname === '/api/auth/send-code') { const channel = normalizeChannel(body.channel); const scene = normalizeScene(body.scene); if (!channel || !scene) return json(res, 400, { ok: false, error: '参数错误(channel/scene)' }); const target = normalizeTarget(channel, body.target); if (!target) return json(res, 400, { ok: false, error: channel === 'phone' ? '手机号格式错误' : '邮箱格式错误' }); const exists = await findUserByChannel(channel, target); if (scene === 'register' && exists) return json(res, 400, { ok: false, error: '账号已存在，请直接登录' }); if (scene === 'reset' && !exists) return json(res, 400, { ok: false, error: '账号不存在，请先注册' }); const code = await createCode(channel, target, scene, req.socket.remoteAddress || ''); if (channel === 'phone') await sendSmsCode(target, scene, code); else await sendEmailCode(target, scene, code); return json(res, 200, { ok: true, message: '验证码发送成功' }); }
    if (url.pathname === '/api/auth/register') { const channel = normalizeChannel(body.channel); const target = normalizeTarget(channel, body.target); const code = String(body.code || '').trim(); const password = String(body.password || ''); const nickname = String(body.nickname || '').trim(); if (!channel || !target || !code) return json(res, 400, { ok: false, error: '参数不完整' }); if (password.length < 8) return json(res, 400, { ok: false, error: '密码至少8位' }); const existed = await findUserByChannel(channel, target); if (existed) return json(res, 400, { ok: false, error: '账号已存在' }); await consumeValidCode(channel, target, 'register', code); const id = crypto.randomUUID(); await pool.query(`INSERT INTO auth_users(id, phone, email, nickname, password_hash) VALUES ($1,$2,$3,$4,$5)`, [id, channel === 'phone' ? target : null, channel === 'email' ? target : null, nickname || null, hashPassword(password)]); const userRes = await pool.query('SELECT * FROM auth_users WHERE id=$1', [id]); const session = await createSession(id, req); return json(res, 200, { ok: true, data: { user: mapUser(userRes.rows[0]), token: session.token, expiresAt: session.expiresAt } }); }
    if (url.pathname === '/api/auth/login') { const channel = normalizeChannel(body.channel); const target = normalizeTarget(channel, body.target); const password = String(body.password || ''); if (!channel || !target || !password) return json(res, 400, { ok: false, error: '参数不完整' }); const row = await findUserByChannel(channel, target); if (!row) return json(res, 400, { ok: false, error: '账号或密码错误' }); if (row.status !== 'active') return json(res, 403, { ok: false, error: '账号不可用，请联系管理员' }); if (!verifyPassword(password, row.password_hash)) return json(res, 400, { ok: false, error: '账号或密码错误' }); await pool.query('UPDATE auth_users SET last_login_at=now() WHERE id=$1', [row.id]); const updated = await pool.query('SELECT * FROM auth_users WHERE id=$1', [row.id]); const session = await createSession(row.id, req); return json(res, 200, { ok: true, data: { user: mapUser(updated.rows[0]), token: session.token, expiresAt: session.expiresAt } }); }
    if (url.pathname === '/api/auth/reset-password') { const channel = normalizeChannel(body.channel); const target = normalizeTarget(channel, body.target); const code = String(body.code || '').trim(); const newPassword = String(body.newPassword || ''); if (!channel || !target || !code) return json(res, 400, { ok: false, error: '参数不完整' }); if (newPassword.length < 8) return json(res, 400, { ok: false, error: '密码至少8位' }); const row = await findUserByChannel(channel, target); if (!row) return json(res, 400, { ok: false, error: '账号不存在' }); await consumeValidCode(channel, target, 'reset', code); await pool.query('UPDATE auth_users SET password_hash=$1 WHERE id=$2', [hashPassword(newPassword), row.id]); return json(res, 200, { ok: true, message: '密码重置成功' }); }
    if (url.pathname === '/api/auth/invite-codes' && req.method === 'GET') {
      const q = await pool.query('SELECT id, code, type, bonus_days, max_uses, used_count, status, created_by, created_at, used_by FROM invite_codes ORDER BY created_at DESC');
      return json(res, 200, { ok: true, data: q.rows.map(r => ({ id: r.id, code: r.code, type: r.type, bonusDays: r.bonus_days, maxUses: r.max_uses, usedCount: r.used_count, status: r.status, createdBy: r.created_by, createdAt: r.created_at, usedBy: r.used_by || [] })) });
    }
    if (url.pathname === '/api/auth/invite-codes' && req.method === 'POST') {
      const type = String(body.type || '');
      const maxUses = Number(body.maxUses || 1);
      const bonusDays = type === '30days' ? 30 : type === '365days' ? 365 : type === '1095days' ? 1095 : 0;
      if (!bonusDays) return json(res, 400, { ok: false, error: '无效的邀请码类型' });
      const code = crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 12);
      const id = crypto.randomUUID();
      await pool.query('INSERT INTO invite_codes(id, code, type, bonus_days, max_uses, used_count, status, created_by, used_by) VALUES ($1,$2,$3,$4,$5,0,\'valid\',$6,\'[]\'::jsonb)', [id, code, type, bonusDays, maxUses, 'admin']);
      const q = await pool.query('SELECT id, code, type, bonus_days, max_uses, used_count, status, created_by, created_at, used_by FROM invite_codes WHERE id=$1', [id]);
      const r = q.rows[0];
      return json(res, 200, { ok: true, data: { id: r.id, code: r.code, type: r.type, bonusDays: r.bonus_days, maxUses: r.max_uses, usedCount: r.used_count, status: r.status, createdBy: r.created_by, createdAt: r.created_at, usedBy: r.used_by || [] } });
    }
    const disableMatch = url.pathname.match(/^\/api\/auth\/invite-codes\/([^/]+)\/disable$/);
    if (disableMatch && req.method === 'POST') {
      const code = decodeURIComponent(disableMatch[1]);
      await pool.query('UPDATE invite_codes SET status=\'disabled\' WHERE code=$1', [code]);
      return json(res, 200, { ok: true, message: '邀请码已禁用' });
    }
    const deleteMatch = url.pathname.match(/^\/api\/auth\/invite-codes\/([^/]+)$/);
    if (deleteMatch && req.method === 'DELETE') {
      const code = decodeURIComponent(deleteMatch[1]);
      await pool.query('DELETE FROM invite_codes WHERE code=$1', [code]);
      return json(res, 200, { ok: true, message: '邀请码已删除' });
    }
    return json(res, 404, { ok: false, error: 'not found' });
  } catch (err) { return json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) }); }
});
await ensureSchema();
server.listen(PORT, () => console.log(`[pg-auth-api] listening on http://127.0.0.1:${PORT}`));
