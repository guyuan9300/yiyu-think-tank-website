import { useEffect, useState } from 'react';
import type { Bilingual } from './i18n';

// ============================================================
// 现金流量表 · 平台总账 · 共享数据层 (本地 localStorage 桥)
// ------------------------------------------------------------
// 前台(首页 Ledger 平台总账卡 + 现金流量表抽屉)与后台(资金账本)
// 共用这一份数据。后台 save 写 localStorage, 前台 useCashFlow() 实时读。
//
// 模型: opening(期初) + inflows[](收入科目) + outflows[](支出科目)。
//   累计流入/流出/结余由金额自动汇总; 占比与配色由前台按序计算(此层不存)。
//
// ⚠️ 现为 localStorage 本地桥, 只在当前浏览器生效; 晚点接 cloud_backend
//    只需把 load/save 换成云端读写, 前后台组件不用改。
// ============================================================

export interface Transaction {
  date: string;
  party: Bilingual;
  amount: string; // 元 (字符串, 保留千分位写法)
}

export interface CashFlowItem {
  name: Bilingual;
  subtitle: Bilingual;
  amount: number; // 万元
  transactions: Transaction[];
  moreCount?: number; // "… 还有 N 笔"
}

export interface CashFlowData {
  opening: number; // 期初余额 (万元)
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
}

export interface CashFlowTotals {
  totalIn: number;
  totalOut: number;
  balance: number;
}

export function computeTotals(d: CashFlowData): CashFlowTotals {
  const totalIn = d.inflows.reduce((s, x) => s + (x.amount || 0), 0);
  const totalOut = d.outflows.reduce((s, x) => s + (x.amount || 0), 0);
  return { totalIn, totalOut, balance: d.opening + totalIn - totalOut };
}

export const DEFAULT_CASH_FLOW: CashFlowData = {
  // 公司成立以来累计 · 数据来自【益语文化】2026 合同表(2026-05 录入)
  opening: 121.97, // 期初余额(万元)
  inflows: [
    { name: { zh: "个人捐赠", en: "Individual donations" }, subtitle: { zh: "", en: "" }, amount: 480.0, transactions: [] },
    { name: { zh: "企业捐赠", en: "Corporate donations" }, subtitle: { zh: "", en: "" }, amount: 1320.0, transactions: [] },
    { name: { zh: "咨询收入", en: "Consulting income" }, subtitle: { zh: "27 笔", en: "27 entries" }, amount: 1210.05, transactions: [] },
    { name: { zh: "其他收入", en: "Other income" }, subtitle: { zh: "32 笔", en: "32 entries" }, amount: 84.19, transactions: [] },
  ],
  outflows: [
    { name: { zh: "人员行政支出", en: "Personnel & admin" }, subtitle: { zh: "", en: "" }, amount: 220.0, transactions: [] },
    { name: { zh: "业务实施支出", en: "Program implementation" }, subtitle: { zh: "", en: "" }, amount: 2420.09, transactions: [] },
    { name: { zh: "行业支持支出", en: "Sector support" }, subtitle: { zh: "", en: "" }, amount: 58.93, transactions: [] },
    { name: { zh: "行动者支持计划支出", en: "Practitioner support program" }, subtitle: { zh: "", en: "" }, amount: 25.26, transactions: [] },
    { name: { zh: "剩下的支出", en: "Other spending" }, subtitle: { zh: "", en: "" }, amount: 95.0, transactions: [] },
  ],
};

const KEY = 'yiyu_cash_flow_v1';
export const CASH_FLOW_EVENT = 'yiyu:cash-flow-changed';

export function loadCashFlow(): CashFlowData {
  if (typeof localStorage === 'undefined') return DEFAULT_CASH_FLOW;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CASH_FLOW;
    const parsed = JSON.parse(raw) as Partial<CashFlowData>;
    return {
      opening: typeof parsed.opening === 'number' ? parsed.opening : DEFAULT_CASH_FLOW.opening,
      inflows: Array.isArray(parsed.inflows) ? (parsed.inflows as CashFlowItem[]) : DEFAULT_CASH_FLOW.inflows,
      outflows: Array.isArray(parsed.outflows) ? (parsed.outflows as CashFlowItem[]) : DEFAULT_CASH_FLOW.outflows,
    };
  } catch {
    return DEFAULT_CASH_FLOW;
  }
}

export function saveCashFlow(data: CashFlowData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(CASH_FLOW_EVENT));
}

export function resetCashFlow(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(CASH_FLOW_EVENT));
}

export function useCashFlow(): CashFlowData {
  const [data, setData] = useState<CashFlowData>(loadCashFlow);
  useEffect(() => {
    const reload = (): void => setData(loadCashFlow());
    window.addEventListener(CASH_FLOW_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(CASH_FLOW_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return data;
}
