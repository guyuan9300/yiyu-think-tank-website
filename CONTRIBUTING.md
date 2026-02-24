# Contributing Guide

This repo is deployed via **GitHub Pages**. We collaborate in the same repository (no forks).

## Requirements

- Node.js **20** (recommended: use `.nvmrc`)
- npm

## Setup

```bash
git clone https://github.com/guyuan9300/yiyu-think-tank-website.git
cd yiyu-think-tank-website

# Node 20
nvm use

npm ci
npm run dev
```

Build check (required before opening PR):

```bash
npm run build
```

## Branch naming

- `feat/<short-desc>`
- `fix/<short-desc>`
- `chore/<short-desc>`

Example:

- `fix/report-reader-not-found`

## Pull request rules (IMPORTANT)

We allow many people to merge, but we protect `main` with strict rules.

A PR can be merged only when:

1. ✅ **CI** passes (at least `npm run build`)
2. ✅ Branch is **up-to-date** with `main`
3. ✅ **2 approvals**
4. ✅ All conversations are resolved

## QA checklist

Before merge, run through:

- See `docs/QA-CHECKLIST.md`

## Commit style (recommended)

- Prefer small, focused commits
- Use clear messages like:
  - `Fix: ...`
  - `Feat: ...`
  - `Chore: ...`
