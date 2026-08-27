const books = [
  { number: '总', label: '总纲', title: '拟建公共图书馆建设与可持续运营体系', short: '使用总指引', question: '从建设决策到持续运营，一套手册如何协同工作？', description: '以公共价值为起点，统筹建设、治理、服务、资源、数字、安全、财务与评估，让图书馆从开馆之初就具备长期运营能力。', chapters: ['为什么建', '建成什么', '服务谁', '怎么做好', '如何长久'], keywords: ['建设决策', '开馆筹备', '长期运营', '知识库与工具'] },
  { number: '一', label: '第一册', title: '总体运营与治理指引', short: '使命、治理与年度闭环', question: '如何让图书馆的使命、权责与日常行动保持一致？', description: '建立面向公共价值的治理结构、职责边界与年度运行节奏，让每项新增事项都能被判断、执行和复盘。', chapters: ['使命与公共价值', '治理结构与权责', '年度计划与资源', '决策与复盘机制'], keywords: ['使命', '治理', '权责', '年度计划'] },
  { number: '二', label: '第二册', title: '建设与运营衔接指引', short: '从空间交付到可运营', question: '怎样避免“建得漂亮，却不好运营”？', description: '把运营需求前置到规划、设计、施工、验收与移交全过程，以真实使用场景检验空间和设施。', chapters: ['运营需求前置', '空间与动线', '设备与系统联调', '验收与移交'], keywords: ['建设', '运营前置', '空间', '移交'] },
  { number: '三', label: '第三册', title: '组织架构岗位与人员管理指引', short: '让组织真正运转', question: '岗位、人员和协作机制如何匹配服务目标？', description: '从工作任务出发配置组织、岗位与能力，形成可协作、可培训、可评价的人力运行体系。', chapters: ['组织架构', '岗位与编制', '招聘与培训', '绩效与协作'], keywords: ['组织', '岗位', '能力', '协作'] },
  { number: '四', label: '第四册', title: '馆藏资源建设与图书业务指引', short: '让资源回应真实需求', question: '如何构建兼顾地方使命、专业判断与使用数据的馆藏？', description: '用读者需求、地方使命、专业判断和使用数据共同支持馆藏决策，建立持续更新的资源体系。', chapters: ['馆藏发展政策', '资源采购与加工', '典藏与流通', '馆藏评估与更新'], keywords: ['馆藏政策', '资源建设', '流通', '评估'] },
  { number: '五', label: '第五册', title: '读者服务与场馆日常运营指引', short: '把服务落实到现场', question: '怎样让每一次到馆都稳定、友好且有回应？', description: '围绕读者旅程组织开放、咨询、借阅、空间与特殊人群服务，形成稳定清晰的现场标准。', chapters: ['读者旅程', '基础服务标准', '空间日常运营', '投诉与服务改进'], keywords: ['读者服务', '开放', '现场', '服务改进'] },
  { number: '六', label: '第六册', title: '设施物业安全与突发事件指引', short: '守住稳定运行底线', question: '设施、安全与应急如何成为一套日常机制？', description: '把设施维护、物业协作、风险巡查与突发事件响应连接起来，保护人员、资产与服务连续性。', chapters: ['设施设备管理', '物业运行协作', '安全风险巡查', '应急响应与恢复'], keywords: ['设施', '物业', '安全', '应急'] },
  { number: '七', label: '第七册', title: '数字系统数据与信息安全指引', short: '以数据支持服务', question: '数字化如何真正支持读者、业务与管理？', description: '建立适度、可靠、可维护的数字系统与数据治理框架，在提升服务的同时守住信息安全边界。', chapters: ['数字系统架构', '数据标准与治理', '数字服务运营', '信息安全与隐私'], keywords: ['数字系统', '数据治理', '数字服务', '信息安全'] },
  { number: '八', label: '第八册', title: '公共服务活动与合作项目指引', short: '让活动产生公共价值', question: '活动与合作如何从“热闹一次”走向长期价值？', description: '以公共需求为依据设计活动与合作项目，建立策划、执行、风险与评估的完整项目机制。', chapters: ['需求与主题策划', '活动执行标准', '伙伴关系与合作', '项目评估与沉淀'], keywords: ['公共活动', '项目', '合作', '评估'] },
  { number: '九', label: '第九册', title: '财务资产采购与可持续运营指引', short: '让资源配置可持续', question: '怎样用有限资源稳定支持公共服务？', description: '从稳定基本保障、完整成本预算到规范采购资产、社会资源和审慎经营，建立可追溯的资源配置机制。', chapters: ['预算与成本', '采购与合同', '资产与物资', '多元资源与可持续'], keywords: ['财务', '预算', '采购', '资产'] },
  { number: '十', label: '第十册', title: '运营评估年度报告与持续改进指引', short: '用证据推动改进', question: '如何把评估变成组织持续学习的工具？', description: '用指标、证据、年度报告和改进机制连接目标与行动，让经验得以积累，让问题获得回应。', chapters: ['评估框架', '指标与证据', '年度报告', '持续改进闭环'], keywords: ['评估', '指标', '年度报告', '持续改进'] },
];

const state = { activeBook: 0, items: [], token: localStorage.getItem('yiyu_auth_token') || '', selectedFiles: [] };
const quickPrompts = ['这册最适合谁先读？', '给我一个落地顺序', '最容易忽略的风险是什么？'];
const $ = (selector) => selector.startsWith('.') ? document.querySelector(selector) : document.getElementById(selector);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function activeBook() { return books[state.activeBook]; }

function renderBookNav(target = $('bookNav')) {
  target.replaceChildren();
  books.forEach((book, index) => {
    const button = element('button', `book-row${index === state.activeBook ? ' active' : ''}`);
    button.type = 'button';
    const number = element('span', 'spine-number', book.number);
    const copy = element('span');
    copy.append(element('b', '', `${book.label} · ${book.title}`), element('small', '', book.short));
    button.append(number, copy, element('i', '', '›'));
    button.addEventListener('click', () => selectBook(index));
    target.append(button);
  });
}

function renderBook() {
  const book = activeBook();
  $('heroNumber').textContent = book.number;
  $('heroLabel').textContent = `${book.label} · ${book.short}`;
  $('heroTitle').textContent = book.title;
  $('heroQuestion').textContent = book.question;
  $('heroDescription').textContent = book.description;
  $('agentBasis').textContent = `${book.label} · ${book.short}`;
  $('chapterCount').textContent = `${String(book.chapters.length).padStart(2, '0')} 个主题`;
  $('keywordList').replaceChildren(...book.keywords.map((word) => element('span', '', word)));
  $('chapterList').replaceChildren(...book.chapters.map((chapter, index) => {
    const item = element('li');
    item.append(element('span', '', String(index + 1).padStart(2, '0')), element('b', '', chapter));
    return item;
  }));
  $('uploadVolume').value = String(state.activeBook);
  renderBookNav();
  renderDocuments();
  resetConversation();
  $('viewerSection').hidden = true;
  closeSheet();
}

function selectBook(index) {
  state.activeBook = index;
  renderBook();
  $('readingPanel').scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function itemsForBook() { return state.items.filter((item) => Number(item.volume) === state.activeBook); }
function fileType(item) { return (item.originalName.split('.').pop() || 'FILE').toUpperCase().slice(0, 5); }
function readableSize(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function readableDate(value) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }

function renderDocuments(target = $('documentList')) {
  target.replaceChildren();
  const items = itemsForBook();
  if (!items.length) {
    const empty = element('div', 'empty-documents');
    empty.append(element('b', '', '本册尚未上传云端资料'), element('p', '', '管理员可上传 PDF、Word、Markdown、文本或图片；上传后会在这里形成该分册的资料清单。'));
    target.append(empty);
    return;
  }
  items.forEach((item) => {
    const card = element('article', 'document-card');
    const icon = element('span', 'file-type', fileType(item));
    const copy = element('div');
    copy.append(element('b', '', item.title), element('small', '', `${item.originalName} · ${readableSize(item.size)} · ${readableDate(item.uploadedAt)}`));
    const actions = element('div', 'document-actions');
    const read = element('button', '', item.mimeType === 'application/pdf' || item.originalName.toLowerCase().endsWith('.pdf') ? '在线阅读' : '打开文件');
    read.type = 'button';
    read.addEventListener('click', () => openDocument(item));
    const download = element('a', '', '下载');
    download.href = item.url;
    download.download = item.originalName;
    if (state.token) {
      const remove = element('button', 'remove', '移除');
      remove.type = 'button';
      remove.addEventListener('click', () => removeDocument(item));
      actions.append(read, download, remove);
    } else actions.append(read, download);
    card.append(icon, copy, actions);
    target.append(card);
  });
}

function openDocument(item) {
  const isPdf = item.mimeType === 'application/pdf' || item.originalName.toLowerCase().endsWith('.pdf');
  if (!isPdf || window.matchMedia('(max-width: 920px)').matches) {
    window.open(item.url, '_blank', 'noopener');
    return;
  }
  $('viewerTitle').textContent = item.title;
  $('viewerOpen').href = item.url;
  $('documentViewer').src = item.url;
  $('viewerSection').hidden = false;
  $('viewerSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadItems() {
  try {
    const response = await fetch('/api/library-handbook/items', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '资料清单读取失败');
    state.items = payload.items || [];
    renderDocuments();
  } catch (error) {
    const empty = element('div', 'empty-documents');
    empty.append(element('b', '', '云端资料服务暂时不可用'), element('p', '', error.message));
    $('documentList').replaceChildren(empty);
  }
}

function resetConversation() {
  $('messages').replaceChildren(element('div', 'message agent', `我正在阅读《${activeBook().title}》。你可以先了解本册的阅读顺序、适用对象和常见风险。当前是结构演示，接入全文与模型后才会引用原文回答。`));
}

function reply(question) {
  const book = activeBook();
  if (question.includes('谁') || question.includes('适合')) return `建议先由直接负责“${book.keywords.slice(0, 2).join('、')}”的负责人阅读，再组织跨部门共读。决策者先看原则和边界，一线团队重点看流程与检查项。`;
  if (question.includes('顺序') || question.includes('开始') || question.includes('落地')) return `可以分三步：先对照“${book.chapters[0]}”确认目标，再用“${book.chapters[1]}”明确责任与条件，最后把“${book.chapters.at(-1)}”纳入固定复盘。`;
  if (question.includes('风险') || question.includes('忽略')) return '最需要防止的是只做一次性交付、没有形成持续机制。建议同步检查责任人、时间节奏、记录证据和复盘入口是否齐全。';
  return `我会先用“${book.question}”校准问题，再从${book.chapters.slice(0, 3).map((item) => `“${item}”`).join('、')}三个层面拆解。当前尚未接入真实模型与全文检索。`;
}

function ask(text) {
  const clean = text.trim();
  if (!clean) return;
  $('messages').append(element('div', 'message user', clean), element('div', 'message agent', reply(clean)));
  $('messages').scrollTop = $('messages').scrollHeight;
}

function openSheet(kind) {
  const content = $('sheetContent');
  restoreAgentPanel();
  content.replaceChildren();
  if (kind === 'books') {
    $('sheetKicker').textContent = '全部手册';
    $('sheetTitle').textContent = '总纲与十个分册';
    const nav = element('nav', 'book-nav');
    renderBookNav(nav);
    content.append(nav);
  } else {
    $('sheetKicker').textContent = '随册讨论';
    $('sheetTitle').textContent = activeBook().title;
    content.append($('.agent-inner'));
  }
  $('mobileSheet').hidden = false;
}
function restoreAgentPanel() {
  const agent = $('sheetContent')?.querySelector('.agent-inner');
  if (agent) $('.agent-panel').append(agent);
}
function closeSheet() {
  restoreAgentPanel();
  $('mobileSheet').hidden = true;
}

async function verifySession() {
  if (!state.token) return false;
  try {
    const response = await fetch('/api/auth/session', { headers: { Authorization: `Bearer ${state.token}` } });
    const payload = await response.json();
    const user = payload?.data?.user || payload?.user;
    return response.ok && user?.adminRole === 'admin';
  } catch { return false; }
}

async function openManager() {
  $('loginError').textContent = '';
  $('uploadError').textContent = '';
  const isAdmin = await verifySession();
  $('loginView').hidden = isAdmin;
  $('uploadView').hidden = !isAdmin;
  if (!isAdmin && state.token) {
    state.token = '';
    localStorage.removeItem('yiyu_auth_token');
    renderDocuments();
  }
  $('manageDialog').showModal();
}

async function login(event) {
  event.preventDefault();
  $('loginError').textContent = '';
  const target = $('loginTarget').value.trim();
  try {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: target.includes('@') ? 'email' : 'phone', target, password: $('loginPassword').value }) });
    const payload = await response.json();
    const token = payload?.data?.token || payload?.token;
    if (!response.ok || !token) throw new Error(payload?.error || payload?.message || '账号或密码不正确');
    state.token = token;
    localStorage.setItem('yiyu_auth_token', token);
    if (!(await verifySession())) throw new Error('当前账号不是管理员，无法上传资料');
    $('loginView').hidden = true;
    $('uploadView').hidden = false;
    renderDocuments();
  } catch (error) {
    state.token = '';
    localStorage.removeItem('yiyu_auth_token');
    $('loginError').textContent = error.message;
  }
}

function updateSelectedFiles(files) {
  state.selectedFiles = [...files];
  $('uploadQueue').replaceChildren(...state.selectedFiles.map((file) => {
    const row = element('div', 'queue-item');
    row.dataset.name = file.name;
    row.append(element('span', '', `${file.name} · ${readableSize(file.size)}`), element('progress'));
    return row;
  }));
}

async function upload(event) {
  event.preventDefault();
  $('uploadError').textContent = '';
  if (!state.selectedFiles.length) { $('uploadError').textContent = '请先选择至少一个文件'; return; }
  const volume = $('uploadVolume').value;
  const customTitle = $('uploadTitle').value.trim();
  try {
    for (const file of state.selectedFiles) {
      if (file.size > 64 * 1024 * 1024) throw new Error(`${file.name} 超过 64 MB`);
      const params = new URLSearchParams({ filename: file.name, volume, title: state.selectedFiles.length === 1 && customTitle ? customTitle : file.name.replace(/\.[^.]+$/, '') });
      const response = await fetch(`/api/library-handbook/items?${params}`, { method: 'POST', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `${file.name} 上传失败`);
      const progress = [...$('uploadQueue').children].find((node) => node.dataset.name === file.name)?.querySelector('progress');
      if (progress) progress.value = 1;
    }
    state.activeBook = Number(volume);
    state.selectedFiles = [];
    $('uploadFiles').value = '';
    $('uploadTitle').value = '';
    $('uploadQueue').replaceChildren();
    await loadItems();
    renderBook();
    $('manageDialog').close();
    $('documentHeading').scrollIntoView({ behavior: 'smooth' });
  } catch (error) { $('uploadError').textContent = error.message; }
}

async function removeDocument(item) {
  if (!confirm(`确定从云端资料清单中移除“${item.title}”吗？文件也会一并删除。`)) return;
  try {
    const response = await fetch(`/api/library-handbook/items/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '移除失败');
    await loadItems();
  } catch (error) { alert(error.message); }
}

function setup() {
  books.forEach((book, index) => $('uploadVolume').append(new Option(`${book.label} · ${book.title}`, String(index))));
  renderBook();
  $('promptList').replaceChildren(...quickPrompts.map((prompt) => { const button = element('button', '', prompt); button.type = 'button'; button.addEventListener('click', () => ask(prompt)); return button; }));
  $('agentForm').addEventListener('submit', (event) => { event.preventDefault(); ask($('agentQuery').value); $('agentQuery').value = ''; });
  document.querySelectorAll('[data-mobile-panel]').forEach((button) => button.addEventListener('click', () => { if (window.innerWidth <= 920) openSheet(button.dataset.mobilePanel); }));
  $('mobileFilesButton').addEventListener('click', () => $('documentHeading').scrollIntoView({ behavior: 'smooth' }));
  $('.sheet-backdrop').addEventListener('click', closeSheet);
  $('.sheet-close').addEventListener('click', closeSheet);
  $('manageButton').addEventListener('click', openManager);
  $('uploadInlineButton').addEventListener('click', openManager);
  $('.dialog-close').addEventListener('click', () => $('manageDialog').close());
  $('loginForm').addEventListener('submit', login);
  $('uploadForm').addEventListener('submit', upload);
  $('logoutButton').addEventListener('click', () => { state.token = ''; localStorage.removeItem('yiyu_auth_token'); $('manageDialog').close(); renderDocuments(); });
  $('uploadFiles').addEventListener('change', (event) => updateSelectedFiles(event.target.files));
  ['dragenter', 'dragover'].forEach((name) => $('dropZone').addEventListener(name, (event) => { event.preventDefault(); $('dropZone').classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((name) => $('dropZone').addEventListener(name, (event) => { event.preventDefault(); $('dropZone').classList.remove('dragging'); if (name === 'drop') updateSelectedFiles(event.dataTransfer.files); }));
  loadItems();
}

setup();
