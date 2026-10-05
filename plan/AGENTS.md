# Agentlər üçün ümumi qaydalar

Hər tapşırığa başlamazdan əvvəl bu faylı oxu. Tapşırıq faylı ilə bu fayl ziddiyyət təşkil edərsə, tapşırıq faylı üstündür.

## Layihə haqqında

- `react-click-inspector`: React 18 tətbiqlərində kliklənən elementin mənbə faylını tapan dev aləti. React fiber-dəki `_debugSource`-dan istifadə edir.
- Mövcud npm paketi: `src/` (TypeScript, tsup ilə build).
- Yoxlama əmrləri (repo kökündə):
  ```bash
  npm run typecheck
  npm run lint
  npm test
  npm run build
  ```
- Extension üçün əlavə əmrlər T02-də yaradılır: `npm run ext:build`, `npm run ext:test`, `npm run ext:e2e`.

## Branch və commit

- Hər tapşırıq ayrıca branch-dədir. Branch adı tapşırıq faylında verilir.
- Qayda: kiçik hərflər, prefiks dəyişikliyin növünə görə seçilir: `feature/`, `bugfix/`, `refactor/`, `chore/`. Ad kebab-case yazılır, məsələn `feature/extension-popup-and-settings`.
- Baza branch tapşırıq faylında göstərilir (default: `master`).
- Commit mesajı conventional commits formatındadır: `feat: ...`, `fix: ...`, `refactor: ...`, `test: ...`, `chore: ...`.
- Agent öz branch-ində commit edə bilər. **Push etmir, PR açmır, npm və ya Chrome Web Store-a publish etmir.** Bunlar Sahibin qərarıdır.

## Kod üslubu

- Mövcud kodun üslubuna uy: 2 boşluq, tək dırnaq, funksional komponentlər, `I`-prefiksli interfeyslər (`IReactClickInspector`).
- **Yeni izahedici şərh yazma.** Mövcud şərhlərə toxunma. İzahı hesabatda ver.
- `any` istifadə etmə. Lazım olsa, minimal interfeys yarat (`IFiber` nümunəsinə bax).
- Yeni asılılıq yalnız tapşırıqda icazə verilibsə əlavə olunur. Əlavə etsən, hesabatda versiyası ilə birlikdə göstər.

## Əhatə dairəsi

- Yalnız tapşırıqdakı "Toxunula bilən fayllar" siyahısındakı faylları dəyiş.
- Başqa faylda dəyişiklik lazım olsa, dəyişmə: hesabatda "Əhatədən kənar" bölməsində yaz.
- `plan/` qovluğunu dəyişmə. `STATUS.md`-ni yalnız orkestrator yeniləyir.
- Sistem ayarlarını, registry-ni və qlobal paketləri dəyişmə. İstisna: T07, və orada da yalnız Sahibin təsdiqindən sonra.

## Yoxlama

- Tapşırığı bitmiş saymazdan əvvəl qəbul meyarlarındakı bütün əmrləri işlət.
- Brauzerdə yoxlama lazımdırsa, `extension/e2e/fixture` demo tətbiqindən istifadə et (T02 və T06-dan sonra mövcuddur).
- Bir əmr uğursuz olarsa, onu "keçdi" kimi yazma: çıxışı hesabatda göstər.

## Hesabat formatı

İş bitəndə bu formatda qısa hesabat qaytar:

```
## T0X hesabatı
Vəziyyət: done | blocked | partial
Branch: <ad>   Commit(lər): <hash> <mesaj>

### Edilənlər
- ...

### Yoxlama
- npm run typecheck: keçdi / uğursuz (çıxış)
- ...

### Qərarlar və fərziyyələr
- ...

### Əhatədən kənar / açıq suallar
- ...
```
