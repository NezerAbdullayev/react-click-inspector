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
İstifadəçi popup-dan rejimi seçir və ayarları dəyişir. Qısayollar işləyir. Bridge popup/background ilə page-inspector arasında mesajları ötürür, son statusu saxlayır və ayarları səhifəyə çatdırır.

## Oxunmalı kontekst
- `plan/AGENTS.md`
- `plan/browser-extension/ARCHITECTURE.md`: mesaj protokolu, "`get-status` axını", "Mesajların yoxlanması", "Aşkarlama" (popup mətnləri), D4, D8, D9, D12
- `extension/src/shared/messages.ts`, `extension/src/shared/settings.ts`, `extension/test/chromeMock.ts` (T02)
- `src/components/SettingsModal.tsx` (mövcud UI mətnləri və rənglər, oxşar görünüş üçün)

## Toxunula bilən fayllar
- `extension/src/popup/**`
- `extension/src/content-bridge.ts`
- `extension/src/background.ts`
- `extension/test/popup/**` (popup, bridge və background testləri)

**Yalnız oxunur:** `extension/src/shared/**`, `extension/test/chromeMock.ts`, `package.json`, vitest config-ləri. Bu fayllarda dəyişiklik lazımdırsa, dəyişmə: hesabatda yaz (T03 paralel işləyir).

## Addımlar
1. **`content-bridge.ts`:**
   - başlanğıcda `loadSettings()` ilə ayarları oxuyub `settings` mesajı ilə page-inspector-a göndərir, `onSettingsChanged` ilə dəyişəndə yenidən göndərir;
   - page-dən gələn mesajları `isPageToBridge` ilə yoxlayır. `status`-u cache-də saxlayır və `RuntimeEvent` kimi `chrome.runtime.sendMessage` ilə göndərir (popup bağlıdırsa, xəta tutulur və nəzərə alınmır). `result`-u da eyni yolla ötürür;
   - `chrome.runtime.onMessage`-də `isRuntimeRequest` ilə yoxlama aparır:
     - `set-mode` → `window.postMessage`;
     - `get-status` → cache-dən **sinxron** `sendResponse(status)`. Cache boşdursa, `ping` göndərir və default statusu qaytarır.
2. **Popup:**
   - açılanda aktiv tab-a `get-status` göndərir. `"Receiving end does not exist"` xətası **"Bu səhifədə aktiv deyil"** vəziyyəti kimi göstərilir (`chrome://` səhifələri, localhost olmayan saytlar), xəta kimi yox;
   - status sətri üç vəziyyətdən birini göstərir: "React dev build tapıldı" / "React tapıldı, amma mənbə məlumatı yoxdur (React 19 və ya production build)" / "React tapılmadı";
   - üç rejim düyməsi (`aria-pressed`): Copy path, VS Code, WebStorm. Mənbə məlumatı yoxdursa və ya səhifədə aktiv deyilsə, düymələr `disabled` olur;
   - ayarlar: `ignoredPaths` (vergüllə ayrılmış mətn), `openInEditorPath`, `highlight` checkbox. `saveSettings` ilə saxlanılır;
   - localhost olmayan saytda "Bu saytda aktivləşdir" düyməsi (D12):
     1. `chrome.permissions.request({ origins: [origin + '/*'] })`;
     2. `chrome.scripting.registerContentScripts` ilə iki skript qeyd olunur: `content-bridge.js` (ISOLATED) və `page-inspector.js` (`world: 'MAIN'`, **mütləq**), `matches: [origin + '/*']`, sabit `id`-lərlə (təkrar qeydiyyatda xəta olmasın);
     3. açıq tab-a dərhal `chrome.scripting.executeScript` ilə hər iki skript inject olunur: `page-inspector.js` üçün `world: 'MAIN'`. Beləliklə səhifəni yeniləməyə ehtiyac qalmır;
   - rejim seçiləndə popup bağlanır (`window.close()`).
3. **`background.ts`:**
   - `chrome.commands.onCommand`: `activate-copy` → `set-mode: 'copy'`; `activate-editor` → son istifadə olunan redaktor rejimi (default `vscode`), `chrome.storage.local`-da saxlanılır;
   - `RuntimeEvent`-ə görə action badge: aktiv rejimdə `ON`;
   - content script olmayan tab-da qısayol basılanda yaranan xəta tutulur və səssizcə nəzərə alınmır.
4. **Unit testlər** (`extension/test/popup/**`, T02-nin `chromeMock`-u ilə):
   - bridge: `get-status` cache-dən sinxron cavab, cache boş olanda default və `ping`, saxta strukturlu mesajın atılması;
   - popup: "Receiving end does not exist" xətasında "aktiv deyil" vəziyyəti, üç status mətni, ayarların saxlanması;
   - dinamik qeydiyyat: `registerContentScripts`-də `world: 'MAIN'` var, `executeScript` çağırılır;
   - qısayollar.

## Qəbul meyarları
- [ ] `npm run ext:build`, `npm run ext:test`, `npm run typecheck`, `npm run lint` keçir
- [ ] Brauzerdə: popup açılır, status düzgün göstərilir, ayarlar yenidən açılanda saxlanmış qalır
- [ ] `chrome://extensions` səhifəsində popup açılır və "Bu səhifədə aktiv deyil" göstərir, konsolda tutulmamış xəta yoxdur
- [ ] Popup-dan rejim seçildikdə page-inspector `set-mode` mesajını alır (T03 hazır deyilsə, konsolda log ilə yoxla)
- [ ] Localhost olmayan bir səhifədə "Bu saytda aktivləşdir"-dən sonra yeniləmədən status gəlir
- [ ] `Alt+Shift+C` popup açmadan rejimi aktivləşdirir
- [ ] `git diff --name-only master` yalnız "Toxunula bilən fayllar" siyahısındakı faylları göstərir

## Əhatədən kənar
- Kopyalama və redaktoru açmaq (T05)
