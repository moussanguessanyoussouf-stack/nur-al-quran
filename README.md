# Nûr al-Qur'ân — نور القرآن

**Compagnon numérique de lecture, d'écoute et de mémorisation du Saint Coran.**
Application web progressive (PWA) **sans étape de build**, fonctionnant **hors connexion**,
conçue avec sobriété et respect du texte sacré.

> *Au nom de Dieu, le Tout-Miséricordieux, le Très-Miséricordieux.*

Ce dépôt met en œuvre le **Lot 1 (socle)** et le **Lot 2 (reconnaissance de la récitation)**
du cahier des charges : lecture du Mushaf, navigation, écoute audio synchronisée, recherche,
repères personnels, hors-ligne, et **récitation guidée** (suivi vocal mot à mot).

---

## ✨ Fonctionnalités (Lot 1)

- **Lecture du Mushaf** — texte arabe en lecture *Ḥafṣ ʿan ʿĀṣim*, typographie soignée
  (polices *Amiri Quran* / *Scheherazade New*), basmala en en-tête, numéros de versets
  en chiffres arabes, versets de prosternation signalés.
- **Navigation** — par sourate, juzʾ, ḥizb (quart), page et numéro de verset.
- **Reprise automatique** à la dernière position consultée.
- **Affichage réglable** — thème *clair / sépia / sombre*, taille du texte, interligne,
  style calligraphique, traduction française et translittération optionnelles.
- **Écoute audio** — plusieurs récitateurs reconnus, surlignage synchronisé du verset,
  défilement automatique, lecture continue, **boucle configurable** (verset / plage / page),
  vitesse ajustable, lecture en arrière-plan (*Media Session*).
- **Recherche** — dans le texte arabe (sans vocalisation), en français, ou par référence (`2:255`).
- **Repères personnels** — signets, notes rattachées aux versets, surlignage couleur, récents.
- **Intégrité du texte** — empreinte **SHA-256** vérifiée au chargement (avertissement en cas d'écart).
- **Hors connexion** — *service worker* : coquille, données et polices pré-cachées ;
  récitations mises en cache à la demande.
- **Récitation guidée (Lot 2)** — récitez à voix haute : l'application **suit votre lecture
  mot à mot** (surlignage « doigt qui suit »), **détecte les écarts** (omissions, ajouts),
  **gère les reprises**, et produit un **relevé de fin de séance**. Moteur de reconnaissance :
  API Web Speech (Chrome/Edge, en ligne) ; moteur d'alignement/détection local et remplaçable.
- **Respect & bienséance** — aucune publicité, mode de lecture recueillie (épuré),
  masquage non destructif, traitement digne du texte.

## 🚀 Lancer en local

L'application est statique : **aucune installation ni compilation**. Il suffit de la servir en HTTP.

```powershell
# Depuis la racine du projet (Windows PowerShell) :
./scripts/serve.ps1
# puis ouvrir http://127.0.0.1:8787/
```

> Ouvrir `index.html` directement en `file://` ne fonctionne pas : les navigateurs bloquent
> le chargement des modules ES et de `fetch` hors d'un contexte HTTP. Un simple serveur statique
> suffit (le script ci-dessus, `npx serve`, l'extension *Live Server*, GitHub Pages, etc.).

## 🌐 Déploiement (GitHub Pages)

Le projet se publie tel quel : aucun build. Dans les réglages du dépôt → **Pages**,
choisir la branche `main` et le dossier `/ (root)`. L'application sera servie en HTTPS,
ce qui active le *service worker* (hors-ligne) et `crypto.subtle` (intégrité).

## 🗂️ Structure

```
index.html              Coquille de l'application
manifest.webmanifest    Manifeste PWA
sw.js                   Service worker (hors-ligne)
css/styles.css          Thèmes, mise en page, RTL, accessibilité
js/
  app.js                Orchestration (navigation, audio, recherche, repères)
  data.js               Chargement + contrôle d'intégrité (SHA-256)
  sha256.js             SHA-256 pur (repli hors contexte sécurisé)
  store.js              Persistance locale (réglages, position, repères)
  audio.js              Lecteur (récitateurs, boucle, Media Session)
  reader.js             Rendu du Mushaf (+ mode mot à mot), décorations, surlignage
  search.js             Recherche (arabe normalisé, français, référence)
  recognizer.js         Reconnaissance vocale (API Web Speech, interface remplaçable)
  tracker.js            Alignement récitation/texte + détection d'écarts (Lot 2)
  words.js              Découpage en mots (partagé rendu/alignement)
  icons.js              Jeu d'icônes SVG
data/
  surahs.json           Métadonnées des 114 sourates
  quran.json            6236 versets (arabe + français + translittération + repères)
fonts/                  Polices arabes (SIL OFL)
icons/                  Icônes de l'application
scripts/
  build-data.ps1        (Re)génère les données depuis la source + empreinte
  serve.ps1             Serveur statique local
docs/
  SOURCES.md            Provenance, licences, intégrité
  ARCHITECTURE.md       Vue d'ensemble technique
  CONFORMITE-CDC.md     Couverture du cahier des charges
```

## 📜 Sources & licences

- **Code** : licence MIT (voir [LICENSE](LICENSE)).
- **Texte, traduction, récitations, polices** : voir [docs/SOURCES.md](docs/SOURCES.md).
  Les droits (traductions, récitations, polices) doivent être vérifiés avant toute
  diffusion à grande échelle (cf. cahier des charges, §7.1).

## ⚠️ Avertissements

- Une **traduction** est une interprétation du sens, et non le Coran lui-même.
- L'**assistance à la récitation** (reconnaissance vocale, Lot 2) est une aide, non un
  substitut à l'enseignement d'un maître qualifié.
- Les contenus religieux doivent faire l'objet d'une **validation par un comité de savants**
  avant toute publication (cf. cahier des charges, §3.2).

## 🛣️ Suite (lots ultérieurs)

- **Lot 2** — ✅ reconnaissance de la récitation, détection des écarts, relevé de session.
  *(Prochaine étape : moteur embarqué hors-ligne — ex. Vosk WASM — pour RV-05 complet, et tajwīd indicatif RV-04.)*
- **Lot 3** — mémorisation : masquage progressif, répétition espacée, auto-évaluation.
- **Lot 4** — comptes facultatifs, synchronisation, plans et assignations, statistiques.
- **Lot 5** — lectures multiples (qirāʾāt), langues additionnelles, compagnon du fidèle.

Voir [docs/CONFORMITE-CDC.md](docs/CONFORMITE-CDC.md) pour le détail de la couverture.
