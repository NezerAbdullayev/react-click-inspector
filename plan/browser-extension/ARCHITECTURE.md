# Arxitektura

## Qovluq strukturu (hədəf)

```
react-click-inspector/
├── src/
│   ├── core/                     ← T01: React-dan asılı olmayan ortaq məntiq
│   │   ├── fiber.ts              ← IFiber, IFiberSource, getFiberFromDom
│   │   ├── resolveSource.ts      ← fiber-dən mənbəyi tapmaq + ignoredPaths
│   │   ├── editorLinks.ts        ← vscode://, /__open-in-editor URL-ləri
│   │   └── index.ts
│   └── ...                       ← mövcud npm paketi (core-dan istifadə edir)
└── extension/                    ← T02+
    ├── manifest.json
    ├── tsconfig.json             ← T02: extension üçün ayrıca tsconfig (@types/chrome)
    ├── tsup.config.ts
    ├── vitest.config.mts         ← T02: extension unit testləri (jsdom)
    ├── src/
    │   ├── background.ts         ← service worker: qısayollar, badge
    │   ├── content-bridge.ts     ← ISOLATED world: chrome.* ↔ window.postMessage
    │   ├── page-inspector.ts     ← MAIN world: fiber, klik, overlay
    │   ├── popup/                ← popup.html, popup.ts, popup.css
    │   └── shared/               ← T02-də tam yazılır, sonra yalnız oxunur
    │       ├── messages.ts       ← mesaj tipləri + isPageMessage/isBridgeMessage yoxlayıcıları
    │       └── settings.ts       ← IExtensionSettings + default dəyərlər
    ├── test/
    │   ├── chromeMock.ts         ← T02: chrome.* API-lərinin minimal mock-u
    │   ├── page/**               ← T03-ün testləri
    │   └── popup/**              ← T04-ün testləri
    ├── public/icons/
    ├── e2e/                      ← T06: Playwright testləri (*.spec.ts) + fixture tətbiq
    └── dist/                     ← build çıxışı ("Load unpacked" bura göstərir)
```

## Niyə iki content script

React fiber DOM elementinə səhifənin JavaScript-i tərəfindən `__reactFiber$xxx` xassəsi kimi yazılır. Extension-ın adi (ISOLATED world) content script-i bu xassəni görmür. Ona görə:

- `page-inspector.ts` `"world": "MAIN"` ilə yüklənir. O, fiber-ə çatır, amma `chrome.*` API-lərinə çıxışı yoxdur.
- `content-bridge.ts` ISOLATED world-də işləyir. `chrome.runtime` və `chrome.storage`-ə çıxışı var və `window.postMessage` ilə MAIN world ilə danışır.

```
popup / background ──chrome.tabs.sendMessage──► content-bridge ──window.postMessage──► page-inspector
                   ◄──chrome.runtime.sendMessage── content-bridge ◄──window.postMessage── page-inspector
```

## Mesaj protokolu

Tiplər və yoxlayıcılar `extension/src/shared/messages.ts`-dədir. Bu faylı T02 yazır, T03–T05 yalnız oxuyur. Dəyişiklik lazım olarsa, agent faylı dəyişmir, hesabatda "Əhatədən kənar" bölməsində yazır.

```ts
type InspectorMode = 'copy' | 'vscode' | 'webstorm' | null;
type ActiveMode = Exclude<InspectorMode, null>;
type FailReason = 'no-fiber' | 'no-source' | 'all-ignored' | 'editor-request-failed';

interface IExtensionSettings {
  ignoredPaths: string[];
  openInEditorPath: string;      // default: '/__open-in-editor'
  highlight: boolean;            // default: true
}

interface IPageStatus {
  hasReact: boolean;
  hasSourceInfo: boolean;        // React var, amma false → React 19 və ya production build
  mode: InspectorMode;
}

// bridge → page
type BridgeToPage =
  | { source: 'rci'; type: 'set-mode'; mode: InspectorMode }
  | { source: 'rci'; type: 'settings'; settings: IExtensionSettings }
  | { source: 'rci'; type: 'ping' };

// page → bridge
type PageToBridge =
  | ({ source: 'rci'; type: 'status' } & IPageStatus)
  | { source: 'rci'; type: 'result'; ok: true; mode: ActiveMode; filePath: string; line: number }
  | { source: 'rci'; type: 'result'; ok: false; mode: ActiveMode; reason: FailReason };

// popup/background ↔ bridge (chrome.runtime)
type RuntimeRequest =
  | { type: 'set-mode'; mode: InspectorMode }
  | { type: 'get-status' };
type RuntimeResponse = IPageStatus;                         // get-status cavabı
type RuntimeEvent = { type: 'status' } & IPageStatus;       // bridge → popup/background (push)
```

### Nəticədən sonra rejim

| Nəticə | Rejim | İstifadəçiyə |
|---|---|---|
| `ok: true` | `null`-a qayıdır | Uğur toast-ı (T05) |
| `no-fiber` | aktiv qalır | Toast yoxdur, konsolda `console.log` (npm paketi kimi) |
| `no-source` | aktiv qalır | Konsolda xəbərdarlıq (npm paketindəki mətnlə eyni), toast: "No source info (React 19 or production build?)" |
| `all-ignored` | aktiv qalır | Toast: "All matching files are in ignoredPaths" |
| `editor-request-failed` | `null`-a qayıdır | Xəta toast-ı (T05) |

Bu davranış npm paketi ilə uyğundur: `no-source` və `all-ignored` hallarında rejim söndürülmür.

### `get-status` axını

- Bridge page-dən gələn son `status`-u yaddaşda (cache) saxlayır. `get-status` sorğusuna cache-dən **sinxron** olaraq `sendResponse(status)` ilə cavab verir. Cache boşdursa, `ping` göndərir və default `{ hasReact: false, hasSourceInfo: false, mode: null }` qaytarır.
- Status dəyişdikcə bridge `RuntimeEvent`-i `chrome.runtime.sendMessage` ilə göndərir. Popup bağlıdırsa, yaranan xəta tutulub nəzərə alınmır.
- Popup `chrome.tabs.sendMessage`-dən `"Could not establish connection. Receiving end does not exist."` xətası alarsa (`chrome://` səhifələri, localhost olmayan və icazə verilməmiş saytlar), bunu xəta kimi yox, **"Bu səhifədə aktiv deyil"** vəziyyəti kimi göstərir.

### Mesajların yoxlanması

- Hər iki tərəf əvvəlcə `event.source === window` və `data.source === 'rci'` şərtlərini yoxlayır, sonra mesajın strukturunu `messages.ts`-dəki yoxlayıcı funksiya ilə tam yoxlayır (`type`, `mode` dəyərləri, sahələrin tipləri). Struktura uyğun gəlməyən mesaj atılır.
- Məhdudiyyət: səhifənin öz skriptləri eyni `window`-dadır və saxta mesaj göndərə bilər. MVP-də təsiri kiçikdir: ən pis halda yanlış fayl kopyalanır və ya `vscode://` linki açılır. T07-də (native host) səhifədən gələn nəticə proses başlatdığı üçün əlavə yoxlamalar məcburidir (bax T07).

## Aşkarlama (T03)

- React root konteynerində (`#root` və s.) `__reactFiber$` yox, `__reactContainer$` olur. Ona görə aşkarlama konteynerin uşaq elementlərindən başlayır: `__reactFiber$` olan ilk elementi tapır.
- `hasSourceInfo`: tapılan fiber-dən `return` zənciri boyu yuxarı gedilir. Zəncirdə ən azı bir fiber-də `_debugSource.fileName` varsa, `true`. Tək bir fiber-ə baxmaq kifayət deyil.
- Popup üç vəziyyət göstərir: "React dev build tapıldı", "React tapıldı, amma mənbə məlumatı yoxdur (React 19 və ya production build)", "React tapılmadı".

## Test və typecheck

- Kök `npm run typecheck` həm `src`-i, həm də extension-ı yoxlayır: `tsc --noEmit && tsc --noEmit -p extension`. `extension/tsconfig.json`-da `types: ["chrome"]` olur (`@types/chrome`).
- Kök `vitest.config.mts` yalnız `src/**/*.test.{ts,tsx}` fayllarını götürür. `extension/**` istisna edilir.
- `npm run ext:test` `extension/vitest.config.mts`-dən istifadə edir: `extension/test/**/*.test.ts`, mühit `jsdom`, setup faylı `chromeMock.ts`. `extension/e2e/**` istisna edilir.
- `npm run ext:e2e`: Playwright, yalnız `extension/e2e/**/*.spec.ts`.

## Əsas qərarlar

| # | Qərar | Səbəb |
|---|---|---|
| D1 | Ortaq məntiq `src/core`-dadır, React import etmir | npm paketi və extension eyni davranışı paylaşır, extension bundle-ına React lazım olmur |
| D2 | Extension tsup/esbuild ilə build olunur. Popup vanilla TS ilə yazılır, React yoxdur | Kiçik bundle, repo-da artıq tsup var |
| D3 | Manifest V3, `content_scripts` + `"world": "MAIN"` | Fiber-ə çıxış. Chrome 111+ |
| D4 | İcazələr: `storage`, `activeTab`, `scripting`. `host_permissions`: `http://localhost/*`, `http://127.0.0.1/*`, opsional olaraq `<all_urls>` | Minimum icazə. Digər domenlər üçün istifadəçi icazəni popup-dan verir (`chrome.permissions.request`) |
| D5 | WebStorm `fetch(location.origin + openInEditorPath + '?file=' + encodeURIComponent(path + ':' + line + ':1'))` ilə açılır, MAIN world-dən | Sınaqla təsdiqlənib (Vite, Rsbuild). Eyni origin olduğu üçün CORS problemi yoxdur |
| D6 | VS Code `vscode://file/<path>:<line>:1` linki ilə açılır | Mövcud davranış |
| D7 | Kopyalama MAIN world-də, istifadəçi klikinin içində `navigator.clipboard.writeText` ilə edilir | İstifadəçi jesti mövcuddur. Alınmasa, bridge vasitəsilə offscreen document-ə keçmək olar (T05-də qərar verilir) |
| D8 | Ayarlar `chrome.storage.sync`-də saxlanılır. Bridge ayarları page-inspector-a göndərir | MAIN world `chrome.storage`-ə çata bilmir |
| D9 | Qısayol: `chrome.commands`, default `Alt+Shift+C` (copy) və `Alt+Shift+O` (redaktorda aç) | Popup açmadan sürətli iş |
| D10 | Overlay Shadow DOM içində render olunur, `data-id="rci-ignore"` atributu ilə | Səhifənin CSS-i ilə toqquşmur, klik tutucusu overlay-i nəzərə almır |
| D11 | Native messaging (T07) MVP-yə daxil deyil | Əlavə quraşdırma və registry tələb edir |
| D12 | Başqa saytlarda dinamik qeydiyyat: `chrome.scripting.registerContentScripts` ilə hər iki skript qeyd olunur, `page-inspector` üçün `world: 'MAIN'` mütləq göstərilir. Açıq tab-a dərhal `chrome.scripting.executeScript` ilə (`world: 'MAIN'` və ISOLATED) inject edilir | Qeydiyyat yalnız növbəti yükləmələrə təsir edir. Inject olmadan istifadəçi səhifəni yeniləməli olardı |
| D13 | `shared/messages.ts`, `shared/settings.ts`, `test/chromeMock.ts`, `ext:test` skripti və extension vitest config T02-də tam yazılır | T03 və T04 paralel işləyəndə eyni fayllara toxunmasın |

## Mövcud koddan təkrar istifadə

| Mövcud | Extension-da |
|---|---|
| `src/utils/getFiberFromDom.tsx` (`IFiber`) | `src/core/fiber.ts` |
| `src/hooks/useClickInspector.tsx`-dəki fiber gəzmə və `ignoredPaths` döngüsü | `src/core/resolveSource.ts` (`resolveSource(fiber, ignoredPaths) → { ok: true, filePath, line, column } \| { ok: false, reason: 'no-source' \| 'all-ignored' }`). Döngüdəki `printed` Set ölü koddur (hər əlavədən sonra `return` gəlir) və köçürülmür |
| `src/utils/getVSCodeLink.tsx` | `src/core/editorLinks.ts` (`getVSCodeLink`, `getOpenInEditorUrl`) |
| Klik zamanı `preventDefault` və `stopPropagation`, Esc, kursor | `page-inspector.ts`-də eyni davranış |
