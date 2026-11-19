# Changelog

## [1.3.0] - 2026-11-19
### Added
- 快捷键：z 专注、p 日/月切换、m 音效
- 深链：?sound=1、?accent=#RRGGBB 自定义强调色；复制链接携带币种与周期
- 分享面板：navigator.share 系统分享（支持时显示）
- 首次访问跟随系统明暗（浅色 → 纸墨皮）
### Fixed
- SW 缓存 Frankfurter 汇率，离线也能换算币种


## [1.2.0] - 2026-11-19

### Added
- Skins: 霓虹 neon, 极简 mono, 纸墨 paper (light); default template is now 存钱罐 pig
- t key cycles skins; ?skin= alias; share-intent links (X / 微博 / Telegram) in share dialog
- SW: stale-entry pruning; segment-bars aria-label; apple-web-app-title, format-detection metas
- check_site.py: manifest JSON + template-button/JS-whitelist consistency checks
- FAQ: skins + PWA entries (HTML + JSON-LD)

## [1.1.0] - 2026-11-19

### Added
- PWA: service worker offline cache, manifest shortcuts, install prompt (i key)
- Deep links: ?currency ?period ?demo ?focus ?title params; 复制分享文案 button
- SEO/GEO: BreadcrumbList JSON-LD, sitemap hreflang+lastmod, rel=author/me, llms.txt
- CI: site-check workflow + tests/check_site.py; pages deploy workflow
- Repo: LICENSE, CONTRIBUTING, SECURITY, CHANGELOG, issue & PR templates, 404 page, .editorconfig/.gitattributes/.gitignore/.nojekyll
- Fixes: DST-safe earnings, live segment bars, copy-link URL validation

## v1.1 — 2026-11-19
- 站点从单文件快照重构为可维护的静态项目（3.3MB → ~250KB 首载）
- SEO/GEO 全套：OG/Twitter/JSON-LD FAQ、robots、sitemap、llms.txt、manifest
- 深链分享：`?salary=&template=&currency=&demo=`
- 键盘快捷键、标签页标题实时收入、分享框复制链接
- a11y：skip-link、noscript、reduced-motion、真实 h1

## v1.0
- 薪动初版：实时工资秒表、四套皮肤、节假日排班、加班、多币种、分享海报
