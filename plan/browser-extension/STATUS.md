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

## Jurnal

| Tarix | Hadisə |
|---|---|
| 2026-10-05 | Plan yaradıldı. WebStorm inteqrasiya yolları sınaqdan keçirildi (bax: README "Artıq yoxlanılmış faktlar") |
