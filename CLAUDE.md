# 益语智库官网 + 手机版 · 仓库说明（给所有 AI 读）

> ⚠️ **这是益语智库官方网站(含手机自适应版)的代码仓库。改动会直接影响线上 https://www.yiyu.love 。**
> **没有用户的明确指令,不要修改、构建或部署这个仓库的任何内容。**

## 这是什么

- **官网网页 + 手机版是同一套代码**:桌面访问看网页版;手机访问(视口宽度 < 768px,由 `src/lib/useIsMobile.ts` 的 `useIsMobile()` 判定)自动切换到手机壳 `src/components/mobile/MobileAppShell.tsx`(底部 Tab:首页 / 文章 / 报告 / 益语AI)。
  - 手机版"不显示、退回桌面版"时,优先查:线上是不是被回退成了不含手机壳的旧 bundle;以及 `index.html` 的 viewport meta 在不在。
- 这里**只有官网**。桌面软件 / 手机 APP / cloud_backend 在另一个仓库 `guyuan9300-max/yiyu-thinktank-workbench`,**不要混淆**。

## 唯一真相源 = 本仓库的 `main`

- 主仓库:`github.com/guyuan9300/yiyu-think-tank-website`,**`main` 分支是唯一真相源,也是唯一部署源**。
- ❌ **绝不要在游离的 feature 分支上改完就直接 rsync 部署**。那样改动不在 `main` 里,别人(或同事)从 `main` 重新部署时会把你的改动整段覆盖掉。
  - 这个坑 2026-06 已经踩过:手机版等一串改动只在 `feat/mobile-app-shell` 分支 + 直接部署,没进 main,结果同事从主仓重新部署时线上被回退、手机版消失。
- ✅ 正确做法:所有改动**在 `main` 上做**(或基于最新 `main` 开短命分支、改完立刻 fast-forward 合回 `main`),然后**从 `main` 构建部署**。

## 部署方式（仅在收到明确"部署/上线"指令时执行）

1. 构建:`SHARE_BASE_ORIGIN='https://yiyu.love' CONTENT_SNAPSHOT_URL='https://yiyu.love/api/content-snapshot' npm run build:ip`
2. 备份线上:ssh 后先把 `/var/www/yiyu-site` 关键文件备份到 `/home/ubuntu/yiyu-backups/`
3. 部署:`rsync -rlptz --exclude=ai-generated --rsync-path="sudo rsync"` 推 `dist/` 到 `ubuntu@www.yiyu.love:/var/www/yiyu-site/`
   - **绝不带 `--delete`**(会删掉线上独有的 admin.html / reports / docs / ai-generated 等)
4. SSH 私钥:`~/.ssh/yiyu_site_colleague_20260604`(用户本机)。本机代理可能用 fake-ip 挡 SSH/HTTPS,连不上时让用户加直连/关 TUN。
5. 后端服务在**线上服务器**,不在本仓库:auth-api(8791) `/srv/yiyu-auth-api/pg-auth-api.mjs`、content-api(8790) `/srv/yiyu-content-api/pg-content-api.mjs`。**只改线上,别从本地副本推覆盖**(本地副本比线上旧)。

## 协作纪律

- 多个 AI / 人协作:**碰云(部署、改服务器)之前先说一声**,统一以 `main` 为准,别互相 rsync 覆盖。
- commit / 部署前 `git log --all --since` 查别的 AI 有没有并行插入 commit。

---
*最后更新:2026-06-08 —— 确立 `main` 为官网唯一真相源,把此前游离在 feature 分支的全部改动合并归位,杜绝再被主仓部署覆盖。*
