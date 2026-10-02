# Sources, provenance et licences

Conformément au cahier des charges (§3.1 intégrité et source, §3.3 traductions,
§7.1 contraintes juridiques, AR-03 traçabilité), ce document consigne l'origine
de chaque ressource et les vérifications de droits à effectuer.

## Texte coranique (arabe)

| | |
|---|---|
| **Édition** | Texte *Uthmani* (Tanzil), lecture **Ḥafṣ ʿan ʿĀṣim** |
| **Obtenu via** | [AlQuran Cloud API](https://alquran.cloud) — édition `quran-uthmani` |
| **Source amont** | [Tanzil Project](https://tanzil.net) (Quran text, Uthmani) |
| **Versets** | 6236 · 114 sourates |
| **Empreinte SHA-256** | `3988a03007b61210c608b3e4940006ccc4579bff86c6c34af0f3cfd28d54bf8d` |

> L'empreinte est calculée sur la concaténation des textes de versets (ordre canonique,
> séparés par `\n`, encodage UTF-8), après retrait de la basmala préfixée aux premiers
> versets. Elle est **recalculée et vérifiée au chargement** (`js/data.js` + `js/sha256.js`).

**À vérifier avant diffusion :** pour une conformité maximale au cahier des charges
(ED-01), il est recommandé de substituer, après validation du comité religieux, le texte
du **Complexe du Roi Fahd (Mushaf de Médine)** à l'édition Tanzil, chaque source
disposant de ses propres conditions d'usage.

## Traduction française

| | |
|---|---|
| **Traducteur** | Muhammad Hamidullah |
| **Obtenu via** | AlQuran Cloud — édition `fr.hamidullah` |

Toute traduction est **une interprétation du sens**, et non le Coran lui-même (ED-09).

## Translittération

| | |
|---|---|
| **Édition** | `en.transliteration` (AlQuran Cloud) |
| **Usage** | aide à la lecture pour non-arabophones (LC-05) |

## Récitations audio

| | |
|---|---|
| **Fournisseur** | [EveryAyah.com](https://everyayah.com) — fichiers MP3 verset par verset |
| **Récitateurs** | Al-ʿAfâsy, Al-Huṣary, Al-Minshâwî, ʿAbd al-Bâsiṭ, As-Sudays, Ash-Shuraym |
| **Diffusion** | en flux depuis everyayah.com ; mises en cache à la demande (hors-ligne) |

**À vérifier avant diffusion :** droits de diffusion de chaque récitation, et documentation
de la chaîne de transmission (*sanad / ijāza*) lorsque possible (ED-08).

## Annotations de tajwīd (coloration)

| | |
|---|---|
| **Source** | [Quran.com API v4](https://api.quran.com) — champ `text_uthmani_tajweed` |
| **Usage** | coloration indicative des règles (madd, ghunna, qalqala, ikhfāʾ, idghām, iqlāb, lettres non prononcées) comme **aide à la lecture**, activable dans les réglages |
| **Fichier** | `data/tajweed.json` (régénérable, chargé à la demande) |

**À vérifier avant diffusion :** la coloration est une aide indicative et devrait être
**validée par un comité de savants** (ED-06). Elle ne remplace pas l'enseignement d'un maître.

## Polices de caractères

| Police | Licence | Usage |
|---|---|---|
| **Amiri Quran** | SIL Open Font License 1.1 | texte du Mushaf (style Uthmani) |
| **Amiri** | SIL Open Font License 1.1 | titres et éléments arabes |
| **Scheherazade New** | SIL Open Font License 1.1 | second style calligraphique (naskh) |

Voir [../fonts/LICENSES.md](../fonts/LICENSES.md). La SIL OFL autorise un usage libre
(y compris commercial) sous réserve de conserver la licence et de ne pas vendre les polices seules.

## Reproductibilité

Les fichiers `data/surahs.json` et `data/quran.json` sont régénérables via
[`../scripts/build-data.ps1`](../scripts/build-data.ps1), qui télécharge les éditions,
les fusionne, retire la basmala préfixée et recalcule l'empreinte d'intégrité.

## Rappel de validation religieuse

Aucun contenu religieux ne devrait être publié sans **validation par un comité de savants
qualifiés** (ED-06). Le présent dépôt est un socle technique ; la certification éditoriale
relève de la maîtrise d'ouvrage et du comité.
