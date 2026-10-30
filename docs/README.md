# Roadmap de parité Notion

Architecture obligatoire : [organisation des fichiers et règles d’import](ARCHITECTURE.md).


Objectif : une implémentation indépendante, open source et légère en TypeScript, SolidJS et Tiptap, avec des documents `.md` locaux. Le travail immédiat porte sur l’éditeur et une interface fidèle à une version identifiée de Notion. **L’IA et la collaboration restent hors périmètre actuel.**

## Les deux listes

| Document | Couverture | Critères |
| --- | --- | ---: |
| [Fonctionnalités](NOTION_FEATURES_TODO.md) | Pages, blocs, manipulation, bases, vues, propriétés, formules, médias, navigation, import/export, fiabilité et écosystème | 408 |
| [Interface et interactions](NOTION_UI_TODO.md) | Écrans, composants, styles, menus, glisser-déposer, états, clavier, mobile, accessibilité et recette visuelle | 328 |
| [Références](NOTION_REFERENCE.md) | Sources officielles et limites de la référence visuelle | 51 entrées |

Inventaire aussi complet que possible des familles de fonctionnalités publiques au **30 octobre 2026**, complété par nos critères de recette. Il ne prétend pas documenter tous les détails internes, expérimentations ou variantes commerciales de Notion. Les produits adjacents et fonctions différées sont recensés pour rendre les limites explicites.

## Lire et maintenir les cases

- `[x]` : résultat précis déjà vérifié ; ne signifie pas que toute la fonction atteint la parité Notion.
- `[ ] [PARTIEL]` : composant ou comportement présent dans Fotion 0.2.0, à compléter et à valider.
- `[ ]` : à implémenter ou à vérifier.
- `P0` : qualité de l’éditeur, fidélité des interactions et conservation des données.
- `P1` : fonctionnalités centrales suivantes, notamment bases et navigation avancée.
- `P2` : fonctions avancées après stabilisation du socle.
- `DIFFÉRÉ` / `HORS PÉRIMÈTRE ACTUEL` : inventaire uniquement ; pas d’engagement à les implémenter maintenant.

Les identifiants `FN-…` et `UI-…` sont stables et peuvent être repris dans les issues, commits et tests. Les 10 cases fonctionnelles cochées décrivent des garanties étroites du code actuel. **Aucune case UI n’est cochée**, faute de comparaison visuelle complète. Un ratio de cases cochées ne serait pas un pourcentage fiable de parité : les efforts sont très différents d’un critère à l’autre.

## Ordre de réalisation

1. Fixer la référence visuelle : version datée de Notion, plateforme bureau/web, langue et thème. Créer des pages de démonstration sans données personnelles, identiques des deux côtés.
2. Finir les sections P0 : cadre, barre latérale, titres, canevas, menus, sélection, formatage et drag-and-drop. Vérifier séparément le déplacement des pages, blocs, éléments de liste et, à terme, colonnes.
3. Stabiliser le contrat Markdown : aller-retour, blocs inconnus, fichiers joints, conflits et récupération. Aucun changement visuel ne doit compromettre une sauvegarde.
4. Compléter les blocs et la navigation P1 : colonnes, médias locaux, liens, backlinks, recherche, modèles et historique accessible.
5. Introduire les bases avec un modèle de données documenté : propriétés, vues, filtres, tris, relations et formules. Livrer les fonctions et leurs états UI ensemble.
6. Traiter P2 selon les besoins réels. Réouvrir explicitement le périmètre avant de développer collaboration, IA, cloud ou produits adjacents.

## Correspondance entre fonction et interface

| Travail | Checklist fonctionnelle | Checklist UI |
| --- | --- | --- |
| Pages et navigation | Sections 01, 07, 08 | Sections 03 à 06, 13, 14 |
| Éditeur et déplacements | Sections 02 à 05 | Sections 07 à 11 |
| Médias | Section 06 | Section 12 |
| Bases et projets | Sections 09 à 12 | Sections 15, 16 |
| Modèles et automations | Sections 13, 14 | Section 17 |
| Données et récupération | Sections 15, 16 | Sections 18, 21 |
| Fonctions différées | Sections 17 à 22 | Sections 19, 20 |
| Recette transversale | Toutes les sections actives | Sections 01, 02, 21 à 23 |

## Contrat local et différences assumées

Les pages `.md` restent la source de vérité. Les formats non représentables en Markdown standard nécessitent une convention documentée et réversible : propriétés YAML, extensions Markdown ou métadonnées locales explicitement définies. Les bases relationnelles, colonnes et blocs synchronisés ne doivent pas être déclarés compatibles Obsidian avant de tester leur conservation et leur rendu.

Le stockage local remplace volontairement le stockage cloud de Notion. Les écrans de compte, partage, IA ou facturation ne doivent pas devenir des boutons factices pour donner l’impression d’une parité. Les données privées de `vault/`, son historique, les dépendances installées et les builds ne font pas partie du dépôt public.

## Définition de terminé

Pour cocher un critère, joindre une preuve adaptée : test automatisé du comportement, fixture de round-trip ou capture et scénario de recette. Les liens vers le code présent à l’état initial figurent à la fin de chaque checklist.

Pour une fonction qui modifie le document, vérifier le résultat après sauvegarde et réouverture, l’annulation/rétablissement et les cas limites pertinents. Ne pas cocher une ligne groupant plusieurs comportements tant que chacun n’est pas validé ; la scinder si nécessaire sans réutiliser son identifiant.

Pour l’interface, comparer à contenu, dimensions de fenêtre, zoom, densité de pixels, polices, langue et thème identiques. Capturer repos, survol, focus, sélection, menus, déplacement/dépôt, chargement, vide et erreur. Vérifier les captures par superposition, puis les interactions dans un navigateur réel au clavier et au pointeur. Les tests DOM existants ne certifient ni la géométrie ni le tactile.

Les tolérances de différence visuelle et les budgets de performance seront des objectifs mesurés du projet, pas des valeurs prétendument fournies par Notion. Conserver les écarts connus avec leur justification avant de déclarer une surface « 1:1 ».

## Entretien de l’inventaire

- [ ] Fixer et archiver le jeu de références visuelles retenu.
- [ ] Revalider les fonctions dépendantes de la plateforme, du forfait ou d’un déploiement progressif.
- [ ] Relire les notes de version Notion à chaque mise à jour majeure de la roadmap.
- [ ] Ajouter les nouvelles fonctions avec de nouveaux identifiants et leur source.
- [ ] Mettre à jour l’état et les preuves après chaque livraison.

Mesures de poids et vérifications : [performance](PERFORMANCE.md).
