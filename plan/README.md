# plan/

Bu qovluq layihədəki işləri agentlərə (Claude Code subagent-ləri və ya ayrı sessiyalar) bölüb idarə etmək üçündür.

## Struktur

```
plan/
├── README.md                  ← bu fayl: qovluğun necə işlədiyi
├── AGENTS.md                  ← bütün agentlər üçün ümumi qaydalar (hər tapşırıqdan əvvəl oxunur)
├── templates/
│   └── TASK_TEMPLATE.md       ← yeni tapşırıq faylı üçün şablon
└── browser-extension/         ← layihə: brauzer extension-ı
    ├── README.md              ← məqsəd, mərhələlər, asılılıq qrafiki
    ├── ARCHITECTURE.md        ← texniki qərarlar və mesaj protokolu
    ├── STATUS.md              ← tapşırıqların vəziyyəti (yalnız orkestrator yeniləyir)
    └── tasks/
        ├── T01-extract-inspector-core.md
        ├── T02-extension-scaffold.md
        ├── ...
        └── T08-extension-release.md
```

## Rollar

| Rol | Kim | Nə edir |
|---|---|---|
| **Sahib** | Siz | Prioritet verir, PR-ları qəbul edir, push və publish qərarlarını verir |
| **Orkestrator** | Əsas Claude sessiyası | Tapşırığı seçir, agenti işə salır, nəticəni yoxlayır, `STATUS.md`-ni yeniləyir |
| **İcraçı agent** | Subagent (`general-purpose`, worktree ilə) | Bir tapşırıq faylını icra edir, öz branch-ində commit edir, hesabat qaytarır |
| **Rəyçi agent** | Subagent və ya `/code-review` | İcraçının diff-ini tapşırığın qəbul meyarlarına görə yoxlayır |

## İş axını

1. Orkestrator `STATUS.md`-də asılılıqları bitmiş `todo` tapşırığı seçir.
2. Agent bu prompt ilə işə salınır (worktree izolyasiyası ilə):
   > `plan/AGENTS.md` və `plan/browser-extension/ARCHITECTURE.md` fayllarını oxu, sonra `plan/browser-extension/tasks/T0X-....md` tapşırığını icra et. Hesabatı AGENTS.md-dəki formatda qaytar.
3. Agent işi bitirəndə hesabat qaytarır. Orkestrator yoxlama əmrlərini özü də işlədir.
4. Rəyçi agent diff-i yoxlayır. Problem varsa, tapşırıq geri qaytarılır.
5. Orkestrator `STATUS.md`-ni `review` vəziyyətinə keçirir və Sahibə bildirir. Push və PR Sahibin qərarıdır.

Paralel işləyə bilən tapşırıqlar hər layihənin `README.md`-sindəki asılılıq qrafikində göstərilib.

## Yeni layihə əlavə etmək

`plan/<layihe-adi>/` qovluğu yaradın, `browser-extension/` strukturunu təkrarlayın və tapşırıqları `templates/TASK_TEMPLATE.md` əsasında yazın.
