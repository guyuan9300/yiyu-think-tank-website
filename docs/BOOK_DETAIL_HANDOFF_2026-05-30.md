# 书籍详情页 · 交接文档（2026-05-30）

> 写给下一个接手 `BookDetailPage` 的 AI / 工程师。
> 这是从用户（顾源源）确认过方向之后留下的指南。请先**读完全文再动手**——尤其是第 2 节，那是用户的最新判断，跟之前的策划文档不一样。

---

## 0 · 仓库 & 当前位置

- **本地路径**：`/Users/guyuanyuan/openclaw/workspace/yiyu-think-tank-website`
- **远程**：`https://github.com/guyuan9300/yiyu-think-tank-website`
- **分支**：`feat/admin-v2-and-page-restyle-2026-05-28`（origin 上目前没有这个分支，未推送）
- **dev 启动**：`npm run dev`，默认 `http://localhost:5173`
- **该页测试 URL**：`http://localhost:5173/?page=book-detail&id=book_51`

---

## 1 · 这一页是什么、为谁做

- 项目：益语智库官网开源版（OpenSourceHome）
- 这一页：**单本书购买详情页 ·《创业者应该回答的 51 个问题》**（planId `book_51`）
- 售价：¥198，含益语智库终身会员
- 同款页面还有 `book_org`（学习型组织笔记 ¥138）和 `book_bundle`（合购 ¥286 立省 50），但这两个走的是**简版 grid 兜底**，本文档**只关心 `book_51` 的长卷版**

---

## 2 · ★★★ 用户的最新方向（必读，跟之前的策划不一样）

用户在最后一轮给的关键反馈，一字不差：

> **"这是一个详情页，他重点是要把这个书的原稿填上去，就是原图要填上去，你不需要从原图萃取出一些东西，你卖的是书，你卖的不是你的技能。"**

翻译成执行语言：

| ❌ 错的做法（我做过被否的）                                          | ✅ 对的做法（你要做的）                                                       |
|----------------------------------------------------------------------|-------------------------------------------------------------------------------|
| 从书里萃取 "8 层成功概率分层表" 等框架，用 Tailwind 重画一遍         | 直接把书里那一页的**原图**贴上去（PNG/JPG），让书页本身说话                   |
| 用衬线大标题 + 卡片 + 装饰把书的内容"翻译"成网页 UI                  | 让书页**原汁原味**展示——读者看到的就是真正翻开书的感觉                     |
| 自己写痛点反问、立场宣言、适合谁读、"试读一道"的引子文案             | 信任书本身的内容；网页只做承载和导购                                          |
| 用我的设计感证明"这本书有干货"                                       | 用书的真实页面证明"这本书有干货"                                              |

**核心比喻**：详情页应该像"翻书预览"——读者**直接看到书里某几页的样子**，而不是看到 AI 给这本书做的二次创作。

---

## 3 · 现状（文件清单）

### 3.1 这一页的代码

- `src/components/BookDetailPage.tsx`（~580 行）
  - `BookDetailPage` 主分发：`book_51` → `BookDetail51Long`；其它 → `BookDetailSimple`
  - `BookDetail51Long` 是目前的 7 屏长卷版（**需要按第 2 节方向重做**）
  - `BookDetailSimple` 是兜底简版（暂时保留，不动）
  - 已经实现的子组件：`HeroScreen` / `PainScreen` / `PullQuoteScreen` / `TryOneQuestionScreen` / `StructureScreen` / `AboutBookScreen` / `ClosingScreen` / `StickyBuyBar`

- `src/lib/book51DetailContent.ts`（数据层）
  - 全部 10 屏的文案都在这里抽离成结构化数据
  - 包含我从书 PDF 萃取的 `pullQuote`、`tryOneQuestion`（含 8 层分层表数据）、`aboutBook`
  - **下一步会有大半被废弃**：按新方向，文案不再是主体，原书页图才是主体

- `src/lib/books.ts`
  - 书籍元数据（封面路径、价格、tagline 等）
  - 三本：`BOOK_51` / `BOOK_ORG` / `BOOK_BUNDLE`
  - **不用改**

- `src/App.tsx`
  - `?page=book-detail&id=<planId>` 路由（之前的 bug 已修，从首页书架点过来 id 会正确传到 planId）
  - 不要动路由

### 3.2 资产位置

- 现有封面：`public/images/books/`
  - `book-51-questions-cover.png`（51 问书封）
  - `book-learning-org.png`（学习型组织笔记书封）

- 用户上传的原书 PDF：
  - `/Users/guyuanyuan/Library/Application Support/Claude/local-agent-mode-sessions/.../uploads/创业者应该回答的51个问题(1).pdf`
  - 118 页，每页是一张高质量印刷图（**纯图层，没有文字层 OCR 不出来**）
  - 这是接下来核心要用的资产

- 用户上传的策划文档：
  - 同目录下 `创业51问详情页策划.docx`
  - **注意**：策划是早期方向（10 屏长卷叙事），用户最新一轮反馈已经把方向改成"贴原图"。策划可以当做"装饰区域应该说什么"的参考，但**不再是页面主体的指导**

### 3.3 现有 7 屏的取舍建议

| 屏 | 现状 | 新方向建议 |
|----|------|------------|
| 01 Hero | 大标题 + 4 关键词 chip + 立体书封 + 价格 CTA | **保留**，氛围 + CTA 还需要 |
| 02 痛点 | 6 个 AI 写的反问 + 收束 | **建议删或换成"翻书预览"导引**——这些不是书里的内容 |
| 03 样章试读 | 我抽的一句金句 blockquote（深 navy 段） | **换成书内某一页的原图**（比如序言整页） |
| 04 试读一道 | 我重画的 Q01 + 8 层表（白底卡片） | **换成书页 5-6 的原图**（Q01 的真实跨页） |
| 05 结构总览 | ABCD 4 卡 + 每卡 4 代表问题 | **换成书页 5-6 的目录原图**（目录拍摄感比代码渲染更真实） |
| 06 关于本书 | 联合出品方 chip + 4 行实体信息 | **保留**——这是元信息，本来就不在书里 |
| 07 购买收束 | 大标题 + 4 条理由 + 价格 + bundle 引导 | **保留**——CTA 终点 |

最干净的新结构（仅参考，用户没拍板）：

```
01 Hero
02 ★ 翻书预览 1·序言或第一章扉页（原书页图）
03 ★ 翻书预览 2·目录全貌（原书页图）
04 ★ 翻书预览 3·任意问题的完整跨页（原书页图，做 lightbox 可放大）
05 关于本书（出品方 + 实体信息）
06 购买收束 + bundle 引导
```

---

## 4 · 工程层面：原书页图怎么处理

### 4.1 PDF 转 PNG

机器上 `pdftoppm` 已经装好。原书在 user upload 目录里。命令（在 macOS 上你本地跑）：

```bash
mkdir -p public/images/book-51-pages
pdftoppm -r 200 -png \
  "/Users/guyuanyuan/Library/Application Support/Claude/local-agent-mode-sessions/.../uploads/创业者应该回答的51个问题(1).pdf" \
  public/images/book-51-pages/p
```

或者只渲染你想要的几页（更小）：

```bash
pdftoppm -r 200 -png -f 5 -l 12 ... public/images/book-51-pages/p
```

- `-r 200` = 200 DPI，1 页大约 1MB；上线前可以再用 `pngquant` 或 `sharp` 压到 300-500KB
- 渲染出来的文件名是 `p-001.png` `p-002.png` ...
- 建议挑 3-6 张代表性页面（封面已经有了，不要重复）

### 4.2 图片资产管理

- 放到 `public/images/book-51-pages/`
- Vite 直接走 `/images/book-51-pages/p-005.png` 这种绝对路径就能访问
- 图片要做 **lazy-load**（`loading="lazy"`）+ 明确 `width/height`，防止滚动跳动
- 推荐用 `srcset` 提供 1x / 2x，但单本书不上 CDN 的话 1x 200dpi 就够清晰

### 4.3 翻书预览组件建议

每张原书页应该可以：

1. 默认尺寸：宽 ~720px，等比缩放
2. 居中 + 一个非常轻的阴影（让它看起来像翻开的纸页）
3. 点击：弹出 lightbox 全屏预览（最大化到 viewport，可以拖滚或滑动看细节）
4. 旁边带一行小字标注："—— 节选自第 X 章 · 第 X 页"（这是**唯一**需要 AI/工程师写的话，其它都是图）
5. 图片之间留宽白（py-20 sm:py-24）

如果想做"翻书感"动效，进入视口时来一点 transform 微动（`translateY(8px) → 0` + opacity）就够了，不要再叠 3D 翻页这种花活。

### 4.4 现有 `book51DetailContent.ts` 怎么处理

- 保留：`hero` / `aboutBook` / `closing`
- 删除：`pain` / `pullQuote` / `tryOneQuestion` / `structure`（不再用了）
- 新增：`pagePreviews: Array<{ src: string; caption: string; alt: string }>`——指向 `public/images/book-51-pages/p-NNN.png` 的几张代表页

---

## 5 · 我犯过的错（别重蹈覆辙）

1. **把书内容用 Tailwind 重画了一遍**——比如把书页 6 的「成功概率分层表」用 React 组件 + 渐进条形可视化重做。用户说这是错的，因为这卖的是我的设计感而不是书。
2. **写了大量"AI 化"的修辞包装**——痛点反问、反鸡血宣言、"先读一道免费"这种 hook。用户对这种品牌话术的容忍度很低，他更想要"诚实地把书摆出来"。
3. **路由问题被一拖再拖**：`?page=book-detail&id=book_51` 从首页书架点过来时，App.tsx 的 `handleNavigate` / `buildUrlForState` / `popstate` 3 处都没处理 `book-detail`，导致 `selectedDetailId` 拿不到，页面显示 `¥0 / 书籍`。我已经修了。**不要再回退这部分**。

---

## 6 · 不能动 / 不能编

- **不要伪造作者评价、读者反馈、销量数据**——ANTI_FAKE 红线
- **不要编造书的页数 / 出版方 / 副书名**——已知事实：118 页，益语智库 + ETHOS CAPITAL 联合出品，副书名"创业者赋能手册"
- **不要从书里抄长段落到 React 组件里**——如果想呈现一段文字，要么用原页图（截图），要么用书前面已经印好的金句（pullQuote 类型，不超过 100 字）
- **不要再给原图加自己的可视化包装**——比如别在原页图旁边再画一个进度条解释。**原图就是原图**。

---

## 7 · 落地步骤建议

1. 跟用户确认要哪几页作为预览（建议：封面 + 序言 1 页 + 目录 1 页 + 任意一道完整的题，3-4 张就够）
2. 在本地 `pdftoppm` 渲染那几页到 `public/images/book-51-pages/`
3. 改 `book51DetailContent.ts`：删 pain/pullQuote/tryOneQuestion/structure，加 pagePreviews
4. 改 `BookDetailPage.tsx`：删对应屏的组件，新增 `PagePreviewScreen` 组件
5. tsc 通过 + 浏览器跑一遍：`http://localhost:5173/?page=book-detail&id=book_51`
6. 移动端检查：mobile 视口下原图能不能舒服阅读（可能需要 lightbox + 双指缩放）

---

## 8 · 验收清单（给用户看的）

- [ ] Hero 屏 / 关于本书屏 / 购买收束屏 还在
- [ ] 中间至少 3 张**真实的书页原图**（不是 AI 重画的）
- [ ] 每张图带极简说明（"节选自第 X 章 第 X 页"），不超过 12 字
- [ ] 没有 AI 化的修辞屏（痛点反问、反鸡血、试读一道）
- [ ] Sticky 底部购买栏正常显示
- [ ] mobile 端原图能舒服阅读
- [ ] 路由跑通：从首页书架点过去能正确显示 book_51

---

## 9 · 还没解决的开放问题

- 用户对 `book_org`（学习型组织笔记）的详情页有没有同款"原图嵌入"要求？目前 book_org 走的是简版兜底
- bundle 详情页（合购套装）要不要双书对开的"翻书预览"？同样未确认
- 终身会员的"权益清单"要不要专门一屏？现在只在文案里提了一句"含益语智库终身会员"，但具体能看什么没列
- 顾源源本人的作者小传是否需要？目前完全没放（避免编凭据）

---

## 10 · 关联文档

- `docs/SUPPORT_POOL_DRAWER_HANDOFF.md` —— Ledger 第 2 卡支持池抽屉的实现（参考其 drawer + 子组件分离方式）
- `docs/HEROES_HANDOFF_2026-05-28.md` —— Hero 三场景演示的实现（参考 IntersectionObserver 触发动效模式）
- `创业51问详情页策划.docx`（用户上传，路径见 3.2）—— 早期 10 屏策划，仅供参考，**不再是主线**

---

> 写完。新线程接手前请认真读 **第 2 节** 和 **第 5 节** 各一遍，再读 **第 4 节**。
> 然后再跟用户确认一句："我准备贴 3-4 张原书页，请你确认哪几页可以放"。
> 不要替用户做这个决定。
