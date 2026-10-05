# Layihə: React Click Inspector brauzer extension-ı

## Məqsəd

`react-click-inspector`-un funksionallığını Chromium brauzerləri (Chrome, Edge) üçün Manifest V3 extension-ı kimi təqdim etmək. Extension bir dəfə quraşdırılır və istənilən React 18 dev saytında işləyir, layihəyə npm paketi qoşmaq lazım olmur.

Extension bunları bacaracaq:
- kliklənən elementin komponent faylının yolunu kopyalamaq;
- faylı VS Code-da açmaq (`vscode://`);
- faylı WebStorm-da açmaq (dev server-in `/__open-in-editor` endpoint-i vasitəsilə);
- hover zamanı elementi vurğulamaq, Esc ilə ləğv etmək, klaviatura qısayolu ilə rejimi açmaq;
- `ignoredPaths` və redaktor seçimini saxlamaq (`chrome.storage.sync`).

npm paketi saxlanılır. Ortaq məntiq `src/core/`-a çıxarılır və hər iki versiya ondan istifadə edir.

## Artıq yoxlanılmış faktlar (2026-10-05)

Bu sınaqlar istifadəçinin maşınında (Windows 11, WebStorm 2026.2.1) aparılıb. Agentlər bunları yenidən sınamamalıdır:

| Yol | Nəticə |
|---|---|
| Dev server `GET /__open-in-editor?file=<abs-path>:<line>:<col>` | ✅ WebStorm faylı açdı (Vite 5). Rsbuild 1.7-də eyni `launch-editor-middleware` var (fe-vis kodunda yoxlanılıb) |
| WebStorm daxili server-i `localhost:63342/api/file` | ❌ Bütün formatlarda 404 (`/api/about` isə 200) |
| `jetbrains://web-storm/...`, `jetbrains://webstorm/...`, `jetbrains://idea/navigate/reference?project=&path=` | ❌ jetbrainsd daemon: "Nowhere to forward the URI" |
| `webstorm64.exe --line N <file>` (CLI) | ✅ İşləyir. Brauzerdən birbaşa çağırmaq olmur, yalnız native messaging (T07) ilə |

## Mərhələlər

| ID | Tapşırıq | Branch | Asılıdır | Həcm |
|---|---|---|---|---|
| [T01](tasks/T01-extract-inspector-core.md) | Ortaq məntiqi `src/core`-a çıxarmaq | `refactor/extract-inspector-core` | – | M |
| [T02](tasks/T02-extension-scaffold.md) | Extension skeleti, manifest, build, ortaq fayllar (mesajlar, ayarlar, mock, test və typecheck) | `feature/extension-scaffold` | – | M–L |
| [T03](tasks/T03-extension-page-inspector.md) | Səhifədə işləyən inspektor (MAIN world) | `feature/extension-page-inspector` | T01, T02 | L |
| [T04](tasks/T04-extension-popup-and-settings.md) | Popup, ayarlar, mesajlaşma, qısayollar | `feature/extension-popup-and-settings` | T02 | M |
| [T05](tasks/T05-extension-editor-integrations.md) | Kopyalama, VS Code, WebStorm inteqrasiyası | `feature/extension-editor-integrations` | T03, T04 | M |
| [T06](tasks/T06-extension-e2e-tests.md) | Playwright e2e testləri və CI | `feature/extension-e2e-tests` | T05 | M |
| [T07](tasks/T07-extension-native-host.md) | *(istəyə görə)* Native messaging host | `feature/extension-native-host` | T06 | L |
| [T08](tasks/T08-extension-release.md) | *(Sahibin qərarı)* Paketləmə və store | `chore/extension-release` | T06 | S |
| [T09](tasks/T09-npm-webstorm-open-in-editor.md) | npm paketində WebStorm-u `/__open-in-editor` ilə açmaq | `feature/npm-webstorm-open-in-editor` | T01 | S–M |

## Asılılıq qrafiki

```
T01 ──┬────────────────────────────────────► T09 (npm paketi)
      ├──► T03 ──┐
T02 ──┤          ├──► T05 ──► T06 ──┬──► T07 (istəyə görə)
      └──► T04 ──┘                  └──► T08 (Sahibin qərarı)
```

**Paralel dalğalar:**
1. T01 ∥ T02
2. T03 ∥ T04 ∥ T09
3. T05
4. T06
5. T07 ∥ T08

T03 və T04 paylaşılan faylları (`extension/src/shared/**`, `extension/test/chromeMock.ts`, `package.json`, vitest config-ləri) yalnız oxuyur. Bu fayllar T02-də tam hazırlanır (ARCHITECTURE D13).

## Başlamazdan əvvəl

Hər agent ən son `master`-dən başlayır:

```bash
git checkout master
git pull
```

## Hazır sayılma meyarı (MVP = T01–T06)

- Extension "Load unpacked" ilə yüklənir, konsolda xəta yoxdur.
- React 18 dev saytında: kopyalama, VS Code və WebStorm (dev server ilə) işləyir, Esc ləğv edir, hover vurğulanır.
- React olmayan və ya production saytında extension heç nəyi sındırmır, popup-da "React dev build tapılmadı" yazılır.
- npm paketinin API-si və davranışı dəyişmir, mövcud testlər keçir.
- Unit və e2e testlər CI-da keçir.
