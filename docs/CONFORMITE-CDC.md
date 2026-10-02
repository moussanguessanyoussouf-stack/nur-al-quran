# Couverture du cahier des charges

État au terme du **Lot 1 (socle)**. Légende :
✅ réalisé · 🟡 partiel · ⬜ lot ultérieur · ➖ hors socle

## Plateformes (§2.1)
| Réf | Exigence | État |
|---|---|---|
| PF-03 | Version web (lecture, écoute, recherche) | ✅ |
| PF-04 | Installable / hors-ligne (PWA) | ✅ |
| PF-01/02 | Android / iOS | 🟡 *(PWA installable ; natif non visé par le socle)* |

## Éditorial & religieux (§3)
| Réf | Exigence | État |
|---|---|---|
| ED-01 | Édition de référence, Ḥafṣ ʿan ʿĀṣim | 🟡 *(Tanzil Uthmani ; Mushaf de Médine recommandé — voir SOURCES)* |
| ED-02 | Contrôle d'empreinte (SHA-256) au démarrage | ✅ |
| ED-03 | Vocalisation, signes d'arrêt, numéros de versets | ✅ |
| ED-05 | Mention des sources et éditions | ✅ *(fenêtre « Intégrité & sources »)* |
| ED-09 | Traductions attribuées, nature interprétative signalée | ✅ |
| ED-10 | Traduction française de référence | ✅ *(Hamidullah)* |
| ED-12 | Dignité graphique, pas de publicité au contact du texte | ✅ |
| ED-13 | Aucune fonction irrévérencieuse | ✅ |
| ED-14 | Masquage non destructif | ✅ *(surlignage/masquage n'altèrent pas le texte ; masquage ḥifẓ en Lot 3)* |
| ED-15 | Mode de lecture recueillie (épuré) | ✅ |
| ED-06/07/08 | Validation comité, signalement, sanad | ⬜ *(processus éditorial — hors code)* |

## Lecture du Mushaf (§4.1)
| Réf | Exigence | État |
|---|---|---|
| LC-01 | Rendu fidèle, typographie arabe soignée | ✅ |
| LC-02 | Navigation sourate / juzʾ / ḥizb / page / verset | ✅ |
| LC-03 | Reprise à la dernière position | ✅ |
| LC-04 | Taille, interligne, thème (clair/sombre/sépia) | ✅ |
| LC-05 | Translittération et traduction | ✅ |
| LC-07 | Choix du style calligraphique | ✅ *(Uthmani / Naskh)* |
| LC-06 | Mot-à-mot | ⬜ |

## Écoute audio (§4.2)
| Réf | Exigence | État |
|---|---|---|
| AU-01 | Plusieurs récitateurs, verset par verset et continu | ✅ |
| AU-02 | Mise en évidence + défilement synchronisé | ✅ |
| AU-03 | Boucle (verset / plage / page), répétitions paramétrables | ✅ |
| AU-04 | Réglage de la vitesse | ✅ |
| AU-05 | Téléchargement / écoute hors-ligne | ✅ *(cache à la demande)* |
| AU-06 | Arrière-plan, commandes externes (Media Session) | ✅ |
| AU-07 | Listes d'écoute personnelles | ⬜ |

## Reconnaissance de la récitation (§4.3)
| Réf | Exigence | État |
|---|---|---|
| RV-01 | Suivi vocal + surlignage mot à mot (« doigt qui suit ») | ✅ |
| RV-02 | Détection des écarts (omissions, ajouts) | 🟡 *(omissions/ajouts ; interversions et hésitation partiels)* |
| RV-03 | Reprise sans rupture quand l'usager recommence | ✅ *(fenêtre de reprise arrière)* |
| RV-06 | Relevé de fin de séance (passages à retravailler) | ✅ |
| RV-05 | Fonctionnement hors ligne | 🟡 *(moteur Web Speech en ligne ; interface prête pour un moteur embarqué — ex. Vosk WASM)* |
| RV-04 | Inexactitudes de tajwīd | ⬜ *(non traité de façon fiable)* |

## Mémorisation (§4.4)
| Réf | Exigence | État |
|---|---|---|
| HF-01..06 | Objectifs, masquage progressif, répétition espacée, auto-éval | ⬜ **Lot 3** |

## Recherche (§4.5)
| Réf | Exigence | État |
|---|---|---|
| RS-01 | Recherche arabe (avec/sans vocalisation) et traductions | ✅ |
| RS-02 | Par numéro / nom de sourate | ✅ |
| RS-04 | Filtrer, accéder au passage | ✅ *(accès direct ; filtres avancés ultérieurs)* |
| RS-03 | Recherche par la voix | ⬜ *(dépend du Lot 2)* |

## Repères personnels (§4.6)
| Réf | Exigence | État |
|---|---|---|
| RP-01 | Signets et favoris | ✅ |
| RP-02 | Notes rattachées à un verset | ✅ |
| RP-03 | Surlignage par couleurs | ✅ |
| RP-04 | Organisation / recherche des repères | 🟡 *(signets / notes / récents ; dossiers ultérieurs)* |

## Compte & synchronisation (§4.9)
| Réf | Exigence | État |
|---|---|---|
| CU-01 | Usage sans compte | ✅ |
| CU-03 | Export / import des données locales | 🟡 *(export disponible dans le store ; UI à finaliser)* |
| CU-02/CU-04 | Synchronisation / suppression de compte | ⬜ **Lot 4** |

## Non fonctionnel (§5)
| Réf | Exigence | État |
|---|---|---|
| NF-01 | Ouverture de page quasi instantanée | ✅ |
| NF-02 | Suivi audio en temps réel | ✅ |
| NF-04 | Texte + traduction + lecture hors-ligne | ✅ |
| NF-05 | Récitations téléchargeables / gérables | 🟡 *(cache à la demande ; gestion fine de l'espace ultérieure)* |
| NF-06/07 | Accessibilité, grossissement | 🟡 *(bonnes bases ; audit lecteur d'écran à mener)* |
| NF-08 | RTL/LTR irréprochable | ✅ |
| NF-09 | Interface français + arabe | 🟡 *(français ; interface arabe à activer)* |
| NF-11..14 | Confidentialité, aucune cession, local-first | ✅ *(tout en local, aucun traceur)* |
| NF-16 | Stabilité, pas de perte de repères | ✅ |

## Intégrité & chaîne de confiance (§6.3)
| Réf | Exigence | État |
|---|---|---|
| AR-01 | Vérification d'empreinte à l'installation/MAJ | ✅ |
| AR-02 | Rejet + avertissement si empreinte non concordante | ✅ |
| AR-03 | Traçabilité des sources et versions | ✅ *(docs/SOURCES.md + fenêtre dédiée)* |
