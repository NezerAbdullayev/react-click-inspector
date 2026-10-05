# T05: Kopyalama, VS Code və WebStorm inteqrasiyası

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-editor-integrations` |
| Baza | `master` (T03 və T04 merge olunandan sonra) |
| Asılıdır | T03, T04 |
| Paralel işləyə bilər | – |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | M |

## Məqsəd
Klik nəticəsi seçilmiş rejimə görə icra olunur: yol kopyalanır, VS Code açılır və ya WebStorm dev server vasitəsilə açılır. İstifadəçi nəticəni səhifədə qısa toast ilə görür.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/README.md`: "Artıq yoxlanılmış faktlar"
- `plan/browser-extension/ARCHITECTURE.md`: D5, D6, D7
- `src/core/editorLinks.ts`

## Toxunula bilən fayllar
- `extension/src/page-inspector.ts`
- `extension/src/page/**`
- `extension/src/shared/**`
- `extension/src/popup/**` (yalnız xəta və status mətnləri)
- `extension/test/**`

## Addımlar
1. **`page/actions.ts`:**
   - `copy`: `navigator.clipboard.writeText(filePath)`. Alınmasa, `document.execCommand('copy')` ilə fallback (gizli textarea). Hər iki yol alınmasa, `editor-request-failed` olur;
   - `vscode`: `getVSCodeLink` + müvəqqəti `<a>` elementi ilə `click()`;
   - `webstorm`: `fetch(getOpenInEditorUrl(location.origin, settings.openInEditorPath, filePath, line))`. `res.ok` deyilsə və ya şəbəkə xətası olarsa, `editor-request-failed` olur.
2. **Toast:** overlay-in Shadow DOM-unda 2 saniyəlik mesaj: "Copied", "Opening in VS Code", "Opening in WebStorm" və ya xəta mətni. WebStorm xətası üçün mətn: "Dev server does not support /__open-in-editor (Vite and Rsbuild do). Set LAUNCH_EDITOR=webstorm if VS Code opens instead."
3. Popup-da WebStorm seçiləndə qısa qeyd göstərilir: "Requires Vite/Rsbuild dev server".
4. **Unit testlər:** hər üç action üçün (`fetch`, `clipboard` və anchor `click` mock-lanır), xəta yolları daxil.

## Qəbul meyarları
- [ ] `npm run ext:build`, `npm run ext:test`, `npm run typecheck`, `npm run lint` keçir
- [ ] Fixture tətbiqdə (Vite): copy düzgün yolu kopyalayır; VS Code linki `vscode://file/<abs>:<line>:1` formatındadır; WebStorm rejimi `/__open-in-editor?file=...` sorğusu göndərir və cavab 200 olur
- [ ] Əl ilə yoxlama (orkestrator Sahibin maşınında edir): WebStorm faylı düzgün sətirdə açır
- [ ] Endpoint olmayan server-də (məsələn statik server) toast xətanı göstərir, konsolda tutulmamış xəta yoxdur

## Əhatədən kənar
- Native messaging (T07)
