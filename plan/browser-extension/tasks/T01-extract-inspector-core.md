# T01: Ortaq məntiqi `src/core`-a çıxarmaq

| Sahə | Dəyər |
|---|---|
| Branch | `refactor/extract-inspector-core` |
| Baza | `master` |
| Asılıdır | – |
| Paralel işləyə bilər | T02 |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | M |

## Məqsəd
Fiber-dən mənbə faylını tapan və redaktor linklərini quran məntiqi React-dan asılı olmayan `src/core/` moduluna çıxarmaq. Bundan sonra həm npm paketi, həm də extension eyni kodu istifadə edəcək. npm paketinin xarici API-si və davranışı dəyişməməlidir.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/ARCHITECTURE.md`: "Mövcud koddan təkrar istifadə" bölməsi
- `src/hooks/useClickInspector.tsx`, `src/utils/getFiberFromDom.tsx`, `src/utils/getVSCodeLink.tsx`, `src/__tests__/*`

## Toxunula bilən fayllar
- `src/core/**` (yeni)
- `src/utils/**`
- `src/hooks/useClickInspector.tsx`
- `src/__tests__/**`

## Addımlar
1. `src/core/fiber.ts`: `IFiber`, `IFiberSource`, `getFiberFromDom`. `src/utils/getFiberFromDom.tsx` buradan re-export etsin ki, mövcud import-lar sınmasın.
2. `src/core/resolveSource.ts`:
   ```ts
   type ResolveResult =
     | { ok: true; filePath: string; line: number; column?: number }
     | { ok: false; reason: 'no-source' | 'all-ignored' };
   export const resolveSource = (fiber: IFiber, ignoredPaths?: string | string[]): ResolveResult
   ```
   Mövcud döngünü (`_debugSource`, `ignoredPaths`, `printed` set) buraya köçür.
3. `src/core/editorLinks.ts`: `getVSCodeLink` (mövcud) və yeni `getOpenInEditorUrl(origin, endpointPath, filePath, line)`. Nəticə: `${origin}${endpointPath}?file=${encodeURIComponent(`${filePath}:${line}:1`)}`.
4. `src/core/index.ts`: hamısını export edir. Core heç bir halda `react` import etməməlidir.
5. `useClickInspector.tsx` `resolveSource` istifadə etsin. Davranış eyni qalmalıdır: `no-source` halında konsol xəbərdarlığı, `all-ignored` halında heç nə edilmir və rejim aktiv qalır.
6. `src/__tests__/core/*.test.ts`: `resolveSource` üçün əl ilə qurulmuş fiber zənciri ilə testlər (mənbə yoxdur, ignored, dublikat açar, uğurlu hal) və `getOpenInEditorUrl` testi.

## Qəbul meyarları
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` keçir
- [ ] Mövcud 10 test dəyişmədən keçir
- [ ] `grep -r "from 'react'" src/core` heç nə qaytarmır
- [ ] `dist/index.d.ts`-dəki export-lar dəyişməyib (`ReactClickInspector`, default, `IReactClickInspector`, `InspectorMode`)

## Əhatədən kənar
- Extension kodu
- npm paketinə yeni funksiya əlavə etmək
