# T07: (İstəyə görə) Native messaging host

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-native-host` |
| Baza | `master` (T06-dan sonra) |
| Asılıdır | T06 |
| Paralel işləyə bilər | T08 |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | L |
| **Təsdiq** | **Başlamazdan əvvəl Sahibin açıq təsdiqi lazımdır** (registry yazır, kompüterə proqram quraşdırır) |

## Məqsəd
Dev server-dən asılı olmadan WebStorm-u (və VS Code-u) CLI ilə açmaq: `webstorm64.exe --line N <file>`. Bu yol istifadəçinin maşınında sınaqdan keçib və işləyir.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/README.md`: "Artıq yoxlanılmış faktlar"
- Chrome native messaging sənədləri

## Toxunula bilən fayllar
- `native-host/**` (yeni)
- `extension/src/background.ts`, `extension/src/shared/**`, `extension/src/popup/**`
- `extension/manifest.json` (`nativeMessaging` icazəsi)

## Addımlar
1. **`native-host/host.mjs` (Node):** stdin/stdout native messaging protokolu (4 baytlıq uzunluq + JSON). Əmr formatı: `{ "type": "open", "editor": "webstorm" | "vscode", "file": "<abs>", "line": 12 }`.
   - Təhlükəsizlik: yalnız mövcud faylı qəbul edir; `editor` ağ siyahıdan olmalıdır; proses `spawn` ilə shell olmadan başladılır, arqumentlər massiv kimi verilir.
2. Redaktor yolunu tapmaq: `PATH`, standart quraşdırma qovluqları, `LAUNCH_EDITOR`.
3. **`native-host/install.ps1`:** host manifest JSON-unu yazır, `allowed_origins`-də extension ID olur. `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.rci.host` (və Edge üçün analoqu) yaradılır. `uninstall.ps1` da yazılır. **Skripti agent işlətmir.** Sahib özü işlədir və ya orkestrator təsdiqlə işlədir.
4. Extension: `webstorm` rejimində əvvəl native host yoxlanılır (`chrome.runtime.connectNative`), yoxdursa dev server yoluna qayıdılır. Popup-da "Native host: quraşdırılıb / yoxdur" göstərilir.
5. Host üçün unit testlər: protokolun kodlanması və açılması, əmrin yoxlanması.

## Qəbul meyarları
- [ ] Host testləri keçir; `install.ps1` və `uninstall.ps1` `-WhatIf` rejimində nə edəcəyini göstərir
- [ ] Sahibin maşınında (təsdiqdən sonra): dev server olmayan statik React 18 dev build-də WebStorm faylı düzgün sətirdə açır
- [ ] Host olmadıqda extension dev server yolu ilə işləməyə davam edir

## Əhatədən kənar
- macOS və Linux quraşdırıcıları (ayrıca tapşırıq)
