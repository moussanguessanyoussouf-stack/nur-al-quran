# Reconnaissance de la récitation — état, limites et voies d'amélioration

Ce document explique pourquoi la reconnaissance actuelle est imparfaite et décrit les
options réalistes pour un vrai moteur dédié à la récitation coranique (comme *Tarteel*).

## 1. Ce qui est en place aujourd'hui

| Contexte | Moteur utilisé | Limite principale |
|---|---|---|
| Web / navigateur | **API Web Speech** (Chrome/Edge) | arabe **courant**, en ligne, non entraîné au Coran |
| Application Android | **@capacitor-community/speech-recognition** (moteur natif Android / Google) | idem : arabe conversationnel, pas la psalmodie classique |

Le moteur d'**alignement** (`js/tracker.js`) — qui compare les mots reconnus au texte attendu,
tolère les erreurs (distance de Levenshtein), gère omissions et reprises — est, lui, propre au
projet et de bonne qualité. **Le maillon faible est la transcription audio → texte**, pas l'alignement.

## 2. Pourquoi la reconnaissance générique échoue sur le Coran

- Les moteurs grand public (Google, Apple) sont entraînés sur l'**arabe dialectal/MSA parlé**,
  pas sur le **tajwīd** (allongements, assimilations, psalmodie, voyelles classiques).
- Ils normalisent/raccourcissent, ignorent la vocalisation complète, et « devinent » des mots
  du quotidien — très loin du texte coranique.
- Résultat : peu ou pas de correspondances → le surligneur n'avance pas de façon fiable.

## 3. L'idée clé : alignement contraint, pas reconnaissance ouverte

Les applications de référence ne font **pas** de la reconnaissance ouverte : elles exploitent le
fait que **le texte attendu est connu**. On passe d'un problème très dur (« transcrire n'importe
quel audio ») à un problème abordable (« vérifier que l'audio correspond à CE passage »).

Deux familles de solutions :

### 3.a. Modèle acoustique dédié au Coran (la voie « Tarteel »)
- Un modèle de reconnaissance **entraîné spécifiquement sur des récitations** (grandes bases de
  données de versets récités, alignés au texte).
- *Tarteel* a publié des ressources ouvertes utiles : jeux de données de récitations étiquetées
  et travaux de modèles (chercher « Tarteel / quran speech recognition dataset »).
- Mise en œuvre : entraîner/affiner un modèle (ex. **Whisper** ou **wav2vec2**) sur ces données,
  puis l'exécuter côté serveur (GPU) ou, en version réduite, sur l'appareil.

### 3.b. Alignement forcé (forced alignment) sur le texte connu
- On fournit au système l'**audio** + le **texte attendu** ; il **aligne** les deux (quel mot à
  quel instant), au lieu de deviner les mots.
- Outils : **Montreal Forced Aligner**, **CTC-segmentation**, ou un modèle phonétique arabe.
- Avantage : beaucoup plus robuste que la reconnaissance ouverte, et donne directement la
  progression mot à mot (exactement ce dont le surligneur a besoin).
- Inconvénient : traitement plus lourd (souvent par segments, pas strictement « temps réel »).

## 4. Options concrètes pour ce projet

| Option | Qualité attendue | Coût / complexité | Hors-ligne | Vie privée |
|---|---|---|---|---|
| **A. Whisper (base/small) affiné Coran, côté serveur** | ✅ bonne | serveur + GPU, API à héberger | ❌ (réseau) | ⚠️ audio envoyé au serveur |
| **B. Whisper.cpp / transformers.js sur l'appareil** | 🟡 moyenne (modèle réduit) | lourd (100–500 Mo), lent sur mobile | ✅ | ✅ local |
| **C. Vosk + modèle arabe personnalisé** | 🟡 moyenne | modèle ~50 Mo, intégration WASM/natif | ✅ | ✅ local |
| **D. Alignement forcé (serveur) sur le verset affiché** | ✅ très bonne pour la progression | serveur, par segments | ❌ | ⚠️ audio envoyé |
| **E. Garder le moteur natif + mode « validation manuelle »** | — (pas de reco) | faible | ✅ | ✅ | 

> **Recommandation.** Pour une vraie expérience type *Tarteel*, la voie la plus solide est
> **A (Whisper affiné, serveur)** ou **D (alignement forcé)**. Les deux impliquent un **backend**
> (hébergement d'un modèle), ce qui sort du cadre « PWA statique » actuel mais reste faisable en
> ajoutant un petit service. La voie **B/C** (sur l'appareil) préserve la vie privée et le
> hors-ligne mais demande un gros téléchargement et reste moins précise.

## 5. Étapes proposées si l'on choisit la voie serveur (A ou D)

1. Monter un petit service (ex. Python + FastAPI) exposant `POST /recognize` (audio → texte) ou
   `POST /align` (audio + texte attendu → progression).
2. Héberger Whisper (affiné Coran si possible) ou un aligneur ; GPU recommandé pour la latence.
3. Dans l'app : enregistrer de courts segments audio et les envoyer au service ; alimenter
   `tracker.js` avec le résultat — **l'alignement et l'UI existants restent inchangés**.
4. **Consentement explicite** (l'audio quitte l'appareil) et chiffrement — conformément au cahier
   des charges (NF-11/NF-12).

## 6. En attendant

L'architecture est déjà prête : `js/recognizer.js` isole le moteur derrière une interface
(`createRecognizer`). Brancher l'une des options ci-dessus **ne touche ni à l'alignement
(`tracker.js`) ni à l'interface de récitation**. La solution de repli immédiate, sans backend,
est un **mode « validation manuelle »** (l'usager avance lui-même, l'app sert de guide et de
minuteur), qui peut cohabiter avec la reconnaissance automatique quand elle sera fiable.

> Rappel : quelle que soit la solution, l'assistance reste une **aide** et non une autorité de
> tajwīd ; la primauté revient à l'enseignant qualifié.
