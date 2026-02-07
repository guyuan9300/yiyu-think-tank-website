# QA Checklist (Pre-merge / Pre-release)

## Auth / Session
- [ ] Login works (email/password)
- [ ] Logout works
- [ ] Remember-me behavior is correct (if applicable)

## Navigation
- [ ] Clicking top-left brand ("益语智库") returns to Home
- [ ] SPA page switch resets scroll to top

## Reports / Library
- [ ] Report library shows cover images correctly
- [ ] Clicking a report opens detail/reader (no infinite loading)
- [ ] Mobile: report/book reading page is scrollable

## Strategy companion
- [ ] Mobile layout not broken, images not broken (GitHub Pages base path)
- [ ] Annual finish-line section renders for client (north star / deliverables / next 14 days)

## Subscription
- [ ] Home "订阅前沿" button opens subscription sheet

## Build
- [ ] `npm run build` passes
