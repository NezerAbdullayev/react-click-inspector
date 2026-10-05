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
- `extension/test/page/**` (yeni unit testlər)

**Yalnız oxunur:** `extension/src/shared/**`, `extension/test/chromeMock.ts`, `package.json`, vitest config-ləri. Bu fayllarda dəyişiklik lazımdırsa, dəyişmə: hesabatda yaz (T04 paralel işləyir).

## Addımlar
1. **Aşkarlama** (bax ARCHITECTURE "Aşkarlama"):
   - `detect.ts` əvvəlcə `__reactContainer$` olan konteyneri tapır (`#root`, `[data-reactroot]` və ya ümumi axtarış). Root konteynerdə `__reactFiber$` olmur, ona görə axtarış onun uşaq elementlərində `__reactFiber$` olan ilk elementdən başlayır;
   - `hasSourceInfo`: həmin fiber-dən `return` zənciri boyu yuxarı gedilir, ən azı bir fiber-də `_debugSource.fileName` varsa `true`;
   - React gec yüklənərsə, `MutationObserver` ilə və ya bir neçə retry ilə yenidən yoxlanır;
   - nəticə `status` mesajı ilə göndərilir, `ping` gələndə də təkrar göndərilir.
2. **Rejim:** `set-mode` mesajı gəldikdə rejim qurulur. Aktiv rejimdə:
   - `document`-ə capture fazasında `click`, `mousemove` və `keydown` (Esc) listener-ləri qoşulur;
   - kursor `crosshair` olur;
   - klik `preventDefault` və `stopPropagation` ilə tutulur, `[data-id="rci-ignore"]` içindəki kliklər istisnadır.
3. **Overlay:** `overlay.ts` Shadow DOM-da hover edilən elementin ölçüsündə bir çərçivə və altında `Component · src/App.tsx:12` etiketi göstərir. Etiketdəki məlumat `resolveSource`-dan gəlir. Host elementdə `data-id="rci-ignore"` və `pointer-events: none` olur.
4. **Klik:** `getFiberFromDom` və `resolveSource` (core) çağırılır, sonra `result` mesajı göndərilir. Rejimin sonrakı vəziyyəti ARCHITECTURE-dəki "Nəticədən sonra rejim" cədvəlinə uyğun olur: `ok: true` olanda `null`-a qayıdır; `no-fiber`, `no-source` və `all-ignored` hallarında aktiv qalır. `no-source` olduqda konsol xəbərdarlığı npm paketindəki mətnlə eyni olur.
5. Mesajlar `event.source === window && data.source === 'rci'` şərtindən sonra `isBridgeToPage` (shared) ilə yoxlanılır. Struktura uyğun olmayan mesaj atılır.
6. **Unit testlər** (`extension/test/page/**`, Vitest + jsdom): mesaj filtri (saxta strukturlu mesaj daxil), rejim keçidləri, hər `reason` üçün rejimin vəziyyəti, Esc, ignore atributu, aşkarlama (`__reactContainer$` + uşaqda `__reactFiber$`, mənbəsiz zəncir). Fiber-i əl ilə qurulmuş obyektlə simulyasiya et.

## Qəbul meyarları
- [ ] `npm run ext:build`, `npm run ext:test`, `npm run typecheck`, `npm run lint` keçir
- [ ] Brauzerdə (fixture və ya istənilən Vite + React 18 dev tətbiqi): konsoldan `window.postMessage({source:'rci',type:'set-mode',mode:'copy'}, '*')` göndərildikdə hover vurğulanır, klikdə `result` mesajı düzgün fayl və sətirlə gəlir, tətbiqin öz klik handler-i işləmir
- [ ] Esc rejimi ləğv edir, overlay və kursor təmizlənir
- [ ] React olmayan səhifədə xəta yoxdur, `status.hasReact === false`
- [ ] `git diff --name-only master` yalnız "Toxunula bilən fayllar" siyahısındakı faylları göstərir

## Əhatədən kənar
- Kopyalama və redaktoru açmaq (T05)
- Popup (T04)
