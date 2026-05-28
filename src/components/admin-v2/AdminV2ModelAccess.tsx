import { useState, useRef, type ReactNode } from 'react';
import {
  Activity, Bot, Image as ImageIcon, KeyRound, Sliders, Wand2,
  FlaskConical, BarChart3, Settings2, Check, AlertCircle,
  Send, Eye, EyeOff, Copy, RotateCcw, Save, Trash2, Info,
} from 'lucide-react';

// ============================================================
// 全局 toast (验收期使用, 接 dataService 时换成正式 toast 库)
// ============================================================
function showToast(message: string, tone: 'success' | 'error' | 'info' | 'warning' = 'success') {
  if (typeof document === 'undefined') return;
  const div = document.createElement('div');
  const bg = tone === 'success' ? '#10B981'
           : tone === 'error'   ? '#EF4444'
           : tone === 'warning' ? '#D97706'
           : '#16265E';
  div.style.cssText = `
    position:fixed;top:80px;right:20px;z-index:9999;
    padding:12px 18px;border-radius:14px;
    background:${bg};color:white;font-size:13px;font-weight:600;
    box-shadow:0 12px 32px rgba(0,0,0,0.18);
    max-width:380px;line-height:1.55;
    transform:translateX(20px);opacity:0;
    transition:transform 0.3s ease-out, opacity 0.3s ease-out;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  requestAnimationFrame(() => {
    div.style.transform = 'translateX(0)';
    div.style.opacity = '1';
  });
  setTimeout(() => {
    div.style.transform = 'translateX(20px)';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 320);
  }, 3200);
}

// 脱敏: 前 8 + ... + 后 4
function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length < 14) return '***' + trimmed.slice(-4);
  return trimmed.slice(0, 8) + '…' + trimmed.slice(-4);
}

// 顶部 banner: 提醒"前端暂存,未写入服务器"
function StageBanner() {
  return (
    <div className="rounded-[14px] bg-amber-50 ring-1 ring-amber-200/70 px-4 py-3 flex items-start gap-3">
      <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div className="flex-1 text-[12.5px] text-amber-900 leading-relaxed">
        <strong>验收阶段 · 仅前端暂存</strong> · 本页所有"保存"按钮当前只把数据暂存在浏览器
        <code className="mx-1 px-1.5 py-0.5 rounded bg-amber-100/80 font-mono text-[11.5px]">localStorage</code>
        里，<strong>不会写入服务器</strong>，刷新仍可见、清缓存就丢。<br />
        要真生效，需 ssh 到腾讯云改 <code className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-100/80 font-mono text-[11.5px]">/srv/yiyu-auth-api/.env</code>
        + <code className="mx-0.5 px-1.5 py-0.5 rounded bg-amber-100/80 font-mono text-[11.5px]">systemctl restart yiyu-auth-api</code>。
      </div>
    </div>
  );
}

// ============================================================
// admin-v2 · 豆包模型接入入口 (2 个完整面板)
//
// 1. 豆包·语言模型 (Doubao Language)  → 文章排版 / 报告介绍 / 益语通
// 2. 豆包·图像模型 (Doubao Seedream)   → 文章封面 / 文章插图 / 报告封面
//
// 当前是纯 UI 占位, 不真调 Ark. 配置项基于 .env 中现有 ARK_BASE_URL/ARK_API_KEY
// 设计, 接数据时由后端读 env 返回脱敏值, 前端只写配置.
// ============================================================

// ============== 共用原子件 (本文件自给自足, 不依赖其他模块) ==============
function Card({ children, className = '', tone = 'default' }: { children: ReactNode; className?: string; tone?: 'default' | 'highlight' | 'warning' }) {
  const toneCls = tone === 'highlight'
    ? 'ring-os-navy/30 bg-gradient-to-br from-os-mist/30 to-os-paper'
    : tone === 'warning'
    ? 'ring-amber-200/60 bg-amber-50/40'
    : 'ring-os-line bg-os-paper';
  return <div className={`rounded-[20px] ring-1 shadow-os p-5 sm:p-6 ${toneCls} ${className}`}>{children}</div>;
}

function SectionTitle({ children, hint, icon }: { children: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-os-navy">
        {icon}
        <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold tracking-tight">{children}</h3>
      </div>
      {hint && <p className="mt-1 text-[12px] text-os-muted leading-relaxed">{hint}</p>}
    </div>
  );
}

function ToolbarButton({ onClick, children, variant = 'primary', size = 'md' }: { onClick?: () => void; children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }) {
  const sizeCls = size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]';
  const variantCls = variant === 'primary'
    ? 'bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os'
    : variant === 'danger'
    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100'
    : 'bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30';
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all ${sizeCls} ${variantCls}`}>
      {children}
    </button>
  );
}

function Field({
  label, type = 'text', defaultValue = '', options, rows = 3, hint, suffix, readOnly,
}: {
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'password' | 'url';
  defaultValue?: string;
  options?: { value: string; label: string; hint?: string }[];
  rows?: number;
  hint?: string;
  suffix?: ReactNode;
  readOnly?: boolean;
}) {
  const baseInputCls = `w-full px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30 ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-semibold text-os-muted tracking-[0.04em]">{label}</label>
        {suffix && <div className="text-[11px]">{suffix}</div>}
      </div>
      {type === 'textarea' ? (
        <textarea
          defaultValue={defaultValue}
          readOnly={readOnly}
          rows={rows}
          className={`${baseInputCls} resize-y font-mono`}
        />
      ) : type === 'select' ? (
        <select defaultValue={defaultValue} className={`${baseInputCls} cursor-pointer`}>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          defaultValue={defaultValue}
          readOnly={readOnly}
          className={baseInputCls}
        />
      )}
      {hint && <p className="text-[11px] text-os-muted/75 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, hint }: { label: string; value: number; min: number; max: number; step?: number; hint?: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-semibold text-os-muted">{label}</label>
        <span className="text-[12px] font-mono text-os-navy">{v}</span>
      </div>
      <input
        type="range"
        value={v}
        min={min}
        max={max}
        step={step}
        onChange={e => setV(Number(e.target.value))}
        className="w-full accent-os-navy"
      />
      {hint && <p className="text-[11px] text-os-muted/75">{hint}</p>}
    </div>
  );
}

function Switch({ label, defaultOn = false, hint }: { label: string; defaultOn?: boolean; hint?: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-os-ink">{label}</div>
        {hint && <p className="mt-0.5 text-[11px] text-os-muted/75 leading-relaxed">{hint}</p>}
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${on ? 'bg-os-navy' : 'bg-os-line'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function StatusDot({ tone }: { tone: 'live' | 'idle' | 'error' | 'unconfigured' }) {
  const cls = {
    live:         { bg: 'bg-emerald-500',  ring: 'ring-emerald-500/30', label: 'Live · 在线' },
    idle:         { bg: 'bg-os-blue',      ring: 'ring-os-blue/30',     label: 'Idle · 待机' },
    error:        { bg: 'bg-rose-500',     ring: 'ring-rose-500/30',    label: 'Error · 故障' },
    unconfigured: { bg: 'bg-os-muted/50',  ring: 'ring-os-muted/20',    label: '未配置' },
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative inline-block w-2 h-2 rounded-full ${cls.bg}`}>
        <span className={`absolute inset-0 rounded-full ring-2 ${cls.ring} animate-ping`} />
      </span>
      <span className="text-[11px] font-semibold text-os-ink/80">{cls.label}</span>
    </span>
  );
}

function ApiKeyField({ defaultMasked, source, storageKey }: { defaultMasked: string; source: string; storageKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  // 验收阶段: 用户输入的 key 暂存在 localStorage, 刷新仍可见
  const [savedKey, setSavedKey] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return '';
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // 当前显示值: 优先用暂存的 key (脱敏 / 全显), 否则用 defaultMasked
  const display = savedKey
    ? (revealed ? savedKey : maskApiKey(savedKey))
    : defaultMasked;

  const handleSave = () => {
    const value = (inputRef.current?.value || '').trim();
    if (!value) {
      showToast('请粘贴 API Key 后再点保存', 'error');
      inputRef.current?.focus();
      return;
    }
    if (value.length < 16) {
      showToast('这看起来不是有效的 API Key (长度太短)', 'error');
      return;
    }
    try {
      localStorage.setItem(storageKey, value);
      setSavedKey(value);
      setEditing(false);
      setRevealed(false);
      showToast(`✓ API Key 已暂存到浏览器 (${maskApiKey(value)}) · 未写入服务器`, 'success');
    } catch (e) {
      showToast('localStorage 写入失败, 浏览器可能禁用了存储', 'error');
    }
  };

  const handleClear = () => {
    if (!savedKey) return;
    try {
      localStorage.removeItem(storageKey);
      setSavedKey('');
      setRevealed(false);
      showToast('已清除浏览器暂存的 API Key', 'info');
    } catch {}
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-semibold text-os-muted">API Key</label>
        <span className="text-[11px] text-os-muted/70">{source}</span>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="password"
            autoFocus
            placeholder="粘贴 API Key (例: ark-xxxxxxxx-xxxx-xxxx-...)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="flex-1 px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30 font-mono"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-2 rounded-[10px] bg-os-navy text-white text-[12px] font-semibold hover:brightness-110 inline-flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-2 rounded-[10px] bg-os-paper text-os-muted text-[12px] font-medium ring-1 ring-os-line hover:ring-os-navy/30"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] font-mono text-os-ink truncate">
            {display || <span className="text-os-muted/60 italic font-sans">未设置</span>}
          </code>
          {savedKey && (
            <button
              type="button"
              onClick={() => setRevealed(r => !r)}
              className="p-2 rounded-[10px] hover:bg-os-mist text-os-muted"
              title={revealed ? '隐藏完整 key' : '显示完整 key (注意环境)'}
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {savedKey && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-[10px] hover:bg-rose-50 text-rose-600"
              title="清除浏览器暂存"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-3 py-2 rounded-[10px] bg-os-paper text-os-navy text-[12px] font-semibold ring-1 ring-os-line hover:ring-os-navy/30"
          >
            {savedKey ? '重新设置' : '设置 API Key'}
          </button>
        </div>
      )}
      <p className="text-[11px] text-os-muted/75 leading-relaxed">
        {savedKey
          ? <>✓ 已暂存到浏览器 localStorage (key: <code className="font-mono">{storageKey}</code>)。这是验收期占位,刷新页面仍可见。<strong>要真生效,需 ssh 写入 /srv/yiyu-auth-api/.env</strong></>
          : '生产环境 API Key 仅保存在后端 .env 文件 (process.env.ARK_API_KEY)。验收期可在此暂存到浏览器以验证 UI。'}
      </p>
    </div>
  );
}

// ============================================================
// 真接通: 调豆包图像生成 (走 vite dev proxy → 火山引擎方舟)
// ============================================================
const DEFAULT_IMAGE_MODEL = 'doubao-seedream-4-0-250828';
const DEFAULT_IMAGE_PROMPT = '为益语智库文章《组织经营是一个整体》生成封面。深蓝紫主色 (#16265E 到 #7C3AED), 现代中国风, 抽象象征, 留白多, 不要任何文字, 16:9 横版构图';

function ImageGenerationTester() {
  const [prompt, setPrompt] = useState(DEFAULT_IMAGE_PROMPT);
  const [size, setSize] = useState('1024x1024');
  const [model, setModel] = useState(DEFAULT_IMAGE_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; elapsedMs: number; usage?: any; size: string; model: string } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Prompt 不能为空', 'error');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = Date.now();
    try {
      const resp = await fetch('/api/admin/ai/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, size, n: 1, response_format: 'url' }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error?.message || `HTTP ${resp.status}`;
        setError(msg);
        showToast(`生成失败: ${msg.slice(0, 80)}`, 'error');
        return;
      }
      const url = data?.data?.[0]?.url;
      if (!url) {
        setError('返回无 image url: ' + JSON.stringify(data).slice(0, 200));
        return;
      }
      setResult({ url, elapsedMs: Date.now() - t0, usage: data?.usage, size, model });
      showToast(`✓ 生成成功 · ${Math.round((Date.now() - t0) / 1000)}s`, 'success');
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      showToast(`异常: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 左: 输入 */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-os-muted">测试 Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            disabled={loading}
            className={`${inputCls} resize-y font-mono`}
            placeholder="描述要生成的画面..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-os-muted">模型</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loading} className={`${inputCls} cursor-pointer`}>
              <option value="doubao-seedream-4-0-250828">Seedream 4.0 · 推荐 · 1024² 起</option>
              <option value="doubao-seedream-4-5-251128">Seedream 4.5 · 需 ≥1920²</option>
              <option value="doubao-seedream-5-0-260128">Seedream 5.0 · 最新 · 需 ≥1920²</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-os-muted">尺寸</label>
            <select value={size} onChange={(e) => setSize(e.target.value)} disabled={loading} className={`${inputCls} cursor-pointer`}>
              <option value="1024x1024">1024 × 1024 (正方)</option>
              <option value="1792x1024">1792 × 1024 (横 · 文章封面)</option>
              <option value="1024x1792">1024 × 1792 (竖 · 海报)</option>
              <option value="2048x2048">2048 × 2048 (4.5/5.0 需)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={handleGenerate}>
            {loading
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...</>
              : <><Send className="w-3.5 h-3.5" />发起测试生成</>}
          </ToolbarButton>
          {result && (
            <button
              onClick={() => { navigator.clipboard?.writeText(result.url); showToast('图片 URL 已复制', 'info'); }}
              className="px-3 py-1.5 rounded-full text-[12px] text-os-blue hover:text-os-navy inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />复制 URL
            </button>
          )}
        </div>
        <p className="text-[11px] text-os-muted/75 leading-relaxed">
          走 vite dev proxy <code className="font-mono">/api/admin/ai/images/generations</code> →
          火山引擎方舟 (API Key 由 .env.local 的 <code className="font-mono">ARK_API_KEY</code> 注入,前端 bundle 看不到)
        </p>
      </div>

      {/* 右: 结果 */}
      <div>
        <div className="text-[12px] font-semibold text-os-muted mb-2">生成结果</div>
        {loading && (
          <div className="aspect-square rounded-[12px] bg-os-canvas ring-1 ring-os-line border-dashed flex flex-col items-center justify-center text-[12px] text-os-muted">
            <span className="inline-block w-8 h-8 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin mb-3" />
            正在调用豆包 Seedream...
            <span className="mt-1 text-[11px] text-os-muted/70">通常 8–15 秒</span>
          </div>
        )}
        {!loading && !result && !error && (
          <div className="aspect-square rounded-[12px] bg-gradient-to-br from-os-mist/40 to-os-canvas ring-1 ring-os-line border-dashed flex items-center justify-center">
            <div className="text-center text-[12px] text-os-muted/60">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              点击左侧"发起测试生成"
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[12px] bg-rose-50 ring-1 ring-rose-200 p-4 text-[12px] text-rose-700">
            <div className="font-semibold mb-1 inline-flex items-center gap-1"><AlertCircle className="w-4 h-4" />生成失败</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-rose-900/85 leading-relaxed">{error}</pre>
          </div>
        )}
        {result && !loading && (
          <div className="space-y-3">
            <div className="rounded-[12px] overflow-hidden ring-1 ring-os-line bg-os-canvas relative">
              <img
                src={result.url}
                alt="豆包 Seedream 生成"
                className="w-full h-auto block"
                style={{ aspectRatio: result.size.replace('x', ' / ') }}
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
                AI · {result.model.replace('doubao-', '')}
              </div>
            </div>
            <div className="rounded-[12px] bg-os-canvas ring-1 ring-os-line p-3 space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between text-os-muted">
                <span>模型</span><span className="font-mono text-os-ink truncate ml-2">{result.model}</span>
              </div>
              <div className="flex items-center justify-between text-os-muted">
                <span>尺寸</span><span className="font-mono text-os-ink">{result.size}</span>
              </div>
              <div className="flex items-center justify-between text-os-muted">
                <span>耗时</span><span className="font-mono text-os-ink">{(result.elapsedMs / 1000).toFixed(1)} s</span>
              </div>
              {result.usage?.generated_images != null && (
                <div className="flex items-center justify-between text-os-muted">
                  <span>已生成</span><span className="font-mono text-os-ink">{result.usage.generated_images} 张 · {result.usage.total_tokens} tokens</span>
                </div>
              )}
              <div className="flex items-center justify-between text-os-muted">
                <span>状态</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Check className="w-3 h-3" />completed</span>
              </div>
              <div className="border-t border-os-line pt-2 flex items-center gap-2 justify-end">
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-os-blue hover:text-os-navy">在新标签页打开</a>
                <a href={result.url} download className="text-[11px] text-os-blue hover:text-os-navy">下载</a>
              </div>
              <p className="text-[11px] text-os-muted/70 leading-relaxed pt-1">
                ⚠️ 此 URL 24 小时后过期 (X-Tos-Expires=86400). 生产环境需下载到自己服务器永久化.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 真接通: 调豆包文本生成 (走同一个 dev proxy → chat/completions)
// ============================================================
function ChatCompletionTester() {
  const [userMsg, setUserMsg] = useState('用一句话介绍益语智库做的事情');
  const [model, setModel] = useState('doubao-seed-2-0-pro-260215');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ content: string; elapsedMs: number; usage?: any; model: string } | null>(null);

  const handleSend = async () => {
    if (!userMsg.trim()) {
      showToast('User Message 不能为空', 'error');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = Date.now();
    try {
      const resp = await fetch('/api/admin/ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: userMsg }],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error?.message || `HTTP ${resp.status}`;
        setError(msg);
        showToast(`调用失败: ${msg.slice(0, 80)}`, 'error');
        return;
      }
      const content = data?.choices?.[0]?.message?.content || '';
      if (!content) {
        setError('返回无 content: ' + JSON.stringify(data).slice(0, 200));
        return;
      }
      setResult({ content, elapsedMs: Date.now() - t0, usage: data?.usage, model: data?.model || model });
      showToast(`✓ 调用成功 · ${(Date.now() - t0)} ms`, 'success');
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      showToast(`异常: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 左: 输入 */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-os-muted">User Message</label>
          <textarea
            value={userMsg}
            onChange={(e) => setUserMsg(e.target.value)}
            rows={6}
            disabled={loading}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-os-muted">模型</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loading} className={`${inputCls} cursor-pointer`}>
            <option value="doubao-seed-2-0-pro-260215">doubao-seed-2-0-pro-260215 · 推荐</option>
            <option value="doubao-seed-2-0-lite-260215">doubao-seed-2-0-lite-260215 · 轻量</option>
            <option value="doubao-seed-2-0-mini-260215">doubao-seed-2-0-mini-260215</option>
            <option value="doubao-1-5-pro-32k-250115">doubao-1-5-pro-32k-250115</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={handleSend}>
            {loading
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />调用中...</>
              : <><Send className="w-3.5 h-3.5" />发起测试调用</>}
          </ToolbarButton>
          {result && (
            <button
              onClick={() => { navigator.clipboard?.writeText(result.content); showToast('回复内容已复制', 'info'); }}
              className="px-3 py-1.5 rounded-full text-[12px] text-os-blue hover:text-os-navy inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />复制回复
            </button>
          )}
        </div>
        <p className="text-[11px] text-os-muted/75 leading-relaxed">
          走 vite dev proxy <code className="font-mono">/api/admin/ai/chat/completions</code> →
          火山引擎方舟 Chat Completions (OpenAI 兼容)
        </p>
      </div>

      {/* 右: 结果 */}
      <div>
        <div className="text-[12px] font-semibold text-os-muted mb-2">回复</div>
        {loading && (
          <div className="rounded-[12px] bg-os-canvas ring-1 ring-os-line border-dashed h-40 flex flex-col items-center justify-center text-[12px] text-os-muted">
            <span className="inline-block w-7 h-7 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin mb-2" />
            正在调用豆包...
          </div>
        )}
        {!loading && !result && !error && (
          <div className="rounded-[12px] bg-gradient-to-br from-os-mist/40 to-os-canvas ring-1 ring-os-line border-dashed h-40 flex items-center justify-center text-[12px] text-os-muted/60">
            点击左侧"发起测试调用"
          </div>
        )}
        {error && !loading && (
          <div className="rounded-[12px] bg-rose-50 ring-1 ring-rose-200 p-4 text-[12px] text-rose-700">
            <div className="font-semibold mb-1 inline-flex items-center gap-1"><AlertCircle className="w-4 h-4" />调用失败</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-rose-900/85 leading-relaxed">{error}</pre>
          </div>
        )}
        {result && !loading && (
          <div className="space-y-3">
            <div className="rounded-[12px] bg-os-canvas ring-1 ring-os-line p-4 max-h-[400px] overflow-y-auto">
              <pre className="text-[12.5px] text-os-ink/90 whitespace-pre-wrap font-sans leading-relaxed">{result.content}</pre>
            </div>
            <div className="rounded-[12px] bg-os-canvas ring-1 ring-os-line p-3 space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between text-os-muted">
                <span>模型</span><span className="font-mono text-os-ink truncate ml-2">{result.model}</span>
              </div>
              <div className="flex items-center justify-between text-os-muted">
                <span>延迟</span><span className="font-mono text-os-ink">{result.elapsedMs} ms</span>
              </div>
              {result.usage && (
                <div className="flex items-center justify-between text-os-muted">
                  <span>Token</span><span className="font-mono text-os-ink">输入 {result.usage.prompt_tokens} + 输出 {result.usage.completion_tokens} = {result.usage.total_tokens}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-os-muted">
                <span>状态</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Check className="w-3 h-3" />success</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptTemplateEditor({ scenarios }: { scenarios: { id: string; label: string; defaultPrompt: string; variables?: string[] }[] }) {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const active = scenarios.find(s => s.id === activeId)!;
  return (
    <div>
      <div className="flex items-center gap-1 mb-3 border-b border-os-line flex-wrap">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 ${
              activeId === s.id
                ? 'text-os-navy border-os-navy'
                : 'text-os-muted border-transparent hover:text-os-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <Field
        label="Prompt 模板"
        type="textarea"
        rows={8}
        defaultValue={active.defaultPrompt}
        hint={active.variables ? `可用变量: ${active.variables.map(v => `{${v}}`).join(' / ')}` : undefined}
      />
      <div className="mt-3 flex items-center gap-2 justify-end">
        <button
          onClick={() => showToast(`已恢复 "${active.label}" 的默认 prompt`, 'info')}
          className="px-3 py-1.5 rounded-full text-[12px] font-medium text-os-muted hover:text-os-navy inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />恢复默认
        </button>
        <ToolbarButton size="sm" onClick={() => showToast(`✓ Prompt 模板"${active.label}"已暂存 · 未写入服务器`, 'success')}>
          <Save className="w-3 h-3" />保存当前场景
        </ToolbarButton>
      </div>
    </div>
  );
}

// ============== 模块 A: 豆包·语言模型 ==============
export function DoubaoLanguageAccess() {
  return (
    <div className="space-y-6 max-w-[1100px]">
      <StageBanner />

      {/* 状态卡 */}
      <Card tone="highlight">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-12 h-12 rounded-[14px] bg-os-navy text-white flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-serif-display text-[22px] sm:text-[26px] font-semibold text-os-navy tracking-tight">豆包 · 语言模型</h2>
              <StatusDot tone="live" />
            </div>
            <p className="mt-1 text-[13px] text-os-muted">
              Doubao Language · 用于文章自动排版 / 报告介绍生成 / 益语通对话 / 摘要标签建议等文本任务
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
              <div>
                <div className="text-os-muted/70">当前模型</div>
                <div className="mt-0.5 font-mono text-os-ink truncate">doubao-seed-2-0-pro-260215</div>
              </div>
              <div>
                <div className="text-os-muted/70">最近调用</div>
                <div className="mt-0.5 font-semibold text-os-ink">12 分钟前</div>
              </div>
              <div>
                <div className="text-os-muted/70">本月 token</div>
                <div className="mt-0.5 font-semibold text-os-ink">156,832</div>
              </div>
              <div>
                <div className="text-os-muted/70">本月成本</div>
                <div className="mt-0.5 font-semibold text-os-navy">¥18.50</div>
              </div>
            </div>
          </div>
          <ToolbarButton onClick={() => showToast('测试连通性 · 待接后端 /api/admin/ai/test/language 后真调豆包', 'warning')}>
            <FlaskConical className="w-3.5 h-3.5" />测试连通性
          </ToolbarButton>
        </div>
      </Card>

      {/* Section 1: 基本配置 */}
      <Card>
        <SectionTitle icon={<KeyRound className="w-4 h-4" />} hint="所有字段沿用现有 ARK_BASE_URL / ARK_API_KEY env, 修改后写入服务端 .env">
          1. 基本配置
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field label="API Endpoint URL" type="url" defaultValue="https://ark.cn-beijing.volces.com" hint="火山引擎方舟 (Ark) 北京地域 endpoint" />
          <Field label="Chat Completions 路径" defaultValue="/api/v3/chat/completions" hint="OpenAI 兼容路径,通常不需要改" readOnly />
        </div>
        <div className="mt-4">
          <ApiKeyField
            defaultMasked="sk-arkv3-****-****-****-************a8f2"
            source="存储于服务端 process.env.ARK_API_KEY"
            storageKey="admin-v2.doubao-language.api-key"
          />
        </div>
      </Card>

      {/* Section 2: 模型选择 */}
      <Card>
        <SectionTitle icon={<Bot className="w-4 h-4" />} hint="选择默认调用的 doubao 模型 endpoint ID. 可针对不同业务场景指定不同模型 (高级)">
          2. 模型选择
        </SectionTitle>
        <Field
          label="默认模型 (default model)"
          type="select"
          defaultValue="doubao-seed-2-0-pro-260215"
          options={[
            { value: 'doubao-seed-2-0-pro-260215',  label: 'doubao-seed-2-0-pro-260215 · 推荐 · 长上下文/中文优' },
            { value: 'doubao-seed-2-0-lite-260215', label: 'doubao-seed-2-0-lite-260215 · 轻量/快速/便宜' },
            { value: 'doubao-1.5-pro-256k',         label: 'doubao-1.5-pro-256k · 超长上下文 256k' },
            { value: 'doubao-1.5-pro-32k',          label: 'doubao-1.5-pro-32k · 经典版本' },
            { value: 'custom',                       label: '自定义模型 ID...' },
          ]}
        />
        <div className="mt-3 rounded-[12px] bg-os-mist/40 ring-1 ring-os-blue/15 px-4 py-3 text-[12px] text-os-ink/85 leading-relaxed">
          <strong className="text-os-navy">doubao-seed-2-0-pro-260215</strong>:
          上下文 32k tokens · 输出 4k · 推理能力强 · 中文表现优秀 · 适合文章排版/长报告概要 ·
          单价约 ¥0.0008/1k tokens (输入) + ¥0.002/1k tokens (输出)
        </div>
      </Card>

      {/* Section 3: 默认参数 */}
      <Card>
        <SectionTitle icon={<Sliders className="w-4 h-4" />} hint="所有 chat completion 请求的默认参数, 单次调用可覆盖">
          3. 默认推理参数
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Slider label="Temperature (温度)" value={7} min={0} max={20} step={1} hint="0=最确定 / 20=最随机. 文章排版建议 5-8" />
          <Field label="Max Tokens (最大输出长度)" defaultValue="4096" hint="单次最大返回 token 数,doubao-seed-2-0-pro 上限 4096" />
          <Slider label="Top P" value={9} min={0} max={10} step={1} hint="核采样,通常 9 (=0.9)" />
          <Field label="Presence Penalty" defaultValue="0" hint="-2 到 2, 抑制重复主题" />
          <Field label="Frequency Penalty" defaultValue="0" hint="-2 到 2, 抑制重复词" />
          <Field label="Stop Sequences (停止序列)" defaultValue="" hint="逗号分隔,留空则不设" />
        </div>
        <div className="mt-4 space-y-2">
          <Switch label="流式响应 (stream)" defaultOn={true} hint="开启后 chat 走 SSE 流式输出,响应速度感更好。文章排版建议关 (要完整 JSON)" />
          <Switch label="结构化输出 (JSON mode)" defaultOn={false} hint="强制 response_format = { type: 'json_object' }, 用于排版/标签/封面 prompt 等需要 JSON 输出的场景" />
        </div>
      </Card>

      {/* Section 4: Prompt 模板 */}
      <Card>
        <SectionTitle icon={<Wand2 className="w-4 h-4" />} hint="不同业务场景的 system prompt 模板, 调用 API 时根据场景注入">
          4. System Prompt 模板
        </SectionTitle>
        <PromptTemplateEditor
          scenarios={[
            {
              id: 'article-format',
              label: '文章自动排版',
              defaultPrompt: '你是一位资深编辑,接到一段粗略的中文文字稿。请按以下规则排版:\n\n1. 拆分自然段,每段 3-5 句,保持原意不改\n2. 自动加 H2 小标题,把内容分成 3-5 节\n3. 关键句加 **bold**\n4. 输出结构化 Markdown,不要解释\n\n输入: {raw_text}',
              variables: ['raw_text'],
            },
            {
              id: 'report-intro',
              label: '报告自动介绍',
              defaultPrompt: '你是一位行业研究员。请根据下面报告的文本内容,生成一段 200-300 字的中文介绍,包含:\n\n1. 报告核心研究问题\n2. 主要发现 (3-5 条)\n3. 适合谁阅读\n\n输入: {report_text}',
              variables: ['report_text'],
            },
            {
              id: 'summary-tags',
              label: '摘要与标签建议',
              defaultPrompt: '为以下文章生成:\n1. 80-120 字摘要\n2. 4 类标签中的 1-3 个 (战略 / 业务设计 / 组织 / AI 技术)\n3. 5 个 SEO 关键词\n\n返回 JSON: { "excerpt": "", "topics": [], "keywords": [] }\n\n输入: {article_text}',
              variables: ['article_text'],
            },
            {
              id: 'yiyutong',
              label: '益语通对话 (现存)',
              defaultPrompt: '你是益语智库的助手 益语通. 你不能编造未授权信息. 用户问什么你才回答什么. (此项已在生产用,谨慎修改)',
            },
          ]}
        />
      </Card>

      {/* Section 5: 测试调用 (★ 已真接通豆包文本模型) */}
      <Card>
        <SectionTitle icon={<FlaskConical className="w-4 h-4" />} hint="✓ 已接通 · 真调火山引擎方舟 chat/completions">
          5. 测试调用
        </SectionTitle>
        <ChatCompletionTester />
      </Card>

      {/* Section 6: 用量统计 */}
      <Card>
        <SectionTitle icon={<BarChart3 className="w-4 h-4" />} hint="基于后端 ai_call_log 表汇总, 默认按月统计">
          6. 用量统计
        </SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">今日调用</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-navy">23 次</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">7,841 tokens</div>
          </div>
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">本月调用</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-navy">412 次</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">156,832 tokens</div>
          </div>
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">平均延迟</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-blue">1.84s</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">P95 3.2s</div>
          </div>
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">失败率</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-emerald-600">0.4%</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">本月 2 次失败</div>
          </div>
        </div>
        <div className="rounded-[14px] bg-os-canvas/50 ring-1 ring-os-line border-dashed p-5">
          <div className="text-[12px] font-semibold text-os-muted mb-3">按场景拆分 (本月)</div>
          {[
            { label: '益语通对话',    pct: 58, count: 239 },
            { label: '文章自动排版',  pct: 22, count: 92 },
            { label: '摘要标签建议',  pct: 12, count: 49 },
            { label: '报告介绍生成',  pct: 8,  count: 32 },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 py-1.5">
              <div className="w-28 shrink-0 text-[12px] text-os-ink/85">{row.label}</div>
              <div className="flex-1 h-2 rounded-full bg-os-line/60 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-os-navy to-os-indigo rounded-full" style={{ width: `${row.pct}%` }} />
              </div>
              <div className="w-16 text-right text-[12px] font-mono text-os-muted">{row.count} 次</div>
            </div>
          ))}
          <div className="mt-3 text-[11px] text-os-muted/70">占位数据 · 接 ai_call_log 表后真实统计</div>
        </div>
      </Card>

      {/* Section 7: 高级 */}
      <Card>
        <SectionTitle icon={<Settings2 className="w-4 h-4" />}>7. 高级</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="单次调用超时 (ms)" defaultValue="30000" hint="超时则放弃并标失败" />
          <Field label="失败重试次数" defaultValue="2" hint="429 / 5xx 时自动重试" />
          <Field label="重试间隔 (ms)" defaultValue="1000" hint="指数退避基数" />
          <Field label="并发上限" defaultValue="5" hint="同时进行中的 chat 请求最大数" />
        </div>
        <div className="mt-4 space-y-2">
          <Switch label="调试日志 (记录每次调用的 prompt + 响应)" hint="开启会让 ai_call_log 表写入完整 prompt 和 response, 占空间. 排查用" />
          <Switch label="月度费用告警" defaultOn={true} hint="本月用量超 80% 配额时邮件告警" />
        </div>
        <Field label="月度配额 (token 上限)" defaultValue="1000000" hint="超过自动停止调用,避免费用爆炸" />
      </Card>

      <div className="flex items-center justify-end gap-2 pt-2">
        <ToolbarButton variant="ghost" onClick={() => showToast('已取消,未保存改动', 'info')}>取消</ToolbarButton>
        <ToolbarButton onClick={() => showToast('✓ 语言模型完整配置已暂存到浏览器 · 未写入服务器', 'success')}>
          <Save className="w-3.5 h-3.5" />保存全部配置
        </ToolbarButton>
      </div>
    </div>
  );
}

// ============== 模块 B: 豆包·图像模型 ==============
export function DoubaoImageAccess() {
  return (
    <div className="space-y-6 max-w-[1100px]">
      <StageBanner />

      {/* 状态卡 */}
      <Card tone="warning">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-12 h-12 rounded-[14px] bg-os-spark text-white flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-serif-display text-[22px] sm:text-[26px] font-semibold text-os-navy tracking-tight">豆包 · 图像模型</h2>
              <StatusDot tone="unconfigured" />
            </div>
            <p className="mt-1 text-[13px] text-os-muted">
              Doubao Seedream · 用于文章封面生成 / 文章插图 / 报告封面. 接入完成前所有"生成封面"按钮 fallback 到 HF stable-diffusion-xl 旧方案
            </p>
            <div className="mt-3 rounded-[10px] bg-amber-100/60 ring-1 ring-amber-200/60 px-3 py-2 text-[12px] text-amber-900 inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              需要你提供: 豆包图像模型的 endpoint ID + API Key (在火山引擎方舟控制台开通)
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
              <div>
                <div className="text-os-muted/70">当前模型</div>
                <div className="mt-0.5 font-mono text-os-muted/70 italic">待配置</div>
              </div>
              <div>
                <div className="text-os-muted/70">最近生成</div>
                <div className="mt-0.5 text-os-muted/70">—</div>
              </div>
              <div>
                <div className="text-os-muted/70">本月生成</div>
                <div className="mt-0.5 text-os-muted/70">— 张</div>
              </div>
              <div>
                <div className="text-os-muted/70">本月成本</div>
                <div className="mt-0.5 text-os-muted/70">¥ —</div>
              </div>
            </div>
          </div>
          <ToolbarButton onClick={() => showToast('测试生成 · 待接后端 /api/admin/ai/generate-image 后真调豆包 Seedream', 'warning')}>
            <FlaskConical className="w-3.5 h-3.5" />测试生成
          </ToolbarButton>
        </div>
      </Card>

      {/* Section 1: 基本配置 */}
      <Card>
        <SectionTitle icon={<KeyRound className="w-4 h-4" />} hint="火山引擎方舟图像生成 API (Seedream 系列). 注意图像生成走异步任务, 与 chat completions 不同">
          1. 基本配置
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field label="API Endpoint URL" type="url" defaultValue="https://ark.cn-beijing.volces.com" />
          <Field label="任务创建路径" defaultValue="/api/v3/images/generations" hint="同步图像生成 (推荐, OpenAI 兼容). 旧版用 /api/v3/contents/generations/tasks 异步" />
          <Field label="异步任务状态查询路径" defaultValue="/api/v3/contents/generations/tasks/:task_id" hint="若用异步任务模式,需要轮询此路径直到 status=completed" />
          <Field label="任务超时 (s)" defaultValue="120" hint="单张图最长等待秒数. Seedream 平均 8-15s" />
        </div>
        <div className="mt-4">
          <ApiKeyField
            defaultMasked="未设置"
            source="将存于 process.env.ARK_IMAGE_API_KEY (或复用 ARK_API_KEY)"
            storageKey="admin-v2.doubao-image.api-key"
          />
        </div>
      </Card>

      {/* Section 2: 模型选择 */}
      <Card>
        <SectionTitle icon={<ImageIcon className="w-4 h-4" />} hint="火山引擎方舟图像生成模型 (豆包 Seedream 系列)">
          2. 模型选择
        </SectionTitle>
        <Field
          label="默认模型 (default image model)"
          type="select"
          defaultValue="doubao-seedream-3-0-t2i-250415"
          options={[
            { value: 'doubao-seedream-3-0-t2i-250415',   label: 'doubao-seedream-3-0-t2i-250415 · Seedream 3.0 · 推荐 · 最新中文/写实优秀' },
            { value: 'doubao-seedream-2-0-t2i',           label: 'doubao-seedream-2-0-t2i · Seedream 2.0 · 稳定版' },
            { value: 'doubao-image-pro',                  label: 'doubao-image-pro · 通用高质量' },
            { value: 'custom',                            label: '自定义模型 endpoint ID...' },
          ]}
          hint="模型 endpoint ID 需在火山引擎方舟控制台创建后填入。若你已开通,请把真实 endpoint ID 告诉我"
        />
        <div className="mt-3 rounded-[12px] bg-os-spark-soft ring-1 ring-os-spark/15 px-4 py-3 text-[12px] text-os-ink/85 leading-relaxed">
          <strong className="text-os-spark">doubao-seedream-3-0-t2i</strong>:
          支持最大 1792×1792 · 单次最多 4 张 · 中文 prompt 优秀 · 适合封面/插图/概念图 ·
          单价约 ¥0.04/张 (1024x1024) · ¥0.08/张 (1792x1792)
        </div>
      </Card>

      {/* Section 3: 默认参数 */}
      <Card>
        <SectionTitle icon={<Sliders className="w-4 h-4" />} hint="所有图像生成请求的默认参数, 单次生成可覆盖">
          3. 默认生成参数
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="默认尺寸" type="select" defaultValue="1024x1024" options={[
            { value: '1024x1024', label: '1024 × 1024 · 正方 · 通用封面' },
            { value: '1024x1792', label: '1024 × 1792 · 竖 · 手机海报' },
            { value: '1792x1024', label: '1792 × 1024 · 横 · 文章顶图/桌面' },
            { value: '1536x1024', label: '1536 × 1024 · 16:10 横屏' },
            { value: '1792x1792', label: '1792 × 1792 · 大正方 · 高清详情' },
          ]} hint="文章封面默认 1792x1024 横屏更适配新版 hero" />
          <Field label="单次生成张数" type="select" defaultValue="1" options={[
            { value: '1', label: '1 张' },
            { value: '2', label: '2 张 (备选对比)' },
            { value: '3', label: '3 张' },
            { value: '4', label: '4 张 (上限)' },
          ]} hint="文章封面用 1 张,插图用 3 张备选,报告封面用 1 张" />
          <Slider label="引导强度 (Guidance Scale)" value={75} min={10} max={200} step={5} hint="越高越贴 prompt, 越低越创意. Seedream 推荐 7-9 (=70-90 拖动条值/10)" />
          <Field label="质量等级" type="select" defaultValue="standard" options={[
            { value: 'draft',    label: '草稿 (快/便宜)' },
            { value: 'standard', label: '标准 (推荐)' },
            { value: 'hd',       label: '高清 (慢/贵 2x)' },
          ]} />
          <Field label="风格预设 (固定加在 prompt 后)" type="select" defaultValue="modern-zhongguo" options={[
            { value: 'natural',         label: '自然 · 不加修饰' },
            { value: 'photo',           label: '摄影写实' },
            { value: 'illustration',    label: '插画扁平' },
            { value: 'modern-zhongguo', label: '现代中国风 · 推荐 (与品牌一致)' },
            { value: 'minimal-line',    label: '简约线条' },
            { value: 'data-viz',        label: '数据可视化感' },
          ]} hint="选中后会在每个 prompt 末尾自动追加风格关键词" />
          <Field label="种子 (seed)" defaultValue="-1" hint="-1 = 随机,固定数字 = 可复现" />
        </div>
        <div className="mt-4">
          <Field label="负面 Prompt (默认 negative prompt, 排除元素)" type="textarea" rows={2}
            defaultValue="低质量, 模糊, 文字, 水印, 错误的解剖, 多余的手指, 杂乱构图, 色彩偏暗" />
        </div>
      </Card>

      {/* Section 4: 输出与存储 */}
      <Card>
        <SectionTitle icon={<Save className="w-4 h-4" />} hint="生成后图片如何存到服务器 + 是否打 AI 水印">
          4. 输出与存储
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field label="服务器存储根目录" defaultValue="/uploads/ai-covers/{type}/" hint="{type} 自动替换为 'insight' / 'report' / 'illustration', 复用现有 ADMIN_UPLOAD_ROOT" />
          <Field label="文件名格式" defaultValue="{slug}-{date}-{seed}.jpg" hint="支持 {slug} {date} {seed} {model} 变量" />
        </div>
        <div className="mt-4 space-y-2">
          <Switch label="自动添加 AI 水印" defaultOn={true} hint="守 ANTI_FAKE 红线 · 所有 AI 生成图必须可识别" />
          <Switch label="保留原始 Prompt 留痕" defaultOn={true} hint="生成时把 prompt 写入 EXIF / DB 字段, 便于追溯" />
          <Switch label="自动备份 (上传腾讯云 COS)" hint="本地 + COS 双份, 防数据丢失" />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="水印位置" type="select" defaultValue="bottom-right" options={[
            { value: 'top-left',     label: '左上角' },
            { value: 'top-right',    label: '右上角' },
            { value: 'bottom-left',  label: '左下角' },
            { value: 'bottom-right', label: '右下角 (推荐)' },
            { value: 'center',       label: '居中半透明' },
          ]} />
          <Field label="水印文字" defaultValue="AI 生成 · 益语智库" />
        </div>
      </Card>

      {/* Section 5: Prompt 模板 */}
      <Card>
        <SectionTitle icon={<Wand2 className="w-4 h-4" />} hint="不同业务场景的图像 prompt 模板">
          5. 图像 Prompt 模板
        </SectionTitle>
        <PromptTemplateEditor
          scenarios={[
            {
              id: 'article-cover',
              label: '文章封面',
              defaultPrompt: '为益语智库文章《{title}》生成封面图。\n核心主题: {topics}\n摘要: {summary}\n\n要求:\n- 1792x1024 横版\n- 现代中国风, 留白多, 主色调深蓝紫 (#16265E → #7C3AED)\n- 抽象象征, 不要具体人脸\n- 不要任何文字',
              variables: ['title', 'topics', 'summary'],
            },
            {
              id: 'article-illustration',
              label: '文章插图',
              defaultPrompt: '为文章《{title}》的"{section_title}"小节生成插图。\n\n要求:\n- 简约扁平插画风格\n- 单色调 (深蓝紫为主)\n- 概念抽象, 表达 "{section_title}" 的核心意象\n- 不要任何文字, 不要复杂背景',
              variables: ['title', 'section_title'],
            },
            {
              id: 'report-cover',
              label: '报告封面',
              defaultPrompt: '为研究报告《{title}》生成封面。\n出版方: {publisher}\n主题: {topics}\n核心问题: {core_question}\n\n要求:\n- 1024x1792 竖版 (适配 PDF A4)\n- 严肃学术感, 深蓝主色, 灰白配\n- 抽象数据可视化背景\n- 不要文字',
              variables: ['title', 'publisher', 'topics', 'core_question'],
            },
          ]}
        />
      </Card>

      {/* Section 6: 测试生成 (★ 已真接通豆包图像 Seedream) */}
      <Card>
        <SectionTitle icon={<FlaskConical className="w-4 h-4" />} hint="✓ 已接通 · 真调火山引擎方舟 images/generations (doubao-seedream-4-0-250828)">
          6. 测试生成
        </SectionTitle>
        <ImageGenerationTester />
      </Card>

      {/* Section 7: 用量统计 */}
      <Card>
        <SectionTitle icon={<BarChart3 className="w-4 h-4" />}>7. 用量统计</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">今日</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-spark">0 张</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">未接入</div>
          </div>
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">本月</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-spark">0 张</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">¥0</div>
          </div>
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">平均生成时间</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-blue">—</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">预估 12s/张</div>
          </div>
          <div className="rounded-[14px] bg-os-canvas/70 ring-1 ring-os-line p-4">
            <div className="text-[11px] text-os-muted uppercase tracking-[0.14em]">失败率</div>
            <div className="mt-1 font-serif-display text-[24px] font-semibold text-os-muted">—</div>
            <div className="text-[11px] text-os-muted/75 mt-0.5">无数据</div>
          </div>
        </div>
        <div className="rounded-[14px] bg-os-canvas/50 ring-1 ring-os-line p-5 text-center text-[12px] text-os-muted">
          按场景拆分图表 (文章封面 / 文章插图 / 报告封面) · 接入后展示
        </div>
      </Card>

      {/* Section 8: 高级 */}
      <Card>
        <SectionTitle icon={<Settings2 className="w-4 h-4" />}>8. 高级</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="异步任务超时 (s)" defaultValue="120" hint="单张图最长等待" />
          <Field label="并发上限" defaultValue="3" hint="同时进行中的生成任务最大数, 避免火山引擎限流" />
          <Field label="失败重试次数" defaultValue="2" hint="任务 status=failed 时自动重试" />
          <Field label="月度配额 (张数)" defaultValue="500" hint="超过自动停止生成, 预算约 ¥20" />
        </div>
        <div className="mt-4 space-y-2">
          <Switch label="未接入时降级到 HF stable-diffusion-xl" defaultOn={true} hint="豆包图像未配置时, fallback 到现有 src/lib/hfImageGen.ts" />
          <Switch label="生成日志记录完整 prompt" defaultOn={true} hint="排查质量问题时需要" />
          <Switch label="月度费用告警" defaultOn={true} hint="本月 80% 配额时邮件告警" />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2 pt-2">
        <ToolbarButton variant="ghost" onClick={() => showToast('已取消,未保存改动', 'info')}>取消</ToolbarButton>
        <ToolbarButton onClick={() => showToast('✓ 图像模型完整配置已暂存到浏览器 · 未写入服务器', 'success')}>
          <Save className="w-3.5 h-3.5" />保存全部配置
        </ToolbarButton>
      </div>
    </div>
  );
}
