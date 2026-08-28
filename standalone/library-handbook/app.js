const state = {
  books: [],
  activeBook: 0,
  activeSection: 0,
  sectionCache: new Map(),
  sectionGeneration: 0,
  items: [],
  token: localStorage.getItem('yiyu_auth_token') || '',
  selectedFiles: [],
};

const quickPrompts = ['这册最适合谁先读？', '给我一个落地顺序', '最容易忽略的风险是什么？'];
const $ = (selector) => selector.startsWith('.') ? document.querySelector(selector) : document.getElementById(selector);

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function activeBook() { return state.books[state.activeBook]; }
function activeSection() { return activeBook()?.sections[state.activeSection]; }
function readableSize(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function readableDate(value) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
function readableCharacters(value) { return `${new Intl.NumberFormat('zh-CN').format(value || 0)} 字`; }

function renderBookNav(target = $('bookNav')) {
  const buttons = state.books.map((book, index) => {
    const button = element('button', `book-row${index === state.activeBook ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.bookIndex = String(index);
    button.setAttribute('aria-current', index === state.activeBook ? 'page' : 'false');
    const copy = element('span');
    copy.append(element('b', '', book.label), element('small', '', book.short));
    button.append(element('span', 'spine-number', book.number), copy, element('i', '', '›'));
    button.addEventListener('click', () => selectBook(index));
    return button;
  });
  target.replaceChildren(...buttons);
}

function renderChapterList(target = $('chapterList')) {
  const book = activeBook();
  if (!book) return;
  target.replaceChildren(...book.sections.map((section, index) => {
    const item = element('li');
    const button = element('button', index === state.activeSection ? 'active' : '');
    button.type = 'button';
    button.dataset.sectionIndex = String(index);
    button.setAttribute('aria-current', index === state.activeSection ? 'true' : 'false');
    button.append(element('span', '', String(index + 1).padStart(2, '0')), element('b', '', section.title), element('small', '', readableCharacters(section.characters)));
    button.addEventListener('click', () => selectSection(index));
    item.append(button);
    return item;
  }));
}

function updateChapterSelection() {
  document.querySelectorAll('[data-section-index]').forEach((button) => {
    const selected = Number(button.dataset.sectionIndex) === state.activeSection;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
}

function renderBook() {
  const book = activeBook();
  if (!book) return;
  $('heroNumber').textContent = book.number;
  $('heroLabel').textContent = `${book.label} · ${book.short}`;
  $('heroTitle').textContent = book.title;
  $('heroQuestion').textContent = book.question;
  $('heroDescription').textContent = book.description;
  $('keywordList').replaceChildren(...book.keywords.map((keyword) => element('span', '', keyword)));
  $('chapterCount').textContent = `${book.sections.length} 个章节单元`;
  $('agentBasis').textContent = `${book.label}《${book.title}》`;
  $('uploadVolume').value = String(state.activeBook);
  renderBookNav();
  renderChapterList();
  renderDocuments();
  resetConversation();
  void loadSection();
  closeSheet();
}

function selectBook(index) {
  if (index < 0 || index >= state.books.length) return;
  state.activeBook = index;
  state.activeSection = 0;
  renderBook();
  $('readingPanel').scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sectionUrl(book, section) {
  return `./content/books/${book.id}/sections/${section.id}.json`;
}

function pruneSectionCache() {
  while (state.sectionCache.size > 8) {
    const oldest = state.sectionCache.keys().next().value;
    state.sectionCache.delete(oldest);
  }
}

async function fetchSection(book, section) {
  const key = `${book.id}/${section.id}`;
  if (state.sectionCache.has(key)) {
    const cached = state.sectionCache.get(key);
    state.sectionCache.delete(key);
    state.sectionCache.set(key, cached);
    return cached;
  }
  const response = await fetch(sectionUrl(book, section), { cache: 'force-cache' });
  if (!response.ok) throw new Error(`正文载入失败（${response.status}）`);
  const payload = await response.json();
  state.sectionCache.set(key, payload);
  pruneSectionCache();
  return payload;
}

function renderImage(block) {
  const figure = element('figure', 'manual-figure manual-block');
  const image = element('img');
  image.src = `./content/${block.src}`;
  image.alt = block.alt || '手册插图';
  image.loading = 'lazy';
  image.decoding = 'async';
  if (block.width && block.height) {
    image.width = block.width;
    image.height = block.height;
    figure.style.setProperty('--figure-ratio', `${block.width} / ${block.height}`);
  }
  figure.append(image);
  return figure;
}

function renderBlock(block) {
  if (block.type === 'heading') {
    const level = Math.min(4, Math.max(2, Number(block.level) || 2));
    const node = element(`h${level}`, `manual-heading manual-block level-${level}`);
    node.innerHTML = block.html;
    return node;
  }
  if (block.type === 'paragraph') {
    const classes = ['manual-paragraph', 'manual-block', ...(block.classes || [])].join(' ');
    const node = element('p', classes);
    node.innerHTML = block.html;
    return node;
  }
  if (block.type === 'list') {
    const node = element(block.ordered ? 'ol' : 'ul', 'manual-list manual-block');
    node.replaceChildren(...block.items.map((item) => {
      const entry = element('li');
      entry.innerHTML = item.html;
      return entry;
    }));
    return node;
  }
  if (block.type === 'table') {
    const node = element('div', 'manual-table manual-block');
    node.innerHTML = block.html;
    node.querySelectorAll('img').forEach((image) => {
      image.loading = 'lazy';
      image.decoding = 'async';
    });
    return node;
  }
  if (block.type === 'note') {
    const node = element('aside', 'manual-note manual-block');
    node.append(element('b', '', `${block.kind || '注释'} ${block.id || ''}`.trim()), element('p', '', block.text || ''));
    return node;
  }
  if (block.type === 'image') return renderImage(block);
  return null;
}

function renderSectionPayload(payload) {
  const fragment = document.createDocumentFragment();
  let pendingFigure = null;
  payload.blocks.forEach((block) => {
    const node = renderBlock(block);
    if (!node) return;
    if (pendingFigure && block.type === 'paragraph' && (block.classes || []).includes('caption')) {
      const caption = element('figcaption');
      caption.innerHTML = block.html;
      pendingFigure.append(caption);
      pendingFigure = null;
      return;
    }
    fragment.append(node);
    pendingFigure = block.type === 'image' ? node : null;
  });
  $('manualArticle').replaceChildren(fragment);
}

function updateSectionControls(section) {
  const book = activeBook();
  const atFirst = state.activeSection === 0;
  const atLast = state.activeSection === book.sections.length - 1;
  ['previousSection', 'previousSectionFooter'].forEach((id) => { $(id).disabled = atFirst; });
  ['nextSection', 'nextSectionFooter'].forEach((id) => { $(id).disabled = atLast; });
  $('sectionProgress').textContent = `${book.label} · 第 ${state.activeSection + 1} / ${book.sections.length} 节`;
  $('nativeReaderHeading').textContent = section.title;
  $('sectionStats').textContent = `${readableCharacters(section.characters)} · ${section.tables} 表 · ${section.images} 图`;
  updateChapterSelection();
}

function prefetchNextSection() {
  const book = activeBook();
  const next = book.sections[state.activeSection + 1];
  if (!next) return;
  const run = () => fetchSection(book, next).catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1600 });
  else window.setTimeout(run, 500);
}

async function loadSection({ scroll = false } = {}) {
  const book = activeBook();
  const section = activeSection();
  if (!book || !section) return;
  const generation = ++state.sectionGeneration;
  updateSectionControls(section);
  $('manualArticle').replaceChildren();
  $('manualArticle').setAttribute('aria-busy', 'true');
  $('nativeLoading').hidden = false;
  $('nativeLoading').textContent = '正在载入本章内容……';
  try {
    const payload = await fetchSection(book, section);
    if (generation !== state.sectionGeneration) return;
    renderSectionPayload(payload);
    $('manualArticle').setAttribute('aria-busy', 'false');
    $('nativeLoading').hidden = true;
    if (scroll) $('nativeReaderSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    prefetchNextSection();
  } catch (error) {
    if (generation !== state.sectionGeneration) return;
    $('manualArticle').setAttribute('aria-busy', 'false');
    $('nativeLoading').hidden = false;
    $('nativeLoading').textContent = `本章暂时无法载入：${error.message}`;
  }
}

function selectSection(index) {
  if (index < 0 || index >= activeBook().sections.length) return;
  state.activeSection = index;
  closeSheet();
  void loadSection({ scroll: true });
}

function changeSection(offset) {
  selectSection(state.activeSection + offset);
}

async function copyCurrentSection() {
  const text = $('manualArticle').innerText.trim();
  if (!text) return;
  const button = $('copySection');
  try {
    await navigator.clipboard.writeText(`${activeSection().title}\n\n${text}`);
    button.textContent = '已复制';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($('manualArticle'));
    selection.removeAllRanges();
    selection.addRange(range);
    button.textContent = '正文已选中';
  }
  window.setTimeout(() => { button.textContent = '复制本章'; }, 1800);
}

function itemsForBook() { return state.items.filter((item) => Number(item.volume) === state.activeBook); }
function fileType(item) { return (item.originalName.split('.').pop() || 'FILE').toUpperCase().slice(0, 5); }

function renderDocuments(target = $('documentList')) {
  target.replaceChildren();
  const items = itemsForBook();
  if (!items.length) {
    const empty = element('div', 'empty-documents');
    empty.append(element('b', '', '本册正文已完整转为网页内容'), element('p', '', '正文可选择、复制，但页面不可直接编辑。这里仅用于放置今后新增的补充资料。'));
    target.append(empty);
    return;
  }
  items.forEach((item) => {
    const card = element('article', 'document-card');
    const icon = element('span', 'file-type', fileType(item));
    const copy = element('div');
    copy.append(element('b', '', item.title), element('small', '', `${item.originalName} · ${readableSize(item.size)} · ${readableDate(item.uploadedAt)}`));
    const actions = element('div', 'document-actions');
    const open = element('a', '', '打开');
    open.href = item.url;
    open.target = '_blank';
    open.rel = 'noopener';
    const download = element('a', '', '下载');
    download.href = item.url;
    download.download = item.originalName;
    actions.append(open, download);
    if (state.token) {
      const remove = element('button', 'remove', '移除');
      remove.type = 'button';
      remove.addEventListener('click', () => removeDocument(item));
      actions.append(remove);
    }
    card.append(icon, copy, actions);
    target.append(card);
  });
}

async function loadItems() {
  try {
    const response = await fetch('/api/library-handbook/items', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '资料清单读取失败');
    state.items = payload.items || [];
    renderDocuments();
  } catch (error) {
    console.warn('Supplemental document service unavailable', error);
    renderDocuments();
  }
}

function resetConversation() {
  $('messages').replaceChildren(element('div', 'message agent', `我正在阅读《${activeBook().title}》的“${activeSection().title}”。当前正文已经上线，但问答仍是界面演示，尚未接入真实模型。`));
}

function reply(question) {
  const book = activeBook();
  const section = activeSection();
  if (question.includes('谁') || question.includes('适合')) return `建议先由直接负责“${book.keywords.slice(0, 2).join('、')}”的负责人阅读，再组织跨部门共读。`;
  if (question.includes('顺序') || question.includes('开始') || question.includes('落地')) return `建议从“${book.sections[0].title}”建立共同背景，再按目录推进到当前章节“${section.title}”。`;
  if (question.includes('风险') || question.includes('忽略')) return '最需要防止的是只做一次性交付、没有形成持续机制。建议同步检查责任人、时间节奏、记录证据和复盘入口。';
  return `我会围绕“${book.question}”拆解你的问题，并优先引用“${section.title}”。当前尚未接入真实模型与全文检索。`;
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
  } else if (kind === 'chapters') {
    $('sheetKicker').textContent = activeBook().label;
    $('sheetTitle').textContent = '本册章节';
    const list = element('ol', 'chapter-list mobile-chapter-list');
    renderChapterList(list);
    content.append(list);
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
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: target.includes('@') ? 'email' : 'phone', target, password: $('loginPassword').value }),
    });
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
      const response = await fetch(`/api/library-handbook/items?${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `${file.name} 上传失败`);
      const progress = [...$('uploadQueue').children].find((node) => node.dataset.name === file.name)?.querySelector('progress');
      if (progress) progress.value = 1;
    }
    state.activeBook = Number(volume);
    state.activeSection = 0;
    state.selectedFiles = [];
    $('uploadFiles').value = '';
    $('uploadTitle').value = '';
    $('uploadQueue').replaceChildren();
    await loadItems();
    renderBook();
    $('manageDialog').close();
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

function bindEvents() {
  $('promptList').replaceChildren(...quickPrompts.map((prompt) => {
    const button = element('button', '', prompt);
    button.type = 'button';
    button.addEventListener('click', () => ask(prompt));
    return button;
  }));
  $('agentForm').addEventListener('submit', (event) => { event.preventDefault(); ask($('agentQuery').value); $('agentQuery').value = ''; });
  document.querySelectorAll('[data-mobile-panel]').forEach((button) => button.addEventListener('click', () => { if (window.innerWidth <= 920) openSheet(button.dataset.mobilePanel); }));
  $('mobileChaptersButton').addEventListener('click', () => openSheet('chapters'));
  $('.sheet-backdrop').addEventListener('click', closeSheet);
  $('.sheet-close').addEventListener('click', closeSheet);
  $('previousSection').addEventListener('click', () => changeSection(-1));
  $('previousSectionFooter').addEventListener('click', () => changeSection(-1));
  $('nextSection').addEventListener('click', () => changeSection(1));
  $('nextSectionFooter').addEventListener('click', () => changeSection(1));
  $('copySection').addEventListener('click', copyCurrentSection);
  $('manageButton').addEventListener('click', openManager);
  $('uploadInlineButton').addEventListener('click', openManager);
  $('.dialog-close').addEventListener('click', () => $('manageDialog').close());
  $('loginForm').addEventListener('submit', login);
  $('uploadForm').addEventListener('submit', upload);
  $('logoutButton').addEventListener('click', () => { state.token = ''; localStorage.removeItem('yiyu_auth_token'); $('manageDialog').close(); renderDocuments(); });
  $('uploadFiles').addEventListener('change', (event) => updateSelectedFiles(event.target.files));
  ['dragenter', 'dragover'].forEach((name) => $('dropZone').addEventListener(name, (event) => { event.preventDefault(); $('dropZone').classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((name) => $('dropZone').addEventListener(name, (event) => { event.preventDefault(); $('dropZone').classList.remove('dragging'); if (name === 'drop') updateSelectedFiles(event.dataTransfer.files); }));
}

async function init() {
  bindEvents();
  try {
    const response = await fetch('./content/manifest.json', { cache: 'force-cache' });
    if (!response.ok) throw new Error(`目录载入失败（${response.status}）`);
    const manifest = await response.json();
    if (!Array.isArray(manifest.books) || manifest.books.length !== 11) throw new Error('手册目录不完整');
    state.books = manifest.books;
    state.books.forEach((book, index) => $('uploadVolume').append(new Option(`${book.label} · ${book.title}`, String(index))));
    renderBook();
    void loadItems();
  } catch (error) {
    $('nativeLoading').hidden = false;
    $('nativeLoading').textContent = `手册内容暂时无法载入：${error.message}`;
  }
}

void init();
