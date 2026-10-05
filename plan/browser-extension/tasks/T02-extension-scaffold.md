# T02: Extension skeleti, manifest, build və ortaq fayllar

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-scaffold` |
| Baza | `master` |
| Asılıdır | – |
| Paralel işləyə bilər | T01 |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | M–L |

## Məqsəd
`extension/` qovluğunda Manifest V3 skeleti qurmaq: build olunur, "Load unpacked" ilə yüklənir, hər skript konsola yükləndiyini yazır. Bundan əlavə, T03 və T04-ün paylaşdığı bütün fayllar burada **tam** yazılır: mesaj tipləri və yoxlayıcılar, ayarlar, `chrome` mock-u, test və typecheck infrastrukturu. Bundan sonra T03 və T04 bir-birinə toqquşmadan paralel işləyə bilər.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/ARCHITECTURE.md`: qovluq strukturu, mesaj protokolu, "Mesajların yoxlanması", "Test və typecheck", D2, D3, D4, D9, D13

## Toxunula bilən fayllar
- `extension/**` (yeni)
- `package.json` (yalnız `scripts` və `devDependencies`)
- `package-lock.json`
- `tsconfig.json` (yalnız `exclude`, lazım olsa)
- `vitest.config.mts` (kök: `include` və `exclude`)
- `eslint.config.mjs` (`extension/dist`-i ignore etmək, extension üçün `globals.webextensions`)
- `.gitignore` (`extension/dist`)

## Addımlar
1. **`extension/manifest.json` (MV3):**
   - `background.service_worker`: `background.js` (`type: module`)
   - `content_scripts`: `content-bridge.js` (ISOLATED) və `page-inspector.js` (`"world": "MAIN"`), `run_at: document_idle`, `matches`: `http://localhost/*`, `http://127.0.0.1/*`
   - `action.default_popup`: `popup.html`
   - `permissions`: `storage`, `activeTab`, `scripting`. `optional_host_permissions`: `<all_urls>`
   - `commands`: `activate-copy` (`Alt+Shift+C`), `activate-editor` (`Alt+Shift+O`)
   - `minimum_chrome_version`: `"111"`
2. **`extension/src/shared/messages.ts` (tam):** ARCHITECTURE-dəki bütün tiplər (`InspectorMode`, `ActiveMode`, `FailReason`, `IPageStatus`, `BridgeToPage`, `PageToBridge`, `RuntimeRequest`, `RuntimeResponse`, `RuntimeEvent`). Əlavə olaraq struktur yoxlayıcıları: `isBridgeToPage(data)`, `isPageToBridge(data)`, `isRuntimeRequest(msg)`. Yoxlayıcılar `source`, `type`, `mode` dəyərlərini və sahələrin tiplərini yoxlayır, `unknown` qəbul edir.
3. **`extension/src/shared/settings.ts` (tam):** `IExtensionSettings`, `DEFAULT_SETTINGS`, `loadSettings()`, `saveSettings()`, `onSettingsChanged(cb)` (`chrome.storage.sync`), ayarları normallaşdıran `normalizeSettings(raw)`.
4. **Giriş faylları (placeholder):** `background.ts`, `content-bridge.ts`, `page-inspector.ts`, `popup/popup.html`, `popup/popup.ts`, `popup/popup.css`. Hər biri yalnız yükləndiyini log edir.
5. **TypeScript:** `extension/tsconfig.json` (`types: ["chrome"]`, `lib: ["DOM", "ES2022"]`, `include: ["src", "test"]`), devDependency `@types/chrome`. Kök `typecheck` skripti: `tsc --noEmit && tsc --noEmit -p extension`. Kök `tsconfig.json` extension-ı daxil etmir (indiki `include: ["src"]` kifayətdir).
6. **Testlər:**
   - kök `vitest.config.mts`-ə `include: ['src/**/*.test.{ts,tsx}']` əlavə olunur ki, `npm test` extension və e2e fayllarını götürməsin;
   - `extension/vitest.config.mts`: `include: ['extension/test/**/*.test.ts']`, `exclude: ['extension/e2e/**']`, `environment: 'jsdom'`, `setupFiles: ['extension/test/chromeMock.ts']`;
   - `extension/test/chromeMock.ts`: `chrome.runtime` (`sendMessage`, `onMessage`), `chrome.tabs.sendMessage`, `chrome.storage.sync`/`local` (yaddaşda), `chrome.commands.onCommand`, `chrome.scripting`, `chrome.permissions` üçün minimal mock və testlər arasında sıfırlayan `resetChromeMock()`;
   - `extension/test/shared/messages.test.ts` və `settings.test.ts`: yoxlayıcılar və ayarlar üçün testlər.
7. **Build:** `extension/tsup.config.ts`. Hər giriş üçün `iife` formatı (service worker üçün `esm`), çıxış `extension/dist/`. `manifest.json`, `popup.html`, `popup.css` və ikonlar `dist/`-ə kopyalanır.
8. Sadə placeholder ikonlar: 16, 32, 48, 128 px PNG.
9. **`package.json` skriptləri:** `ext:build`, `ext:watch`, `ext:test` (`vitest run -c extension/vitest.config.mts`). `ext:e2e` T06-da əlavə olunur.
10. `extension/README.md`: build və "Load unpacked" addımları.

## Qəbul meyarları
- [ ] `npm run ext:build` xətasız `extension/dist/` yaradır və `manifest.json` orada mövcuddur
- [ ] `npm run typecheck` extension kodunu da yoxlayır: `extension/src`-də qəsdən tip xətası yaradanda uğursuz olur (yoxla və geri qaytar)
- [ ] `npm run ext:test` keçir (messages, settings)
- [ ] `npm test` yalnız `src` testlərini işlədir (mövcud 10 test). `extension/test`-də bir test olsa belə ona düşmür
- [ ] `npm run lint`, `npm run build` keçir, npm paketinin build-i extension-dan təsirlənmir
- [ ] Playwright və ya əl ilə: Chromium `--load-extension=extension/dist` ilə açılır, `chrome://extensions`-da xəta yoxdur, localhost səhifəsində hər iki content script-in log-u görünür
- [ ] `npm pack --dry-run` çıxışında `extension/` yoxdur

## Əhatədən kənar
- İnspektor məntiqi (T03), popup UI və bridge məntiqi (T04)
