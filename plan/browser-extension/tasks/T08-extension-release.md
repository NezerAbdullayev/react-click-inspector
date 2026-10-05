# T08: (Sahibin qərarı) Paketləmə və store

| Sahə | Dəyər |
|---|---|
| Branch | `chore/extension-release` |
| Baza | `master` (T06-dan sonra) |
| Asılıdır | T06 |
| Paralel işləyə bilər | T07 |
| Agent | `general-purpose` |
| Təxmini həcm | S |
| **Təsdiq** | Store-a yükləmə və publish yalnız Sahib tərəfindən edilir |

## Məqsəd
Extension-ı paylaşıla bilən formaya salmaq: versiyalanmış zip, store üçün mətnlər və ekran görüntüləri. Store-a yükləməni agent etmir.

## Toxunula bilən fayllar
- `extension/manifest.json` (`version`, `description`)
- `extension/store/**` (yeni: təsvir, privacy mətni, ekran görüntüləri)
- `package.json` (`ext:zip` skripti)
- `CHANGELOG.md`

## Addımlar
1. `ext:zip`: `extension/dist`-i `react-click-inspector-extension-<version>.zip` faylına yığır.
2. Final ikonlar (16, 32, 48, 128) və store üçün 1280×800 ekran görüntüləri. Görüntülər fixture tətbiqdən Playwright ilə çəkilir.
3. `extension/store/description.md`: qısa və uzun təsvir, icazələrin izahı (hər icazə nə üçündür).
4. `extension/store/privacy.md`: extension heç bir məlumat toplamır və göndərmir. WebStorm sorğusu yalnız səhifənin öz origin-inə gedir.
5. `CHANGELOG.md`-yə extension bölməsi.

## Qəbul meyarları
- [ ] `npm run ext:zip` zip yaradır, zip-dən "Load unpacked" ilə yüklənən extension işləyir
- [ ] Hər icazə `description.md`-də izah olunub

## Əhatədən kənar
- Chrome Web Store və Edge Add-ons-a yükləmə (Sahib edir)
