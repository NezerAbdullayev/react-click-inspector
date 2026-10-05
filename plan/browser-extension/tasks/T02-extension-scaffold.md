# T02: Extension skeleti, manifest və build

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-scaffold` |
| Baza | `master` |
| Asılıdır | – |
| Paralel işləyə bilər | T01 |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | M |

## Məqsəd
`extension/` qovluğunda Manifest V3 skeleti qurmaq: build olunur, "Load unpacked" ilə yüklənir, hər skript konsola yükləndiyini yazır. Funksionallıq hələ yoxdur.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/ARCHITECTURE.md`: qovluq strukturu, D2, D3, D4, D9

## Toxunula bilən fayllar
- `extension/**` (yeni)
- `package.json` (yalnız `scripts` və `devDependencies`)
- `package-lock.json`
- `tsconfig.json` (lazım olsa, `extension`-ı ayrıca tsconfig ilə idarə et)
- `eslint.config.mjs` (`extension/dist`-i ignore etmək üçün)
- `.gitignore` (`extension/dist`)

## Addımlar
1. `extension/manifest.json` (MV3):
   - `background.service_worker`: `background.js` (`type: module`)
   - `content_scripts`: `content-bridge.js` (ISOLATED) və `page-inspector.js` (`"world": "MAIN"`), `run_at: document_idle`, `matches`: `http://localhost/*`, `http://127.0.0.1/*`
   - `action.default_popup`: `popup.html`
   - `permissions`: `storage`, `activeTab`, `scripting`. `optional_host_permissions`: `<all_urls>`
   - `commands`: `activate-copy` (`Alt+Shift+C`), `activate-editor` (`Alt+Shift+O`)
   - `minimum_chrome_version`: `"111"`
2. `extension/src/` altında boş giriş faylları: `background.ts`, `content-bridge.ts`, `page-inspector.ts`, `popup/popup.html`, `popup/popup.ts`, `popup/popup.css`, `shared/messages.ts` (ARCHITECTURE-dəki tiplər), `shared/settings.ts` (default ayarlar).
3. `extension/tsup.config.ts`: hər giriş üçün `iife` formatı (service worker üçün `esm`), çıxış `extension/dist/`. `manifest.json`, `popup.html`, `popup.css` və ikonlar `dist/`-ə kopyalanır.
4. Sadə placeholder ikonları: 16, 32, 48, 128 px PNG.
5. `package.json` skriptləri: `ext:build`, `ext:watch`. Hələ boş olan `ext:test` qoyulur, T03-də doldurulacaq.
6. `extension/README.md`: build və "Load unpacked" addımları.

## Qəbul meyarları
- [ ] `npm run ext:build` xətasız `extension/dist/` yaradır və `manifest.json` orada mövcuddur
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` keçir, npm paketinin build-i extension-dan təsirlənmir
- [ ] Playwright və ya əl ilə: Chromium `--load-extension=extension/dist` ilə açılır, `chrome://extensions`-da xəta yoxdur, localhost səhifəsində hər iki content script-in log-u görünür
- [ ] `npm pack --dry-run` çıxışında `extension/` yoxdur

## Əhatədən kənar
- İnspektor məntiqi (T03), popup UI (T04)
