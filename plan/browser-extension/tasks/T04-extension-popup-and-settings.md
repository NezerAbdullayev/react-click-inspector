# T04: Popup, ayarlar, mesajlaşma və qısayollar

| Sahə | Dəyər |
|---|---|
| Branch | `feature/extension-popup-and-settings` |
| Baza | `master` (T02 merge olunandan sonra) |
| Asılıdır | T02 |
| Paralel işləyə bilər | T03 |
| Agent | `general-purpose`, worktree izolyasiyası |
| Təxmini həcm | M |

## Məqsəd
İstifadəçi popup-dan rejimi seçir və ayarları dəyişir. Qısayollar işləyir. Bridge popup/background ilə page-inspector arasında mesajları ötürür və ayarları səhifəyə çatdırır.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/ARCHITECTURE.md`: mesaj protokolu, D4, D8, D9
- `src/components/SettingsModal.tsx` (mövcud UI mətnləri və rənglər, oxşar görünüş üçün)

## Toxunula bilən fayllar
- `extension/src/popup/**`
- `extension/src/content-bridge.ts`
- `extension/src/background.ts`
- `extension/src/shared/**`
- `extension/test/**`

## Addımlar
1. **`shared/settings.ts`:** `IExtensionSettings`, default dəyərlər, `loadSettings()` və `saveSettings()` (`chrome.storage.sync`), `onSettingsChanged(cb)`.
2. **`content-bridge.ts`:**
   - başlanğıcda ayarları oxuyub `settings` mesajı ilə page-inspector-a göndərir, dəyişəndə yenidən göndərir;
   - `chrome.runtime.onMessage` (`set-mode`, `get-status`) → `window.postMessage`;
   - page-dən gələn `status` və `result` → `chrome.runtime.sendMessage`.
3. **Popup:**
   - status sətri: "React dev build tapıldı" / "React tapıldı, amma mənbə məlumatı yoxdur" / "React tapılmadı";
   - üç rejim düyməsi (`aria-pressed`): Copy path, VS Code, WebStorm;
   - ayarlar: `ignoredPaths` (vergüllə ayrılmış mətn), `openInEditorPath`, `highlight` checkbox;
   - localhost olmayan saytda "Bu saytda aktivləşdir" düyməsi (`chrome.permissions.request` və `chrome.scripting.registerContentScripts`);
   - rejim seçiləndə popup bağlanır (`window.close()`).
4. **`background.ts`:**
   - `chrome.commands.onCommand`: `activate-copy` → `set-mode: 'copy'`; `activate-editor` → son istifadə olunan redaktor rejimi (default `vscode`), `chrome.storage.local`-da saxlanılır;
   - status-a görə action badge: aktiv rejimdə `ON`.
5. **Unit testlər:** `chrome.*` API-ləri üçün minimal mock (`extension/test/chromeMock.ts`), settings və bridge yönləndirməsi.

## Qəbul meyarları
- [ ] `npm run ext:build`, `npm run ext:test`, `npm run typecheck`, `npm run lint` keçir
- [ ] Brauzerdə: popup açılır, status düzgün göstərilir, ayarlar yenidən açılanda saxlanmış qalır
- [ ] Popup-dan rejim seçildikdə page-inspector `set-mode` mesajını alır (T03 hazır deyilsə, konsolda log ilə yoxla)
- [ ] `Alt+Shift+C` popup açmadan rejimi aktivləşdirir

## Əhatədən kənar
- Kopyalama və redaktoru açmaq (T05)
