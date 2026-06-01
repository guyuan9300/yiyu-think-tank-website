// ============================================================
// 报告 AI 问答 · 调后台豆包语言大模型
// ------------------------------------------------------------
// 复用 admin 已验证可用的链路: POST /api/admin/ai/chat/completions
// (OpenAI 兼容, 走 vite dev proxy → 火山引擎方舟豆包)。
// 以报告的 Markdown 全文作 grounding, 模型只依据报告内容回答, 减少编造。
// 上线到云端时, 只需把 ENDPOINT 换成 cloud_backend 的同形端点即可。
// ============================================================

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const ENDPOINT = '/api/admin/ai/chat/completions';
const MODEL = 'doubao-seed-2-0-pro-260215';

export interface AskReportAIInput {
  reportTitle: string;
  context: string; // 报告 Markdown (已截断到安全长度)
  history: ChatMsg[];
  question: string;
}

export async function askReportAI(input: AskReportAIInput): Promise<string> {
  const system = [
    '你是益语智库的「报告助手」。请严格依据下面这份报告的内容回答用户的问题：',
    '- 只使用报告中出现的事实、数据、结论；不要编造报告里没有的内容。',
    '- 如果报告中没有相关信息，就如实说明「报告中未提及」，可建议用户换个角度提问。',
    '- 回答用中文，简洁、有条理；涉及排名或数字时，尽量引用报告中的具体数值。',
    '',
    `===== 报告《${input.reportTitle}》内容开始 =====`,
    input.context,
    '===== 报告内容结束 =====',
  ].join('\n');

  const messages = [
    { role: 'system', content: system },
    ...input.history.slice(-8), // 仅带最近若干轮, 控制上下文长度
    { role: 'user', content: input.question },
  ];

  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 1536, temperature: 0.4 }),
  });

  const data = await resp.json().catch(() => ({} as any));
  if (!resp.ok) {
    const msg = data?.error?.message || `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  const content: string = data?.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('AI 返回为空，请稍后重试');
  return content;
}
