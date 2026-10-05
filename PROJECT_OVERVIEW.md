# React Click Inspector — Layihə İcmalı

`react-click-inspector` (v1.0.4) — React 18 tətbiqləri üçün yüngül development alətidir. Brauzerdə istənilən elementə klik etdikdə həmin elementi render edən komponentin **fayl yolunu** tapır və ya onu kopyalayır, ya da faylı birbaşa **VS Code**-da müvafiq sətirdə açır.

Alət yalnız `localhost`, `127.0.0.1` və `::1` üzərində işləyir. Production mühitdə sadəcə `children` render olunur, heç nə əlavə edilmir.

---

## 1. Quraşdırma və istifadə

```bash
npm install react-click-inspector
```

```tsx
import { ReactClickInspector } from "react-click-inspector";
import App from "./App";

const Root = () => (
  <ReactClickInspector ignoredPaths={["fe-common", "common/myLibrary"]}>
    <App />
  </ReactClickInspector>
);
```

> Qeyd: paket **named export** verir (`export { ReactClickInspector }`). README-dəki `import ReactClickInspector from ...` (default import) işləməyəcək.

### Props (`IReactClickInspector`)

| Prop           | Tip                    | Təsvir                                                                 |
| -------------- | ---------------------- | ---------------------------------------------------------------------- |
| `children`     | `ReactNode`            | Bütün tətbiq (kökə sarınır).                                           |
| `ignoredPaths` | `string \| string[]`   | Yolunda bu alt-sətirlər olan fayllar atlanır, növbəti valideynə keçilir. |
| `icon`         | `ReactNode`            | Sağ-aşağı küncdəki toggle düyməsinin ikonu.                            |
| `toggleBtnCss` | `CSSProperties`        | Toggle düyməsinin stilini override edir.                               |
| `modalCss`     | `CSSProperties`        | Settings panelinin stilini override edir.                              |

---

## 2. Qovluq strukturu

```
src/
├── index.tsx                      # Paketin giriş nöqtəsi (ReactClickInspector + tipi export edir)
├── components/
│   ├── ReactClickInspector.tsx    # Kök komponent: localhost yoxlaması, popup state
│   ├── SettingsModal.tsx          # Sağ-aşağı düymə + açılan Settings paneli
│   └── Popup.tsx                  # "success" bildirişi (2 saniyə)
├── context/index.tsx              # DevInspectorProvider: bütün state + klik hook-u
├── hooks/
│   ├── useDevInspector.tsx        # Context-i oxumaq üçün hook
│   ├── useGetPatchClickedElement.tsx  # Əsas məntiq: klik → fiber → fayl yolu
│   ├── useIsLocalhost.tsx         # Hostun localhost olub-olmadığını yoxlayır
│   └── useWindowsWith.tsx         # Ekran eni < 1500px olduqda true qaytarır
├── models/index.tsx               # TypeScript interfeysləri
└── utils/
    ├── getFiberFromDom.tsx        # DOM elementindən React Fiber-i tapır
    └── getVSCodeLink.tsx          # vscode:// (və jetbrains://) URL qurur
```

Build: `tsup src/index.tsx --format cjs,esm --dts` → `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`.

---

## 3. Necə işləyir

### 3.1 Komponent ağacı

```
ReactClickInspector
 └─ (localhost?) ── yox ──► yalnız children
        │
        bəli
        ▼
   DevInspectorProvider  (<div style="cursor: crosshair|default">)
     ├─ DevInspectorContext.Provider
     │    ├─ children (sizin tətbiq)
     │    └─ SettingsModal (data-id="continue-element_debbug")
     └─ Popup ("success")
```

### 3.2 İş axını

1. İstifadəçi sağ-aşağıdakı düyməni basır, Settings paneli sürüşüb açılır.
2. Rejimlərdən birini seçir:
   - **Copy file path to Clipboard**: `logOnly = true`
   - **VSCode**: `IDEType = 'vsCode'`, `openInVSCode = true`
   Rejim aktivləşəndə panel bağlanır, kursor `crosshair` olur.
3. `useGetPatchClickedElement` `document`-ə **capture fazasında** `click` listener qoşur.
4. Klik zamanı:
   1. Klik Settings panelinin içindədirsə (`data-id="continue-element_debbug"`), heç nə edilmir.
   2. `getFiberFromDom` DOM node-un `__reactFiber$...` açarından React Fiber-i götürür.
   3. Fiber zənciri boyunca (`fiber.return`) yuxarı qalxılır. `_debugSource.fileName` olan və `ignoredPaths`-ə düşməyən **ilk** fiber götürülür.
   4. `logOnly` aktivdirsə, `navigator.clipboard.writeText(filePath)` çağırılır, "success" popup-u göstərilir və rejim söndürülür.
   5. `openInVSCode` aktivdirsə, `vscode://file/<path>:<line>:1` linki yaradılıb klik edilir və rejim söndürülür.

### 3.3 Vacib texniki asılılıq

`_debugSource` yalnız **development build**-də və JSX `__source` transformu aktiv olduqda (Babel `@babel/plugin-transform-react-jsx-source`, Vite React plugin dev rejimi və s.) mövcuddur. **React 19-da `_debugSource` silinib**, ona görə alət yalnız React 18 ilə işləyir (`peerDependencies: react ^18`).

---

## 4. Aşkar edilmiş problemlər və təkliflər

### Kritik / funksional

| # | Fayl | Problem | Təklif |
|---|------|---------|--------|
| 1 | `package.json` | `@types/react` devDependency kimi yoxdur. Buna görə `--dts` addımı tip faylı yarada bilmir. `dist/`-də `index.d.ts` yoxdur, halbuki `types` sahəsi ona işarə edir. | `npm i -D @types/react @types/react-dom` |
| 2 | `components/Popup.tsx` | `useWindowsWith()` `if (!visible) return null;`-dan **sonra** çağırılır. Bu, Rules of Hooks pozuntusudur: `visible` dəyişəndə React "Rendered more hooks than during the previous render" xətası verə bilər. Üstəlik `isSmallScreen` heç yerdə istifadə olunmur. | Hook-u silin və ya `return`-dan əvvələ keçirin. |
| 3 | `hooks/useGetPatchClickedElement.tsx` | `useEffect` dependency-lərində yalnız `[logOnly, openInVSCode]` var. `ignoredPaths`, `IDEType`, `showPopup` dəyişsə, handler köhnə (stale) dəyərlərlə işləyir. | Bütün istifadə olunan dəyərləri deps-ə əlavə edin və ya `useRef` istifadə edin. |
| 4 | `README.md` | Fayl cümlənin ortasından başlayır ("In this example, ..."): başlıq, təsvir və install bölməsi yoxdur. Nümunədə default import göstərilir, amma paket named export edir. | README-ni başlıq + install + düzgün import ilə tamamlayın. |
| 5 | `hooks/useGetPatchClickedElement.tsx` | `ignoredPaths = ""` (boş sətir) verilsə, `filePath.includes("")` həmişə `true` olur və bütün fayllar atlanır. | Boş sətirləri filtrləyin. |

### Kiçik / kod keyfiyyəti

- `Popup.tsx`: `rgba(365, 365, 365, 1)` etibarsızdır (maksimum 255). `#fff` yazın.
- `ReactClickInspector.tsx`: `showPopup` içindəki `setTimeout` təmizlənmir. Ardıcıl kliklərdə popup vaxtından əvvəl bağlana bilər, unmount-dan sonra da `setState` çağırıla bilər.
- `SettingsModal.tsx`: `<input type="button" checked={...}>`: `checked` atributu `type="button"` üçün mənasızdır. React xəbərdarlıq verə bilər (`checked` var, `onChange` yoxdur).
- `SettingsModal.tsx`: hər iki rejim eyni anda aktiv ola bilər. Bu halda bir klik həm kopyalayır, həm də VS Code-u açır. Rejimləri qarşılıqlı istisna (mutually exclusive) etmək daha intuitivdir.
- İstifadə olunmayan state: `visbTool`, `openInWebStorm`, `setOpenInWebStorm` (WebStorm hələ TODO-dur). `setIDEType` `IUseGetPatchClickedElement`-də elan olunub, amma ötürülmür.
- Dairəvi import: `context` → `components` → `hooks` → `context`. Hazırda işləyir, amma kövrəkdir.
- Adlandırmada yazı xətaları: `useGetPatchClickedElement` (Patch → **Path**), `useWindowsWith` (With → **Width**), `continue-element_debbug` (debbug → **debug**), `modalWidth` dəyişəni əslində `boolean`-dır.
- `DevInspectorProvider` bütün tətbiqi əlavə `<div>`-ə sarıyır. Bu, `height: 100%` və ya flex layout-larına təsir edə bilər.
- Testlər, lint konfiqurasiyası və CI yoxdur.

---

## 5. Gələcək üçün ideyalar

- WebStorm / JetBrains dəstəyi (`getVSCodeLink` artıq `jetbrains://` URL-ni qurur, yalnız UI aktiv edilməlidir).
- Hover zamanı elementi highlight etmək və fayl yolunu tooltip-də göstərmək.
- Klaviatura qısayolu ilə rejimi aktivləşdirmək (məs. `Alt + Click`).
- React 19 dəstəyi (`_debugSource` əvəzinə `_debugStack` və ya source-map əsaslı həll).
- Settings seçimlərini `localStorage`-də yadda saxlamaq.
