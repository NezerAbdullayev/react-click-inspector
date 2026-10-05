# T03: Səhifədə işləyən inspektor (MAIN world)

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-page-inspector` |
| Baza | `master` (T01 və T02 merge olunandan sonra) |
| Asılıdır | T01, T02 |
| Paralel işləyə bilər | T04 |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | L |

## Məqsəd
`page-inspector.ts`: React-ı aşkar edir, rejim aktiv olanda hover zamanı elementi vurğulayır, klikdə mənbə faylını tapıb nəticəni bridge-ə göndərir. Redaktoru açma hissəsi T05-dədir, burada yalnız nəticə hadisəsi göndərilir.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/ARCHITECTURE.md`: "Niyə iki content script", mesaj protokolu, D10
- `src/core/*` (T01), `src/hooks/useClickInspector.tsx`, `src/context/index.tsx` (Esc və kursor)

## Toxunula bilən fayllar
- `extension/src/page-inspector.ts`
- `extension/src/page/**` (yeni: overlay, detect)
- `extension/src/shared/messages.ts`
- `extension/test/**` (yeni unit testlər)
- `package.json` (`ext:test` skripti)

## Addımlar
1. **Aşkarlama:** `detect.ts` DOM-da `__reactFiber$` olan element axtarır (`document.querySelectorAll('*')`-in ilk N elementi və ya `#root`, `[data-reactroot]`). Fiber zəncirində `_debugSource` varsa, `hasSourceInfo: true`. React gec yüklənərsə, `MutationObserver` ilə və ya bir neçə retry ilə yenidən yoxlanır. Nəticə `status` mesajı ilə göndərilir.
2. **Rejim:** `set-mode` mesajı gəldikdə rejim qurulur. Aktiv rejimdə:
   - `document`-ə capture fazasında `click`, `mousemove` və `keydown` (Esc) listener-ləri qoşulur;
   - kursor `crosshair` olur;
   - klik `preventDefault` və `stopPropagation` ilə tutulur, `[data-id="rci-ignore"]` içindəki kliklər istisnadır.
3. **Overlay:** `overlay.ts` Shadow DOM-da hover edilən elementin ölçüsündə bir çərçivə və altında `Component · src/App.tsx:12` etiketi göstərir. Etiketdəki məlumat `resolveSource`-dan gəlir. Host elementdə `data-id="rci-ignore"` və `pointer-events: none` olur.
4. **Klik:** `getFiberFromDom` və `resolveSource` (core) çağırılır, sonra `result` mesajı göndərilir. Rejim `null`-a qayıdır. `no-source` olduqda konsol xəbərdarlığı npm paketindəki mətnlə eyni olur.
5. Mesajlar yalnız `event.source === window && data.source === 'rci'` olduqda qəbul olunur.
6. **Unit testlər** (Vitest + jsdom): mesaj filtri, rejim keçidləri, Esc, ignore atributu. Fiber-i əl ilə qurulmuş obyektlə simulyasiya et.

## Qəbul meyarları
- [ ] `npm run ext:build`, `npm run ext:test`, `npm run typecheck`, `npm run lint` keçir
- [ ] Brauzerdə (fixture və ya istənilən Vite + React 18 dev tətbiqi): konsoldan `window.postMessage({source:'rci',type:'set-mode',mode:'copy'}, '*')` göndərildikdə hover vurğulanır, klikdə `result` mesajı düzgün fayl və sətirlə gəlir, tətbiqin öz klik handler-i işləmir
- [ ] Esc rejimi ləğv edir, overlay və kursor təmizlənir
- [ ] React olmayan səhifədə xəta yoxdur, `status.hasReact === false`

## Əhatədən kənar
- Kopyalama və redaktoru açmaq (T05)
- Popup (T04)
