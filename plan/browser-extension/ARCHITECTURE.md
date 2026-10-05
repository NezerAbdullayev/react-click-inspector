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
    ├── tsup.config.ts
    ├── src/
    │   ├── background.ts         ← service worker: qısayollar, badge
    │   ├── content-bridge.ts     ← ISOLATED world: chrome.* ↔ window.postMessage
    │   ├── page-inspector.ts     ← MAIN world: fiber, klik, overlay
    │   ├── popup/                ← popup.html, popup.ts, popup.css
    │   └── shared/               ← mesaj tipləri, ayarlar tipi, storage helper
    ├── public/icons/
    ├── e2e/                      ← T06: Playwright testləri + fixture tətbiq
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

`window.postMessage` mesajlarının hamısında `source: 'rci'` sahəsi olur. Hər iki tərəf `event.source === window` və `data.source === 'rci'` şərtlərini yoxlayır, qalan mesajlar nəzərə alınmır.

```ts
type InspectorMode = 'copy' | 'vscode' | 'webstorm' | null;

interface IExtensionSettings {
  ignoredPaths: string[];
  openInEditorPath: string;      // default: '/__open-in-editor'
  highlight: boolean;            // default: true
}

// bridge → page
type BridgeToPage =
  | { source: 'rci'; type: 'set-mode'; mode: InspectorMode }
  | { source: 'rci'; type: 'settings'; settings: IExtensionSettings }
  | { source: 'rci'; type: 'ping' };

// page → bridge
type PageToBridge =
  | { source: 'rci'; type: 'status'; hasReact: boolean; hasSourceInfo: boolean; mode: InspectorMode }
  | { source: 'rci'; type: 'result'; ok: true; mode: Exclude<InspectorMode, null>; filePath: string; line: number }
  | { source: 'rci'; type: 'result'; ok: false; mode: Exclude<InspectorMode, null>; reason: 'no-fiber' | 'no-source' | 'editor-request-failed' };

// popup/background ↔ bridge (chrome.runtime)
type RuntimeMessage =
  | { type: 'set-mode'; mode: InspectorMode }
  | { type: 'get-status' }
  | { type: 'status'; hasReact: boolean; hasSourceInfo: boolean; mode: InspectorMode };
```

Tiplər `extension/src/shared/messages.ts`-də saxlanılır və hər iki tərəf onları import edir.

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

## Mövcud koddan təkrar istifadə

| Mövcud | Extension-da |
|---|---|
| `src/utils/getFiberFromDom.tsx` (`IFiber`) | `src/core/fiber.ts` |
| `src/hooks/useClickInspector.tsx`-dəki fiber gəzmə və `ignoredPaths` döngüsü | `src/core/resolveSource.ts` (`resolveSource(fiber, ignoredPaths) → { filePath, line, column } \| { reason }`) |
| `src/utils/getVSCodeLink.tsx` | `src/core/editorLinks.ts` (`getVSCodeLink`, `getOpenInEditorUrl`) |
| Klik zamanı `preventDefault` və `stopPropagation`, Esc, kursor | `page-inspector.ts`-də eyni davranış |
