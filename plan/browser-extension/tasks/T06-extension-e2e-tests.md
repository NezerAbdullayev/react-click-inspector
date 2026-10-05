# T06: Playwright e2e testləri və CI

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-e2e-tests` |
| Baza | `master` (T05 merge olunandan sonra) |
| Asılıdır | T05 |
| Paralel işləyə bilər | – |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | M |

## Məqsəd
Extension-ı real Chromium-da yükləyib əsas ssenariləri avtomatik yoxlamaq və bunu CI-a qoşmaq.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `.github/workflows/ci.yml` (mövcud)
- `src/__tests__/ReactClickInspector.test.tsx` (ssenarilər üçün nümunə)

## Toxunula bilən fayllar
- `extension/e2e/**` (yeni)
- `package.json`, `package-lock.json` (`@playwright/test`, `ext:e2e` skripti)
- `.github/workflows/ci.yml`
- `.gitignore` (Playwright artefaktları)
- `vitest.config.mts`, `extension/vitest.config.mts` (yalnız e2e istisnası pozulubsa)

## Addımlar
1. **`extension/e2e/fixture/`:** minimal Vite + React 18 tətbiqi. Tərkibi: düymə və counter, link, ayrıca faylda `LibraryButton` (`ignoredPaths` testi üçün). Vite config-də test üçün `/__open-in-editor` sorğularını qeydə alan kiçik middleware olur (redaktor real açılmır, sorğu yaddaşda saxlanır və `/__rci-test/last-open` ilə oxunur).
2. **Playwright:** `chromium.launchPersistentContext` + `--disable-extensions-except` və `--load-extension=extension/dist`. Fixture `webServer` ilə başladılır.
3. **Ssenarilər:**
   - status: popup "React dev build tapıldı" göstərir;
   - copy: klik tətbiqə çatmır, clipboard-da test faylının yolu olur (`context.grantPermissions(['clipboard-read'])`);
   - vscode: `HTMLAnchorElement.prototype.click` stub-lanır, link formatı yoxlanılır;
   - webstorm: middleware düzgün `file=<abs>:<line>:1` sorğusunu alır;
   - `ignoredPaths`: popup-dan `fixtures` daxil edilir, nəticə valideyn komponentin faylıdır;
   - Esc ləğv edir; qısayol `Alt+Shift+C`.
4. **CI:** ayrıca `extension` job: `npm ci`, `npx playwright install --with-deps chromium`, `npm run ext:build`, `npm run ext:test`, `npm run ext:e2e`. Extension-lar headless rejimdə də işlədiyi üçün yeni headless Chromium istifadə olunur.

## Qəbul meyarları
- [ ] `npm run ext:e2e` lokal olaraq keçir
- [ ] `npm test` və `npm run ext:test` `extension/e2e/**/*.spec.ts` fayllarını götürmür (T02-dəki `include`/`exclude` sayəsində; yoxla, pozulubsa vitest config-lərini düzəlt)
- [ ] CI workflow sintaksisi düzgündür (`act` olmadan da: YAML yoxlanılır, job-lar mövcud skriptləri çağırır)
- [ ] Flaky test yoxdur: ardıcıl 3 dəfə işlədildikdə keçir

## Əhatədən kənar
- Firefox dəstəyi
