import type { YiyuTongCollectedFields, YiyuTongMultiTabExecutionPlan } from './yiyuTongApi';

export type YiyuTongExtensionPhase = 'checking' | 'opening' | 'filling' | 'waiting' | 'done' | 'error';

export interface YiyuTongExtensionStatus {
  available: boolean;
  version: string;
  hasToken: boolean;
  tokenSet: boolean;
  ready: boolean;
}

export interface ExecuteYiyuTongExtensionTaskOptions {
  plan: YiyuTongMultiTabExecutionPlan;
  onPhaseChange?: (phase: YiyuTongExtensionPhase, detail?: string) => void;
}

const PAGE_AGENT_EXT_TOKEN_KEY = 'PageAgentExtUserAuthToken';
const PAGE_AGENT_EXT_INSTALL_URL = 'https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj';

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function getPageAgentExtToken() {
  try {
    return localStorage.getItem(PAGE_AGENT_EXT_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setPageAgentExtToken(token: string) {
  try {
    localStorage.setItem(PAGE_AGENT_EXT_TOKEN_KEY, String(token || '').trim());
  } catch {
    // ignore
  }
}

export function clearPageAgentExtToken() {
  try {
    localStorage.removeItem(PAGE_AGENT_EXT_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function waitForPageAgentExt(timeout = 1200) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (window.PAGE_AGENT_EXT) return true;
    await sleep(100);
  }
  return Boolean(window.PAGE_AGENT_EXT);
}

export function getPageAgentExtStatus(): YiyuTongExtensionStatus {
  const hasToken = Boolean(getPageAgentExtToken());
  const available = Boolean(window.PAGE_AGENT_EXT);
  return {
    available,
    version: String(window.PAGE_AGENT_EXT_VERSION || window.PAGE_AGENT_EXT?.version || ''),
    hasToken,
    tokenSet: hasToken,
    ready: available && hasToken,
  };
}

export function promptAndSavePageAgentExtToken() {
  const next = window.prompt('请输入 Page Agent 扩展里的授权令牌');
  if (!next) return false;
  setPageAgentExtToken(next);
  return true;
}

export function getPageAgentExtInstallUrl() {
  return PAGE_AGENT_EXT_INSTALL_URL;
}

function buildFormInstruction(formUrl: string, fields: YiyuTongCollectedFields) {
  const filledRows = [
    ['姓名', fields.name],
    ['机构', fields.organization],
    ['手机号', fields.phone],
    ['邮箱', fields.email],
    ['需求摘要', fields.notes || fields.topic],
  ].filter(([, value]) => String(value || '').trim());

  const fieldLines = filledRows.length
    ? filledRows.map(([label, value]) => `- ${label}：${String(value).trim()}`).join('\n')
    : '- 当前暂无可填写字段，先打开表单并等待后续补充';

  return [
    `在新标签页打开这个飞书表单：${formUrl}`,
    '如果已经存在对应飞书表单标签页，就切换到那个标签页继续填写，不要重复新建多个相同标签页。',
    '只填写下面已经明确给出的字段，不要编造，也不要修改用户未提供的信息：',
    fieldLines,
    '若字段在表单中已经有值，则更新为最新给出的值。',
    '不要点击最终提交按钮。',
    '完成本轮填写后，用一句中文简洁汇报已填写了哪些字段。',
  ].join('\n');
}

export async function executeYiyuTongExtensionTask({
  plan,
  onPhaseChange,
}: ExecuteYiyuTongExtensionTaskOptions) {
  onPhaseChange?.('checking', '正在检查跨标签页执行能力。');

  const ready = await waitForPageAgentExt();
  const token = getPageAgentExtToken();
  if (!ready || !window.PAGE_AGENT_EXT || !token) {
    return {
      ok: false as const,
      needsExtension: true as const,
      error: !token ? '尚未连接 Page Agent 扩展令牌。' : '当前浏览器尚未检测到 Page Agent 扩展。',
    };
  }

  const baseURL = `${window.location.origin}/api/auth/assistant/page-agent-openai`;
  const task = plan.prompt || buildFormInstruction(plan.formUrl, plan.fields);

  try {
    const result = await window.PAGE_AGENT_EXT.execute(task, {
      baseURL,
      apiKey: 'browser-proxied',
      model: 'doubao-seed-2-0-lite-260215',
      includeInitialTab: true,
      onStatusChange: (status) => {
        if (status === 'running') {
          onPhaseChange?.('opening', '正在打开并定位飞书表单标签页。');
        } else if (status === 'completed') {
          onPhaseChange?.('done', '已完成本轮表单填写。');
        } else if (status === 'error') {
          onPhaseChange?.('error', '跨标签页表单填写未能稳定完成。');
        }
      },
      onActivity: (activity) => {
        if (activity.type === 'executing') {
          const toolName = String(activity.tool || '');
          if (/open|switch/i.test(toolName)) {
            onPhaseChange?.('opening', '正在切换或打开飞书表单标签页。');
          } else if (/input|select|click/i.test(toolName)) {
            onPhaseChange?.('filling', '正在把已知信息写入飞书表单。');
          } else {
            onPhaseChange?.('waiting', `正在执行 ${toolName || '浏览器动作'}。`);
          }
        } else if (activity.type === 'retrying') {
          onPhaseChange?.('waiting', `正在重试（${activity.attempt}/${activity.maxAttempts}）。`);
        } else if (activity.type === 'error') {
          onPhaseChange?.('error', activity.message || '跨标签页操作失败。');
        }
      },
    });

    if (result.success) {
      return { ok: true as const, data: result.data || '已完成本轮表单填写。' };
    }

    return {
      ok: false as const,
      needsExtension: false as const,
      error: result.data || '跨标签页表单填写失败。',
    };
  } catch (error: any) {
    return {
      ok: false as const,
      needsExtension: false as const,
      error: error?.message || '跨标签页表单填写失败。',
    };
  }
}
