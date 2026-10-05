# Status

Bu faylı yalnız orkestrator yeniləyir.

Vəziyyətlər: `todo` → `in-progress` → `review` → `done`. Əlavə vəziyyətlər: `blocked`, `skipped`.

| ID | Tapşırıq | Vəziyyət | Branch | Agent / sessiya | Qeyd |
|---|---|---|---|---|---|
| T01 | Ortaq məntiqi `src/core`-a çıxarmaq | todo | `refactor/extract-inspector-core` | – | |
| T02 | Extension skeleti | todo | `feature/extension-scaffold` | – | |
| T03 | Səhifə inspektoru (MAIN world) | todo | `feature/extension-page-inspector` | – | T01, T02 gözləyir |
| T04 | Popup və ayarlar | todo | `feature/extension-popup-and-settings` | – | T02 gözləyir |
| T05 | Redaktor inteqrasiyaları | todo | `feature/extension-editor-integrations` | – | T03, T04 gözləyir |
| T06 | E2E testlər və CI | todo | `feature/extension-e2e-tests` | – | T05 gözləyir |
| T07 | Native messaging host | todo | `feature/extension-native-host` | – | İstəyə görə, Sahibin təsdiqi lazımdır |
| T08 | Paketləmə və store | todo | `chore/extension-release` | – | Sahibin qərarı |
| T09 | npm paketində WebStorm (`/__open-in-editor`) | todo | `feature/npm-webstorm-open-in-editor` | – | T01 gözləyir |

## Jurnal

| Tarix | Hadisə |
|---|---|
| 2026-10-05 | Plan yaradıldı. WebStorm inteqrasiya yolları sınaqdan keçirildi (bax: README "Artıq yoxlanılmış faktlar") |
| 2026-10-05 | Rəydən sonra düzəlişlər: T02 ortaq faylları (mesajlar, ayarlar, `chromeMock`, `ext:test`, extension tsconfig, `@types/chrome`, vitest `include`) tam hazırlayır, T03 və T04 onları yalnız oxuyur. Protokola `all-ignored`, nəticədən sonra rejim cədvəli, `get-status` cache-i və "aktiv deyil" vəziyyəti əlavə olundu. D12 (dinamik qeydiyyatda `world: 'MAIN'` + `executeScript`), aşkarlama qaydası, T07 təhlükəsizlik tələbləri, T01-də ölü `printed` kodunun silinməsi. Yeni T09 |
