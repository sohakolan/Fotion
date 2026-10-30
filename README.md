# Fotion

Architecture obligatoire : [organisation des fichiers et règles d’import](docs/ARCHITECTURE.md).


Un espace de notes local, en TypeScript, avec une interface inspirée de Notion et des documents Markdown comme dans Obsidian. SolidJS, Tiptap et Vite. Sans compte, collaboration, IA ni service cloud.

## Démarrer

Node.js 22.12+ (ou une version LTS plus récente).

```sh
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:5173. Le premier lancement crée quelques pages d’exemple dans `vault/`. Ce dossier est ignoré par Git : les documents personnels ne sont pas publiés avec le code.

```sh
npm run build
npm run preview
```

L’aperçu du build est disponible sur http://127.0.0.1:4173. Le petit serveur local reste nécessaire pour accéder aux fichiers ; `dist/` seul ne remplace pas l’application.

## Les fichiers

Chaque page est un vrai `.md`, avec des propriétés YAML (`title`, `icon`, `parent`, `favorite`, `cover`, `trashed`, `order`, `fullWidth`, `smallText`, `font`). Les identifiants de fichiers restent stables lors d’un changement de titre. Les sous-pages sont reliées par `parent` ; ce premier jet n’organise pas les fichiers en sous-dossiers.

- Sauvegarde automatique après 550 ms d’inactivité et avant de changer de page.
- Écriture par remplacement atomique, copies des versions précédentes dans `vault/.history/` et détection des modifications externes. Les fichiers d’historique sont nommés par empreinte du nom et du contenu d’origine.
- Une copie des modifications en attente est gardée dans le navigateur pour récupération après interruption.
- Si un fichier a changé dans Obsidian, Fotion refuse de l’écraser : exporter le brouillon, puis ouvrir les deux versions pour les réconcilier. Pour abandonner un brouillon récupéré, exporter d’abord puis supprimer la clé `fotion-recovery-v1` du stockage local du navigateur et recharger.
- La corbeille est réversible : aucune suppression physique du fichier.
- Import `.md` et export depuis le menu de page. Ajouter un fichier directement à `vault/`, puis utiliser « Actualiser depuis le disque » pour le voir.
- Les propriétés YAML supplémentaires sont conservées lors de la sauvegarde. La mise en forme des propriétés YAML peut être normalisée.

Pour utiliser un autre dossier, avec les mêmes fichiers à sa racine :

```sh
FOTION_VAULT=/chemin/vers/mes-notes npm run dev
```

Le serveur écoute uniquement sur la boucle locale. Ne pas exposer ce serveur de développement sur Internet.

## Deuxième jet — 0.2

- Barre latérale redimensionnable, arborescence réordonnable par glisser-déposer : au-dessus, en dessous ou dans une page. Le menu « Déplacer vers » permet aussi cette action au clavier. Les cycles sont refusés.
- Menus contextuels des pages, renommage, duplication, favoris, corbeille et sous-pages ; recherche avec navigation ↑/↓ et Entrée.
- Poignées `+` et `⋮⋮` au survol, glisser-déposer avec seuil de déclenchement, aperçu compact, ligne d’insertion, défilement automatique et annulation par Échap. Les éléments de liste se déplacent individuellement. Un mouvement est une seule étape d’annulation.
- Menu « Transformer en », insertion sous un bloc, duplication et suppression ; déplacement clavier avec `Alt + Maj + ↑/↓`.
- Tiptap : titres, listes, tâches, citations, encadrés, listes dépliantes imbriquées, code, liens, images par URL, tableaux et commandes d’ajout/suppression de lignes et colonnes. `/page` crée une sous-page, `/image` ouvre l’intégration d’image.
- Mise en forme flottante, souligné et formulaire de lien ; couverture, icône facultative, mode sombre. Police, petite taille et pleine largeur sont propres à chaque page et enregistrées dans son `.md`.
- Les encadrés utilisent la syntaxe Obsidian `> [!NOTE]`. Les listes dépliantes utilisent des blocs HTML `<details>/<summary>` dans le Markdown. Le souligné utilise `<u>`. Leur aller-retour est testé, mais le rendu dépend de l’éditeur Markdown externe.

La disposition est rapprochée des références publiques de Notion. Une correspondance pixel à pixel avec chaque version de Notion n’est pas certifiée. Les tests DOM simulent les interactions ; ils ne remplacent pas une validation visuelle et tactile sur navigateur réel.

Ce n’est pas encore la parité fonctionnelle complète de Notion : pas de bases de données relationnelles, vues de base de données, colonnes, pièces jointes locales ou plugins Obsidian. Pas de surveillance automatique du disque ni de fusion des conflits. La hiérarchie est gérée par des propriétés, pas par les wikiliens Obsidian.

Le Markdown Tiptap est encore annoncé en bêta. Les constructions non prises en charge (HTML complexe, extensions Obsidian, blocs personnalisés) peuvent être normalisées ou perdues dans la version éditée ; le fichier précédent reste dans `.history/`. L’historique n’est pas purgé automatiquement. L’accès à un dossier personnalisé nécessite de relancer le serveur avec `FOTION_VAULT`.

## Palette de texte et de fond

Sélectionner du texte puis ouvrir le bouton **A** de la barre de formatage pour choisir sa couleur ou son fond. Les flèches, Début/Fin, Entrée et Échap permettent d’utiliser la palette au clavier. `Ctrl/Cmd + Maj + H` réapplique le dernier choix ; `Tₓ` retire les marques de la sélection.

Les couleurs sont enregistrées dans des balises HTML `span` portant `data-fotion-color`, `data-fotion-background` et un style de repli. Fotion adapte leur rendu au thème sombre. Les lecteurs Markdown externes doivent accepter le HTML intégré pour afficher les couleurs ; leur rendu peut différer. Modifier les attributs ou supprimer ces balises dans un autre éditeur peut supprimer la couleur.

## Blocs de code

Chaque bloc propose un langage recherchable, la copie avec retour d’état, le retour à la ligne et une légende. La coloration couvre les 37 entrées du catalogue commun Lowlight, dont le texte brut. Un langage inconnu importé est conservé, sans détection automatique coûteuse pendant la saisie. Les boutons apparaissent au survol, au focus clavier et sur les écrans tactiles.

Le code reste dans des clôtures Markdown standard, allongées si l’extrait contient lui-même des clôtures. Quand une légende ou le retour à la ligne est défini, la ligne d’ouverture reçoit `fotion=` suivi d’un objet JSON encodé comme composant d’URL (`wrap`, `caption`). Les lecteurs externes peuvent ignorer ces propriétés de présentation ; supprimer ce suffixe les retire de Fotion sans supprimer le code.

Les grammaires sont actuellement chargées avec l’éditeur : le build de cette étape représente environ 251 Ko gzip de JavaScript. Le chargement à la demande et les mesures en navigateur réel restent nécessaires pour l’objectif de légèreté.

## Recherche et liens entre pages

`Ctrl/Cmd + P` ouvre la recherche globale ; `Ctrl/Cmd + K` ouvre le formulaire de lien quand l’éditeur a le focus, et la recherche ailleurs. La recherche ignore les différences d’accents et de casse, accepte plusieurs termes et classe les titres avant le contenu, puis les modifications récentes. L’extrait se place autour d’un terme trouvé. L’index en mémoire réanalyse uniquement les pages dont le contenu a changé ; il n’est pas encore un index inversé sur disque.

Dans le formulaire de lien, saisir un titre puis choisir une page. Le lien est enregistré en Markdown sous la forme `[libellé](./identifiant.md)` et reste valide après un changement de titre. Son libellé reste du texte éditable et ne suit pas les renommages. Utiliser une mention pour afficher un titre dynamique. Cliquer sur le lien ouvre la destination après sauvegarde du brouillon ; une destination manquante ou à la corbeille laisse le document courant ouvert avec un message.

Les liens entrants apparaissent au-dessus du titre et permettent de revenir aux pages sources. Ils sont calculés à partir des liens Markdown, y compris les liens par référence et dans les dépliants ; les exemples dans les blocs de code, les images, la page elle-même et les pages à la corbeille sont exclus. Les wikiliens Obsidian, les liens HTML arbitraires et les ancres de blocs ne sont pas encore couverts. Exporter une seule page ne copie pas ses destinations.

## Mentions de pages

Taper `@` ou `[[` au début d’un mot ouvre le sélecteur de pages. Filtrer par titre, choisir avec les flèches et Entrée, ou annuler avec Échap. Les adresses e-mail et les blocs de code ne déclenchent pas ce menu. Une mention affiche l’icône et le titre actuel de sa destination ; les liens Markdown ordinaires gardent leur libellé éditable.

Une mention est sauvegardée comme `[titre](./identifiant.md "fotion:page")`. Le titre sert de repli dans les lecteurs externes ou quand la cible manque ; Fotion affiche le titre actuel du fichier cible et actualise le libellé exporté à la prochaine sauvegarde du document source. Une mention reste un backlink. Les modifications de titre ne réécrivent pas immédiatement tous les fichiers du coffre.

La création d’une page depuis ce sélecteur, les aperçus au survol et les mentions de dates restent à réaliser. Le menu propose jusqu’à 20 correspondances ; préciser le titre pour réduire la liste.

## Historique des pages

Ouvrir **Options de la page → Historique de la page** pour parcourir les sauvegardes locales, consulter leur rendu en lecture seule ou leur Markdown, puis restaurer celle choisie. Le brouillon courant est enregistré avant l’ouverture et avant la restauration. La date affichée est la date d’archivage de la copie, pas un journal de chaque frappe.

La restauration reprend le titre, le contenu, l’icône, la couverture, la police, la taille de texte et la largeur. Elle conserve l’emplacement, l’ordre, les favoris, l’état de corbeille et les propriétés YAML supplémentaires actuelles. Le fichier remplacé reste dans `.history/` et peut être restauré à son tour. L’historique clavier de l’éditeur est réinitialisé après une restauration pour ne pas réappliquer des opérations de l’ancienne version.

Une modification externe concurrente, une empreinte de sauvegarde invalide ou un lien symbolique bloque l’opération. L’aperçu et la liste sont disponibles sans modifier le document. Les copies de contenu identique sont dédupliquées ; il n’y a pas encore de comparaison des différences, de regroupement des versions, de pagination ni de purge automatique.

## Vérifications

```sh
npm test
npm run build
npm run test:ui
```

Tests de persistance et réouverture, conservation du Markdown et des métadonnées, sauvegardes, conflits externes, import, corbeille, validation des chemins et relations, contrôle d’origine de l’API, et aller-retour Tiptap → Markdown → Tiptap. Les tests de déplacement vérifient la conservation des marques, des tâches cochées et de l’historique. `test:ui` compile puis vérifie dans JSDOM le survol, les événements de pointeur, les repères de dépôt, l’annulation, les menus, la transformation et la sauvegarde automatique.

## Roadmap de parité Notion

Voir [la documentation de suivi](docs/README.md), les [408 critères fonctionnels](docs/NOTION_FEATURES_TODO.md) et les [328 critères UI](docs/NOTION_UI_TODO.md). Les fonctions différées, les références publiques et les règles de validation y sont explicitées.

## Licence

MIT. Implémentation indépendante ; non affiliée à Notion ou Obsidian. Les dépendances conservent leurs licences respectives.

## Table des matières

Insérer `/sommaire` ou `/table des matières` pour créer une navigation vers les titres H1, H2 et H3 de la page. Les intitulés et leur ordre se mettent à jour à chaque modification ; les titres identiques restent des destinations distinctes. Les boutons sont accessibles au clavier. Un clic ouvre les éventuels dépliants parents et place le curseur au début du titre dans une page éditable.

Le fichier conserve `<nav data-fotion-toc></nav>`. Fotion reconstruit la liste à partir des titres, sans sauvegarder de copie périmée de leurs textes. Ce marqueur est une extension Fotion : les lecteurs Markdown externes, dont Obsidian sans extension adaptée, ne génèrent pas ce sommaire. Les titres restent du Markdown standard. Le suivi de la section active pendant le défilement et le sommaire latéral automatique restent à réaliser.

## Titres dépliants

Les commandes `/titre dépliant 1`, `/titre dépliant 2` et `/titre dépliant 3` insèrent un titre avec son contenu repliable. Cliquer sur la flèche replie le contenu ; cliquer sur le titre permet de l'éditer. Entrée depuis le titre ouvre le dépliant et place le curseur dans son contenu. Les titres dépliants apparaissent dans le sommaire, dont les liens rouvrent les sections masquées.

Le Markdown utilise `<details>` avec `<summary><h1>…</h1></summary>` (ou `h2`/`h3`). Fotion conserve les marques du titre et les blocs imbriqués. Le rendu de Markdown à l'intérieur de HTML dépend du lecteur externe. L'état ouvert/fermé est local à l'affichage et n'est pas enregistré. Le menu du bloc « Transformer en » convertit un paragraphe ou un titre en liste/titre dépliant, change son niveau et le reconvertit en texte ou titre. Le corps d'un dépliant reconverti devient des blocs suivants, sans perte de contenu ; une seule annulation rétablit sa structure. Les conversions incompatibles sont désactivées.

## Encadrés personnalisables

Cliquer sur l'icône d'un encadré pour choisir un emoji, coller une icône textuelle courte ou supprimer l'icône. Le bouton reste accessible au clavier et réapparaît au survol lorsqu'il n'y a plus d'icône. Le menu de bloc **Couleur** applique la palette au texte ou au fond de tout l'encadré ; les marques de couleur explicites dans son contenu gardent leur priorité. Les couleurs s'adaptent au thème sombre.

Un encadré standard conserve `> [!NOTE]`. Les réglages personnalisés sont enregistrés dans un commentaire `<!-- fotion:callout … -->` sur cette première ligne, avec un objet JSON encodé en URI. Les autres lecteurs peuvent conserver le contenu sans reproduire ces réglages visuels. Les images comme icônes et le catalogue complet d'icônes Notion restent à réaliser.

## Poids du chargement

La coloration syntaxique est chargée au premier bloc de code avec une langue explicite. Une page sans code ne télécharge pas ses grammaires. Le build mesuré passe de 815,54 à 632,51 ko de JavaScript initial minifié ; voir [mesures, tests et limites](docs/PERFORMANCE.md). Le mode texte et la sauvegarde restent disponibles si le téléchargement de la coloration échoue.

## Tableaux simples

Faire glisser une bordure de colonne pour changer sa largeur. La barre du tableau permet de modifier les en-têtes de ligne et de colonne. Les réglages survivent à la réouverture. Les tableaux simples restent en Markdown GFM ; ceux dont les propriétés ou le contenu ne sont pas représentables sans perte sont enregistrés en HTML dans le `.md`, notamment pour conserver les largeurs, plusieurs paragraphes et les espaces des cellules. Les déplacements de lignes et colonnes et leurs menus dédiés restent à réaliser.
