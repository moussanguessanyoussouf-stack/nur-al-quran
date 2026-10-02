# Architecture technique

## Principes directeurs (cf. cahier des charges §6.1)

- **Primauté du hors-ligne** — tout l'essentiel fonctionne sans réseau.
- **Séparation contenu / code** — le corpus religieux (`data/`) est une ressource
  vérifiable, distincte de la logique applicative (`js/`).
- **Sobriété** — aucune dépendance de build, aucun framework, aucun traceur.
- **Portabilité** — HTML/CSS/JavaScript standard, modules ES natifs.

## Pourquoi une PWA sans build ?

Le projet n'utilise **ni Node.js, ni bundler, ni transpileur**. Les raisons :

1. **Déploiement trivial** — fichiers statiques servables partout (GitHub Pages, tout hébergeur).
2. **Hors-ligne natif** — un *service worker* suffit ; pas d'outillage.
3. **Longévité & maintenabilité** — aucune chaîne d'outils à maintenir à jour (NF-19).
4. **Auditabilité** — le code livré est le code écrit, lisible tel quel.

## Modules (`js/`)

| Module | Responsabilité |
|---|---|
| `app.js` | Point d'entrée ; orchestration de l'UI, navigation, câblage des événements. |
| `data.js` | Chargement de `surahs.json` / `quran.json`, indexation, contrôle d'intégrité. |
| `sha256.js` | SHA-256 pur (repli lorsque `crypto.subtle` est indisponible, ex. `file://`). |
| `store.js` | Persistance locale (`localStorage`) : réglages, position, signets, notes, surlignages. |
| `audio.js` | Lecteur audio : file de lecture, boucle, *Media Session*, construction d'URL. |
| `reader.js` | Rendu du Mushaf, décorations (signets/notes/surlignages), surlignage de récitation. |
| `search.js` | Normalisation arabe/latine, recherche texte et par référence. |
| `recognizer.js` | Reconnaissance vocale (API Web Speech) derrière une interface remplaçable. |
| `tracker.js` | Alignement de la récitation sur le texte, détection d'écarts, relevé (Lot 2). |
| `words.js` | Découpage en mots, partagé entre le rendu et l'alignement (index cohérents). |
| `icons.js` | Jeu d'icônes SVG injecté dans le DOM. |

### Récitation guidée (Lot 2)

Deux responsabilités séparées :
- **Reconnaissance** (`recognizer.js`) — convertit la voix en texte. Implémentation : API Web Speech
  du navigateur (Chrome/Edge, en ligne). Interface minimale (`start/stop` + callbacks `final/interim/
  state/error`) pour permettre de brancher un **moteur embarqué hors-ligne** (ex. Vosk WASM) sans
  rien changer d'autre — c'est la voie pour satisfaire pleinement RV-05 et la confidentialité NF-11.
- **Alignement** (`tracker.js`) — 100 % local, testable sans micro. Aligne les mots transcrits sur la
  séquence attendue (distance de Levenshtein tolérante), avance un curseur, détecte omissions/ajouts,
  gère les reprises (fenêtre arrière), et produit le relevé de fin de séance. Le rendu mot à mot
  (`reader.js`, `wordMode`) et l'alignement partagent `words.js`, garantissant des index cohérents
  entre le DOM et la logique.

> Limites assumées (affichées à l'usager) : la reconnaissance de l'arabe coranique est approximative
> et n'est **pas une autorité de tajwīd** ; c'est une aide, non un substitut à l'enseignant.

## Données (`data/`)

- `surahs.json` — métadonnées des 114 sourates (nom arabe, translittéré, type, nombre de
  versets, page de début, présence de basmala) + bloc `meta` (sources, empreinte).
- `quran.json` — 6236 versets. Chaque entrée :
  `{ s, a, g, t, f, r, j, p, h, sj }` =
  sourate, verset, numéro global, texte arabe, français, translittération,
  juzʾ, page, quart de ḥizb, prosternation.

Format compact (clés courtes) pour limiter le poids (~3,4 Mo) et accélérer l'analyse.

## Intégrité du texte (ED-02, AR-01/AR-02)

Au chargement, l'application recalcule l'empreinte SHA-256 du texte arabe et la compare à
l'empreinte attendue stockée dans les données. En cas d'écart : avertissement à l'usager et
ouverture de la fenêtre « Intégrité & sources ». `crypto.subtle` est utilisé en contexte
sécurisé (HTTPS / localhost) ; sinon le repli `sha256.js` prend le relais.

## Hors-ligne (`sw.js`)

- **Pré-cache** à l'installation : coquille, modules, données, polices, icônes.
- **Récitations** : stratégie *cache-first* avec repli réseau, mise en cache au premier accès.
- **Navigation** : repli sur `index.html`.

## Accessibilité & i18n

- RTL (arabe) et LTR (français) gérés séparément.
- Zones tactiles ≥ 44 px, focus visible, `prefers-reduced-motion` respecté.
- Thèmes à fort contraste ; taille et interligne réglables.
- Interface en français ; chaînes centralisées côté vue (internationalisation ultérieure aisée).

## Limites connues / pistes

- Suivi audio au **niveau du verset** (pas encore mot à mot : nécessiterait des horodatages
  par mot, disponibles via d'autres jeux de données).
- Pas encore de reconnaissance vocale (Lot 2) ni de mémorisation outillée (Lot 3).
- Noms de sourates affichés en arabe + translittération ; un libellé français vérifié
  pourra être ajouté après validation.
