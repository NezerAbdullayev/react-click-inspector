# T09: npm paketində WebStorm-u `/__open-in-editor` ilə açmaq

| Sahə | Dəyər |
|---|---|
| Branch | `feature/npm-webstorm-open-in-editor` |
| Baza | `master` (T01 merge olunandan sonra) |
| Asılıdır | T01 |
| Paralel işləyə bilər | T02–T06 (extension fayllarına toxunmur) |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | S–M |

## Məqsəd
npm paketindəki WebStorm rejimini işlək etmək. İndi `src/utils/getVSCodeLink.tsx` WebStorm üçün `jetbrains://webstorm/navigate/reference?file=...` linki qurur, amma bu yol sınaqda işləmədi (bax `plan/browser-extension/README.md` "Artıq yoxlanılmış faktlar"). Ayarlar pəncərəsindəki WebStorm düyməsi də şərhə alınıb. Bu tapşırıq düyməni aktivləşdirir və faylı dev server-in `/__open-in-editor` endpoint-i ilə açır.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/README.md`: "Artıq yoxlanılmış faktlar"
- `src/core/editorLinks.ts` (T01: `getOpenInEditorUrl`)
- `src/hooks/useClickInspector.tsx`, `src/components/SettingsModal.tsx`, `src/models/index.tsx`, `src/utils/getVSCodeLink.tsx`

## Toxunula bilən fayllar
- `src/**` (`src/core/**` istisnadır: orada dəyişiklik lazımdırsa, hesabatda yaz)
- `README.md`
- `CHANGELOG.md`

## Addımlar
1. `InspectorMode`-a `'webstorm'` əlavə olunur (`'copy' | 'vscode' | 'webstorm' | null`). Bu, export olunan tipin genişlənməsidir, sınan dəyişiklik deyil.
2. Yeni prop: `openInEditorPath?: string` (default `'/__open-in-editor'`).
3. `useClickInspector`: `webstorm` rejimində `fetch(getOpenInEditorUrl(location.origin, openInEditorPath, filePath, line))`. Cavab `ok` deyilsə və ya şəbəkə xətası olarsa, popup-da xəta mesajı göstərilir: "Dev server does not support /__open-in-editor".
4. `SettingsModal`: şərhdəki WebStorm bloku adi `<button aria-pressed>` kimi bərpa olunur (VS Code düyməsi ilə eyni üslubda). Rejimlər bir-birini istisna etməyə davam edir.
5. `getVSCodeLink`-dəki işləməyən `jetbrains://` qolu silinir. `IdeType` lazımsız qalarsa, sadələşdirilir. Xarici API-yə təsir etməsin: `IdeType` export olunmur.
6. Testlər: WebStorm düyməsi, `fetch` çağırışının URL-i, xəta halı, rejimlərin bir-birini istisna etməsi (üç rejim).
7. README: WebStorm bölməsi (Vite/Rsbuild tələbi, `LAUNCH_EDITOR=webstorm` qeydi, `openInEditorPath` prop-u). CHANGELOG-a qeyd.

## Qəbul meyarları
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` keçir
- [ ] Mövcud testlər keçir, yeni testlər əlavə olunub
- [ ] Əl ilə yoxlama (orkestrator Sahibin maşınında edir): Vite demo-da WebStorm düyməsi faylı WebStorm-da açır
- [ ] `dist/index.d.ts`-də yalnız əlavələr var: `openInEditorPath` prop-u və `InspectorMode`-da `'webstorm'`

## Əhatədən kənar
- Extension (T02–T06)
- Native messaging (T07)
