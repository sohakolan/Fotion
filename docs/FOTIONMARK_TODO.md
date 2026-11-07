# TODO — FotionMark

Référence de travail : **7 novembre 2026** · Spécification : [FotionMark v1](FOTIONMARK.md) · Interpréteur : [`engine/fotionmark/`](../engine/fotionmark/).

FotionMark est la surcouche Markdown de Fotion : **chaque fonctionnalité de Notion doit pouvoir s’écrire dans un fichier `.md` lisible, réversible et sans perte**. Cette liste suit le langage lui-même ; les comportements visibles restent dans [Fonctionnalités](NOTION_FEATURES_TODO.md) et [Interface](NOTION_UI_TODO.md). Chaque critère renvoie aux `FN-…` qu’il rend possibles.

**Légende :** identique aux autres listes — `[x]` résultat étroit vérifié par un test ; `[ ] [PARTIEL]` base présente ; `[ ]` à faire. `[DÉCISION]` = choix de format à valider par l’utilisateur avant d’écrire du code : une syntaxe publiée ne se renomme plus (voir *Versions et compatibilité* dans la spécification).

**Preuve exigée pour cocher :** aller-retour et diagnostics dans [`tests/unit/fotionmark.test.ts`](../tests/unit/fotionmark.test.ts), aller-retour éditeur dans [`tests/unit/engine.test.ts`](../tests/unit/engine.test.ts), scénario navigateur dans `tests/e2e/` quand le bloc a une interface, et mise à jour du vocabulaire dans la spécification.

## 01. Syntaxe des directives — P0

- [x] **FM-001** Conteneurs `:::nom[libellé]{attributs}` … `:::` et feuilles `::nom[libellé]{attributs}` en début de ligne.
- [x] **FM-002** Attributs nus, entre guillemets simples ou doubles, échappés par `\`, et drapeaux sans valeur ; écriture avec guillemets seulement si nécessaire.
- [x] **FM-003** Imbrication par longueur de clôture (forme remark-directive) et, à la lecture, par profondeur à longueur égale.
- [x] **FM-004** Aucun effet à l’intérieur d’un bloc de code ``` ou ~~~.
- [x] **FM-005** Libellé conservé pour tous les blocs ; refus de `]` et des sauts de ligne dans un libellé.
- [ ] **FM-006** Directives indentées dans une liste ou une citation : décider si elles sont permises, puis tester les deux réponses (lecture et conservation).
- [ ] **FM-007** Fins de ligne `\r\n`, BOM, tabulations et espaces en fin de ligne : lecture tolérante, écriture canonique sans modifier le reste du fichier.
- [ ] **FM-008** Directive non fermée en fin de fichier : conservée telle quelle, signalée par un diagnostic, jamais refermée en silence.
- [ ] **FM-009** Jeu de fichiers adverses (imbrication profonde, 10 000 attributs, lignes de 1 Mo) lu en temps linéaire ; budget mesuré dans [PERFORMANCE.md](PERFORMANCE.md).

## 02. Directives en ligne — P1

Aujourd’hui, mentions, dates et couleurs utilisent des formats hérités (section 05). Une forme en ligne commune évite d’inventer un format par fonctionnalité.

- [ ] **FM-010** [DÉCISION] Forme en ligne `:nom[libellé]{attributs}` (compatible remark-directive), avec ses règles d’échappement face au `:` ordinaire (heures, emoji `:smile:`, URL).
- [ ] **FM-011** Lecture et écriture des directives en ligne dans `syntax/`, ignorées dans le code en ligne et les blocs de code.
- [ ] **FM-012** Déclarations `form: 'inline'` dans `defineBlock`, validées par le registre comme les blocs.
- [ ] **FM-013** Mention de page `:page[Titre]{id=…}` avec lecture de l’ancien lien `"fotion:page"` (FN-079, FN-022).
- [ ] **FM-014** Mention de date `:date[7 nov. 2026]{at=2026-11-07 reminder}` avec lecture de l’ancien `<time>` (FN-079, FN-188).
- [ ] **FM-015** Couleur de texte et de fond `:color[texte]{fg=red bg=yellow}` : à arbitrer face au `<span>` actuel, lisible par Obsidian (FN-047).
- [ ] **FM-016** Mention de personne — différée avec la collaboration (FN-079, FN-192).
- [ ] **FM-017** Lien vers un bloc `[texte](./page.md#bloc-id)` s’appuyant sur l’attribut réservé `id` (FN-013).

## 03. Interpréteur, arbre et aller-retour — P0

- [x] **FM-018** `parse` / `stringify` d’une page : en-tête YAML conservé, morceaux Markdown et directives.
- [x] **FM-019** `stringify(parse(texte))` donne la forme canonique ; `parse(stringify(arbre))` redonne l’arbre.
- [x] **FM-020** Bloc inconnu, mal placé ou invalide : affiché comme bloc conservé et réécrit à l’identique (FN-088).
- [ ] **FM-021** Corpus de fixtures `tests/fixtures/fotionmark/*.md` : un fichier par bloc et par cas limite, relu à chaque test (FN-311).
- [ ] **FM-022** Test par propriété : documents générés au hasard, aller-retour identique après normalisation.
- [ ] **FM-023** Aller-retour de **page entière** via l’éditeur (Tiptap) pour chaque fixture, pas seulement bloc par bloc (FN-310).
- [ ] **FM-024** Positions source (ligne, colonne) sur chaque nœud pour localiser les diagnostics.
- [ ] **FM-025** Réécriture minimale : une page ouverte puis enregistrée sans modification garde ses octets (FN-310).

## 04. Schéma, validation et versions — P0

- [x] **FM-026** Types d’attributs `string`, `enum`, `number`, `boolean`, `percent`, `url`, `page`, `date`, `source`, avec défaut jamais écrit.
- [x] **FM-027** Registre vérifié : doublons et références à un bloc absent refusés.
- [x] **FM-028** Diagnostics `error` / `warning` sans modifier l’arbre ; attribut inconnu conservé avec avertissement.
- [ ] **FM-029** Type `color` (palette `--c-*` de Notion) et type `id` (`[a-z0-9-]`) partagés par tous les blocs.
- [ ] **FM-030** Type `list` (valeurs séparées par des virgules) pour les propriétés affichées, tris et ordres.
- [ ] **FM-031** Unicité des `id` dans une page ; diagnostic sur doublon et proposition de renommage.
- [ ] **FM-032** Dossier `migrations/` : première migration testée sur un bloc fictif, appliquée à la lecture, réécrite seulement à la prochaine modification.
- [ ] **FM-033** En-tête `fotionmark: 1` : lecture, refus explicite d’une version future inconnue (page en lecture seule, rien n’est perdu).
- [ ] **FM-034** Diagnostics visibles dans l’interface : badge sur le bloc conservé, message en français et lien vers la ligne source (FN-088).

## 05. Formats hérités — P1

Formats écrits avant FotionMark. Ils restent lus ; leur migration doit lire l’ancien format et n’écrire le nouveau qu’à la modification suivante.

- [ ] **FM-035** Listes dépliantes `<details><summary>` → décider : garder (lisible par GitHub/Obsidian) ou `:::toggle` (FN-070, FN-071).
- [ ] **FM-036** Encadrés `> [!NOTE]` + `<!-- fotion:callout -->` → garder la forme Obsidian ou `:::callout{icon color}` ; tester les deux lectures (FN-069).
- [ ] **FM-037** Couleurs `<span data-fotion-color>` → voir FM-015 (FN-047).
- [ ] **FM-038** Tableaux `data-fotion-table` → garder le tableau GFM quand c’est possible, HTML seulement pour fusions et couleurs (FN-074).
- [ ] **FM-039** Images `![](…) <!-- fotion:image … -->` : garder `![]()` pour Obsidian, documenter le commentaire de métadonnées dans la spécification (UI-172).
- [ ] **FM-040** Sommaire `<nav data-fotion-toc>` → `::toc` (FN-077).
- [ ] **FM-041** Équations `$…$` et `$$…$$` : documenter les règles d’échappement (prix en dollars) dans la spécification (FN-073).
- [ ] **FM-042** Table de correspondance des formats hérités dans la spécification, avec version d’origine et décision.

## 06. Vocabulaire v1 existant — P0/P1

Chaque bloc est déclaré, lié à l’éditeur et couvert par un aller-retour. Restent les écarts de parité indiqués.

- [x] **FM-043** `columns` / `column{width}` : 2 à 5 colonnes, largeur en pourcentage (FN-075).
- [ ] **FM-044** Colonnes : redimensionnement, ajout par dépôt latéral et suppression qui réécrivent `width` correctement (FN-076).
- [x] **FM-045** `indent` : enfants du bloc précédent (Tab de Notion) (FN-038).
- [x] **FM-046** `link-to-page{page}` (FN-078).
- [x] **FM-047** `video`, `audio`, `pdf{src}`, `file{src name size}` (FN-086, FN-087).
- [ ] **FM-048** [PARTIEL] `embed{url height}` : iframe isolée, aucune requête avant activation (FN-086).
- [ ] **FM-049** [PARTIEL] `bookmark{url title description image}` : rafraîchir l’aperçu à la demande (FN-085).
- [x] **FM-050** `breadcrumb` (FN-080).
- [ ] **FM-051** [PARTIEL] `button[libellé]` avec modèle inséré ; actions multiples en section 09 (FN-082).
- [x] **FM-052** Corriger la table du vocabulaire dans la spécification (ligne vide qui coupe le tableau avant `breadcrumb`).

## 07. Bases de données — P1

Le plus gros chantier de parité. **Aucune interface avant que FM-053 à FM-058 soient décidés et testés** (FN-180, FN-312).

### Format disque

- [x] **FM-053** [DÉCIDÉ 2026-11-07] Une base = une page `.md` dont l’en-tête porte `database:` (schéma des propriétés) ; chaque ligne = une page `.md` dont `parent` est la base et dont les valeurs sont des clés YAML de premier niveau. Le coffre étant plat, le « dossier de pages » de la spécification devient la relation `parent` (FN-166, FN-167, FN-181).
- [x] **FM-054** [DÉCIDÉ 2026-11-07] Schéma : liste ordonnée `{ id, name, type, options… }` ; l’`id` stable sert de clé YAML pour survivre aux renommages (FN-172).
- [ ] **FM-055** [PARTIEL] Lecture d’une base depuis le coffre sans cache : schéma + lignes reconstruits à chaque chargement, cache seulement en mémoire et invalidé par version de fichier (FN-181).
- [ ] **FM-056** [PARTIEL] Valeur inconnue, mal typée ou propriété supprimée : conservée dans le YAML de la ligne, signalée, jamais effacée (FN-201).
- [ ] **FM-057** [PARTIEL] Renommer une propriété ne réécrit aucune ligne ; changer son type affiche l’aperçu de conversion et garde l’ancienne valeur tant qu’elle n’est pas convertie (FN-173).
- [ ] **FM-058** [PARTIEL] Une ligne reste un fichier Markdown ordinaire lisible et éditable dans Obsidian (propriétés YAML natives d’Obsidian quand les types coïncident).

### Types de propriétés (écriture YAML)

- [ ] **FM-059** [PARTIEL] `text`, `number` (format, devise, pourcentage), `checkbox`, `url`, `email`, `phone` (FN-182, FN-183, FN-189, FN-190).
- [ ] **FM-060** [PARTIEL] `select`, `multi-select` : options ordonnées et colorées dans le schéma, valeurs par nom dans la ligne (FN-185, FN-186).
- [ ] **FM-061** [PARTIEL] `status` : groupes « À faire / En cours / Terminé » et ordre des états (FN-187).
- [ ] **FM-062** [PARTIEL] `date` : jour, heure, intervalle `start`/`end`, fuseau ; ISO 8601 uniquement (FN-188).
- [ ] **FM-063** `files` : liste de `attachments/…` ou d’URL (FN-191).
- [ ] **FM-064** `created` / `edited` : lus depuis le fichier, jamais écrits par l’utilisateur (FN-196).
- [ ] **FM-065** `unique-id` avec préfixe, compteur stocké dans le schéma (FN-198).
- [ ] **FM-066** `relation` (identifiants de pages, réciproque déclarée des deux côtés) et `rollup` (calculé, jamais écrit) (FN-193, FN-194, FN-226 à FN-230).
- [ ] **FM-067** `formula` : expression stockée dans le schéma, résultat jamais écrit ; langage en section 08 (FN-195).
- [ ] **FM-068** `place`, `person`, `button` : différés avec leurs fonctions (FN-192, FN-199, FN-200).

### Vues

- [x] **FM-069** [DÉCIDÉ 2026-11-07] Vue = feuille `::database-view{src=<base> layout=table …}` dans une page ; la page de la base contient ses propres vues. Plusieurs vues d’une même base sans dupliquer les données (FN-084, FN-168, FN-169).
- [ ] **FM-070** [PARTIEL] Attributs communs : `layout` (`table`, `board`, `list`, `gallery`, `calendar`, `timeline`, `chart`, `form`, `feed`, `map`), `title`, `properties` (liste ordonnée, visibles), `wrap`, `limit` (FN-202 à FN-205, FN-222).
- [ ] **FM-071** Filtres : syntaxe d’expression d’une ligne (`status = "En cours" and due < today`) dans un attribut `filter`, avec groupes ET/OU (FN-216, FN-217).
- [ ] **FM-072** [PARTIEL] Tris `sort="due:asc,priority:desc"` et groupes `groupBy`, `subGroupBy`, `hideEmpty` (FN-218 à FN-220).
- [ ] **FM-073** Paramètres propres à chaque disposition : `cardSize`, `cover`, `dateProperty`, `scale`, `chartType`… déclarés en `enum` (FN-206 à FN-211).
- [ ] **FM-074** Largeur des colonnes et ordre manuel des cartes : `columnWidths` et ordre stocké dans le schéma, pas dans chaque ligne (FN-203, FN-219).
- [ ] **FM-075** Calculs de pied de colonne `calc="price:sum,done:percent-checked"` (FN-224).

### Modèles

- [ ] **FM-076** Modèles = pages dont `parent` est la base et qui portent `template: true` ; exclues des vues (FN-243, FN-244).
- [ ] **FM-077** Modèle par défaut par base et par vue ; variables `@aujourd’hui`, `@moi` (FN-245, FN-248).
- [ ] **FM-078** Modèles récurrents : règle stockée dans le modèle, création idempotente (FN-247).

## 08. Formules — P2

- [ ] **FM-079** [DÉCISION] Sous-ensemble du langage Notion 2.0 visé, documenté fonction par fonction (FN-237).
- [ ] **FM-080** Analyseur et évaluateur autonomes dans `engine/fotionmark/formula/`, sans `eval` (FN-231, FN-233).
- [ ] **FM-081** Types nombre, texte, booléen, date, liste, page ; erreurs localisées (FN-232).
- [ ] **FM-082** Accès aux relations, `map`/`filter`, `let`/`lets` (FN-234, FN-235).
- [ ] **FM-083** Recalcul incrémental par dépendances, détection de cycles (FN-236).
- [ ] **FM-084** Corpus de formules avec résultats attendus relevés dans Notion (FN-237).

## 09. Blocs synchronisés, boutons et automations — P1/P2

- [ ] **FM-085** [DÉCISION] Bloc synchronisé : origine `:::synced{id=…}` dans une page, copies `::synced{src=page.md#id}` ; modifier une copie modifie l’origine (FN-081).
- [ ] **FM-086** Désynchroniser une copie : elle devient du contenu ordinaire ; supprimer l’origine laisse les copies lisibles avec un diagnostic.
- [ ] **FM-087** Bouton : actions ordonnées en liste YAML ou directives filles (`::insert`, `::add-page{to=…}`, `::edit-page`, `::open{url}`, `::confirm`) (FN-260 à FN-264).
- [ ] **FM-088** Automations de base : déclencheur, conditions et actions stockés dans le schéma de la base ; historique d’exécution dans `.history`, hors des pages (FN-266 à FN-271).
- [ ] **FM-089** Formulaire : vue `layout=form` + questions déclarées dans la vue, réponses = nouvelles lignes (FN-274 à FN-279).

## 10. Intégrations et contenu isolé — P1/P2

- [ ] **FM-090** `html` : conteneur dont le corps est rendu dans une iframe `sandbox` sans script réseau par défaut.
- [ ] **FM-091** Fournisseurs d’intégration reconnus par URL (YouTube, Vimeo, Figma, Google Maps, GitHub Gist…) avec repli `bookmark` (FN-086).
- [ ] **FM-092** Aucune requête réseau avant activation par l’utilisateur ; test qui le prouve.

## 11. Interopérabilité — P1

- [ ] **FM-093** Rendu dégradé dans Obsidian, GitHub et un lecteur CommonMark : chaque bloc reste lisible (texte, lien ou image) ; captures de référence.
- [ ] **FM-094** Compatibilité remark-directive : un corpus lu par remark-directive produit le même arbre de directives.
- [ ] **FM-095** Export « Markdown standard » : directives remplacées par leur rendu dégradé, sans perte du contenu (FN-287).
- [ ] **FM-096** Import d’un export Notion : correspondance bloc par bloc vers FotionMark, CSV de bases → pages lignes + schéma (FN-282, FN-289).
- [ ] **FM-097** Liens relatifs entre pages et assets conservés après déplacement dans le coffre (FN-292, FN-315).

## 12. Outillage et spécification — P1

- [ ] **FM-098** Commande `npm run fotionmark:check` : valide un coffre entier et liste les diagnostics par fichier.
- [ ] **FM-099** Spécification publiée par version, avec grammaire et exemples exécutés comme tests.
- [ ] **FM-100** Budget de performance : 5 000 blocs analysés et réécrits sous un seuil mesuré, suivi dans [PERFORMANCE.md](PERFORMANCE.md).

## Ordre de réalisation

1. **Décisions de format** : FM-053, FM-054 et FM-069 décidées le 7 novembre 2026 ; restent FM-010, FM-085 et FM-079 : proposées dans la spécification, validées avant tout code.
2. **Socle** : FM-021 (fixtures), FM-029/FM-030 (types `color`, `id`, `list`), FM-052.
3. **Bases v1** : format disque, propriétés FM-059 à FM-063, vue `table` puis `board`, filtres et tris simples — interface livrée avec chaque étape.
4. **Directives en ligne** et migration des mentions et dates.
5. Blocs synchronisés, modèles, puis formules et automations.

## Avancement — bases v1, vue tableau (7 novembre 2026)

FM-053, FM-054, FM-069 : une base est une page dont l’en-tête porte `database: { properties: [...] }` ; chaque ligne est une page `.md` dont `parent` est la base et dont les valeurs sont des clés YAML nommées par l’`id` de la propriété ; les vues sont des feuilles `::database-view[nom]{src=…}`. Interpréteur : [`database/properties.ts`](../engine/fotionmark/database/properties.ts) (lecture du schéma, lecture/écriture typée des cellules, identifiants, édition du schéma sans perte) et [`blocks/database.ts`](../engine/fotionmark/blocks/database.ts). Coffre : `Page.database` et `Page.values` ; seules les valeurs modifiées sont validées, pour que les clés écrites par Obsidian n’empêchent jamais une sauvegarde.

Restent pour ces cases : formats numériques (FM-059), suppression/réordonnancement des options (FM-060), groupes de statut visibles (FM-061), heures, intervalles et fuseaux (FM-062), dispositions autres que `table` (FM-070), signalement visible des problèmes de schéma (FM-056).

Preuves : `tests/unit/fotionmark.test.ts` (schéma, cellules, directive), `tests/unit/vault.test.ts` (valeurs YAML, cellule vidée, clés étrangères, schéma refusé), `tests/unit/engine.test.ts` (aller-retour éditeur), [scénario navigateur](../tests/e2e/database.spec.ts) (création par `/vue tableau`, ligne, propriété date, étiquettes, rechargement, lignes absentes de la barre latérale).

## Avancement — Kanban, menus et fiche de ligne (7 novembre 2026)

FM-070 : disposition `board` ; FM-072 : `groupBy` (Sélection ou Statut) ; les réglages sont écrits dans la directive, la valeur par défaut jamais. FM-057 : changement de type avec conversion (`convertValue`) — une valeur non convertible reste intacte ; renommer ne touche aucune ligne ; supprimer une propriété laisse ses valeurs dans les lignes. Restent l’aperçu de conversion avant validation (FM-057), `subGroupBy` et `hideEmpty` (FM-072). Preuves : `tests/unit/fotionmark.test.ts` (conversions, suppression, directive `board`), [scénarios navigateur](../tests/e2e/database.spec.ts).
