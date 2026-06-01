import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Wallet, CheckCircle2, RotateCcw, Check, TrendingUp, TrendingDown } from 'lucide-react';
import type { Bilingual } from '../../lib/i18n';
import {
  loadCashFlow,
  saveCashFlow,
  resetCashFlow,
  computeTotals,
  type CashFlowItem,
  type CashFlowData,
  type Transaction,
} from '../../lib/cashFlowData';

// ============================================================
// admin-v2 · 资金账本
// 直接编辑共享数据层 src/lib/cashFlowData.ts(= 前台「现金流量表 · 总表」)。
// 收入/支出科目可增删改; 每个科目可填金额(万元)、说明、明细流水。
// 「保存并应用到前台」→ 写 localStorage, 首页 Ledger 平台总账卡 + 现金流抽屉实时读。
// ⚠️ 现为 localStorage 本地桥(只在当前浏览器生效); 晚点接 cloud_backend
//    只需把 save/load 换成云端读写, 此组件无需改动。
// ============================================================

const wan = (n: number): string => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyBi = (): Bilingual => ({ zh: '', en: '' });
const emptyItem = (): CashFlowItem => ({ name: emptyBi(), subtitle: emptyBi(), amount: 0, transactions: [] });

type Dir = 'in' | 'out';

export function CashFlowAdmin(): JSX.Element {
  const [data, setData] = useState<CashFlowData>(loadCashFlow);
  const [draft, setDraft] = useState<{ item: CashFlowItem; dir: Dir; idx: number } | null>(null);

  const { totalIn, totalOut, balance } = computeTotals(data);

  // 自动保存: 每次改动立即写入 localStorage 并通知前台, 无需手动点保存。
  const touch = (next: CashFlowData): void => { setData(next); saveCashFlow(next); };

  const list = (dir: Dir): CashFlowItem[] => (dir === 'in' ? data.inflows : data.outflows);
  const setList = (dir: Dir, items: CashFlowItem[]): CashFlowData =>
    dir === 'in' ? { ...data, inflows: items } : { ...data, outflows: items };

  const setItemAmount = (dir: Dir, idx: number, amount: number): void =>
    touch(setList(dir, list(dir).map((x, j) => (j === idx ? { ...x, amount } : x))));
  const removeItem = (dir: Dir, idx: number): void => touch(setList(dir, list(dir).filter((_, j) => j !== idx)));
  const openNew = (dir: Dir): void => setDraft({ item: emptyItem(), dir, idx: -1 });
  const openEdit = (dir: Dir, idx: number): void => setDraft({ item: JSON.parse(JSON.stringify(list(dir)[idx])), dir, idx });

  const saveDraft = (item: CashFlowItem): void => {
    if (!draft) return;
    const { dir, idx } = draft;
    const items = idx < 0 ? [...list(dir), item] : list(dir).map((x, j) => (j === idx ? item : x));
    touch(setList(dir, items));
    setDraft(null);
  };

  const doReset = (): void => { resetCashFlow(); setData(loadCashFlow()); };

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold text-os-navy tracking-tight">资金账本 · 现金流量表</h3>
          <p className="mt-1 max-w-[640px] text-[12px] text-os-muted leading-relaxed">
            这里直接编辑前台「现金流量表 · 总表」：收入/支出科目可增删，金额(万元)可在表内直接改，点科目「编辑」可改名称、说明和明细流水。改完点右侧「保存并应用到前台」，首页平台总账卡与现金流抽屉立刻读到。
            <span className="text-amber-700">当前是本地 localStorage 桥，只在你这台浏览器生效。</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={doReset} title="丢弃改动, 恢复出厂默认数据"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-semibold bg-os-paper text-os-muted ring-1 ring-os-line hover:text-os-navy hover:ring-os-navy/30">
            <RotateCcw className="w-3.5 h-3.5" />恢复默认
          </button>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <Check className="w-4 h-4" />改动自动同步到前台
          </span>
        </div>
      </div>

      {/* 汇总卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="期初余额" tone="ink" editValue={data.opening} onChange={(v) => touch({ ...data, opening: v })} />
        <SummaryCard label="累计流入" tone="in" value={wan(totalIn)} />
        <SummaryCard label="累计流出" tone="out" value={wan(totalOut)} />
        <SummaryCard label="当前结余" tone="blue" value={wan(balance)} />
      </div>

      <CatTable dir="in" items={data.inflows} onAmount={setItemAmount} onEdit={openEdit} onRemove={removeItem} onNew={openNew} />
      <CatTable dir="out" items={data.outflows} onAmount={setItemAmount} onEdit={openEdit} onRemove={removeItem} onNew={openNew} />

      <div className="flex items-center gap-1.5 text-[12px] text-os-muted">
        <Wallet className="w-3.5 h-3.5 opacity-60" />
        说明：金额单位万元；「累计流入/流出」按科目自动汇总，「当前结余」= 期初 + 流入 − 流出。每个科目的占比与配色由前台按顺序自动生成，无需在此设置。
      </div>

      {draft && (
        <ItemEditDrawer
          item={draft.item}
          dir={draft.dir}
          isNew={draft.idx < 0}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
    </div>
  );
}

function CatTable({ dir, items, onAmount, onEdit, onRemove, onNew }: {
  dir: Dir; items: CashFlowItem[];
  onAmount: (dir: Dir, idx: number, v: number) => void;
  onEdit: (dir: Dir, idx: number) => void;
  onRemove: (dir: Dir, idx: number) => void;
  onNew: (dir: Dir) => void;
}): JSX.Element {
  const isIn = dir === 'in';
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-os-navy">
          {isIn ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
          {isIn ? '收入科目' : '支出科目'} · {items.length} 类
        </div>
        <button onClick={() => onNew(dir)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30">
          <Plus className="w-3.5 h-3.5" />新增{isIn ? '收入' : '支出'}科目
        </button>
      </div>
      <div className="rounded-[20px] ring-1 ring-os-line bg-os-paper shadow-os overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] text-os-muted uppercase border-b border-os-line">
              <th className="px-5 py-3 font-semibold">科目</th>
              <th className="px-3 py-3 font-semibold">说明</th>
              <th className="px-3 py-3 font-semibold text-right">金额(万元)</th>
              <th className="px-3 py-3 font-semibold text-right">明细</th>
              <th className="px-3 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-os-line/60 hover:bg-os-mist/40">
                <td className="px-5 py-3 font-medium text-os-navy max-w-[200px] truncate">{it.name.zh || <span className="text-os-muted">(未命名)</span>}</td>
                <td className="px-3 py-3 text-os-muted max-w-[220px] truncate">{it.subtitle.zh || '—'}</td>
                <td className="px-3 py-3 text-right">
                  <input type="number" value={it.amount} onChange={(e) => onAmount(dir, i, Number(e.target.value) || 0)}
                    className="w-[110px] text-right rounded-[8px] ring-1 ring-os-line/70 bg-os-paper px-2 py-1 text-[13px] text-os-ink tabular-nums focus:ring-os-navy/40 focus:outline-none" />
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-os-muted">{it.transactions.length} 笔{it.moreCount ? `+${it.moreCount}` : ''}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(dir, i)} className="text-os-blue hover:text-os-navy text-[12px] font-semibold mr-3"><Edit2 className="w-3.5 h-3.5 inline" /> 编辑</button>
                  <button onClick={() => onRemove(dir, i)} className="text-os-muted hover:text-rose-600" title="删除"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-7 text-center text-os-muted text-[12px]">暂无科目，点右上「新增」添加。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-[10px] ring-1 ring-os-line bg-os-paper px-3 py-2 text-[13px] text-os-ink focus:ring-os-navy/40 focus:outline-none';

function ItemEditDrawer({ item, dir, isNew, onClose, onSave }: {
  item: CashFlowItem; dir: Dir; isNew: boolean; onClose: () => void; onSave: (it: CashFlowItem) => void;
}): JSX.Element {
  const [it, setIt] = useState<CashFlowItem>(item);
  const setBi = (k: 'name' | 'subtitle', lang: 'zh' | 'en', v: string): void =>
    setIt((p) => ({ ...p, [k]: { ...p[k], [lang]: v } }));
  const setTx = (i: number, patch: Partial<Transaction>): void =>
    setIt((p) => ({ ...p, transactions: p.transactions.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const setTxParty = (i: number, lang: 'zh' | 'en', v: string): void =>
    setIt((p) => ({ ...p, transactions: p.transactions.map((t, j) => (j === i ? { ...t, party: { ...t.party, [lang]: v } } : t)) }));
  const addTx = (): void => setIt((p) => ({ ...p, transactions: [...p.transactions, { date: '', party: { zh: '', en: '' }, amount: '' }] }));
  const removeTx = (i: number): void => setIt((p) => ({ ...p, transactions: p.transactions.filter((_, j) => j !== i) }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[620px] h-full bg-os-canvas shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4 flex items-center justify-between z-10">
          <div className="font-serif-display text-[18px] font-semibold text-os-navy">
            {isNew ? '新增' : '编辑'}{dir === 'in' ? '收入' : '支出'}科目
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <BiField label="科目名称" zh={it.name.zh} en={it.name.en} onZh={(v) => setBi('name', 'zh', v)} onEn={(v) => setBi('name', 'en', v)} phZh="如 个人捐赠" />
          <BiField label="说明(科目下方小字)" zh={it.subtitle.zh} en={it.subtitle.en} onZh={(v) => setBi('subtitle', 'zh', v)} onEn={(v) => setBi('subtitle', 'en', v)} phZh="如 238 笔 · 平均 ¥2,875" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="金额（万元）"><input type="number" className={inputCls} value={it.amount} onChange={(e) => setIt((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} /></Field>
            <Field label="额外笔数提示(可空, 显示「还有 N 笔」)"><input type="number" className={inputCls} value={it.moreCount ?? ''} onChange={(e) => setIt((p) => ({ ...p, moreCount: e.target.value ? Number(e.target.value) : undefined }))} placeholder="如 232" /></Field>
          </div>

          {/* 明细流水 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-semibold text-os-navy">明细流水（展开科目时显示，可留空）</div>
              <button onClick={addTx} className="text-[12px] font-semibold text-os-blue hover:text-os-navy inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />加一笔</button>
            </div>
            <div className="space-y-2">
              {it.transactions.map((tx, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputCls} w-[72px]`} value={tx.date} onChange={(e) => setTx(i, { date: e.target.value })} placeholder="05-26" />
                  <input className={`${inputCls} flex-1`} value={tx.party.zh} onChange={(e) => setTxParty(i, 'zh', e.target.value)} placeholder="对方/用途 中文" />
                  <input className={`${inputCls} flex-1`} value={tx.party.en ?? ''} onChange={(e) => setTxParty(i, 'en', e.target.value)} placeholder="English" />
                  <input className={`${inputCls} w-[90px] text-right`} value={tx.amount} onChange={(e) => setTx(i, { amount: e.target.value })} placeholder="5,000" />
                  <button onClick={() => removeTx(i)} className="text-os-muted hover:text-rose-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {it.transactions.length === 0 && <div className="text-[12px] text-os-muted">暂无明细（科目仍可正常展示金额）</div>}
            </div>
            <p className="mt-1.5 text-[11px] text-os-muted">明细金额单位为「元」，科目金额单位为「万元」，两者口径独立（明细仅作展示举例）。</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => onSave(it)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os"><CheckCircle2 className="w-4 h-4" />完成</button>
            <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30">取消</button>
          </div>
          <p className="text-[11.5px] text-os-muted leading-relaxed">点「完成」即回到列表并自动同步到前台；首页平台总账卡与现金流抽屉会立即读到。</p>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  tone: 'ink' | 'in' | 'out' | 'blue';
  value?: string; // 只读展示(万元)
  editValue?: number; // 可编辑(期初余额, 万元)
  onChange?: (v: number) => void;
}
function SummaryCard({ label, tone, value, editValue, onChange }: SummaryCardProps): JSX.Element {
  const grad = tone === 'in' ? 'from-emerald-500/[0.10] to-emerald-500/[0.02]'
    : tone === 'out' ? 'from-rose-500/[0.10] to-rose-500/[0.02]'
    : tone === 'blue' ? 'from-os-blue/[0.10] to-os-blue/[0.02]'
    : 'from-os-navy/[0.08] to-os-navy/[0.02]';
  const text = tone === 'in' ? 'text-emerald-700' : tone === 'out' ? 'text-rose-700' : tone === 'blue' ? 'text-os-blue' : 'text-os-navy';
  return (
    <div className={`relative rounded-[20px] ring-1 ring-os-line bg-gradient-to-br ${grad} p-5`}>
      <div className="text-[12px] tracking-[0.14em] font-semibold text-os-muted uppercase">{label}</div>
      {onChange ? (
        <div className="mt-2 flex items-baseline gap-1">
          <input type="number" value={editValue} onChange={(e) => onChange(Number(e.target.value) || 0)}
            className={`w-[110px] bg-transparent font-serif-display text-[26px] font-semibold leading-none ${text} focus:outline-none border-b border-dashed border-os-line focus:border-os-navy/50 tabular-nums`} />
          <span className="text-[12px] text-os-muted font-medium">万元</span>
        </div>
      ) : (
        <div className={`mt-2 font-serif-display text-[28px] font-semibold leading-none ${text} tabular-nums`}>
          {value}<span className="text-[12px] text-os-muted font-medium ml-1">万元</span>
        </div>
      )}
    </div>
  );
}

function BiField({ label, zh, en, onZh, onEn, phZh }: {
  label: string; zh: string; en?: string; onZh: (v: string) => void; onEn: (v: string) => void; phZh?: string;
}): JSX.Element {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-os-navy mb-1.5">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} value={zh} onChange={(e) => onZh(e.target.value)} placeholder={phZh ?? '中文'} />
        <input className={inputCls} value={en ?? ''} onChange={(e) => onEn(e.target.value)} placeholder="English" />
      </div>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-os-navy mb-1.5">{label}</div>
      {children}
    </label>
  );
}
