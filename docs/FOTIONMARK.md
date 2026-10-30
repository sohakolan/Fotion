# FotionMark v1

FotionMark est la surcouche Markdown de Fotion. Un fichier FotionMark reste un fichier Markdown GFM valide : ce que Markdown sait exprimer s’écrit en Markdown ; le reste (colonnes, bases de données, intégrations…) s’écrit avec des **directives**, lisibles à la main et ignorées sans perte par les autres éditeurs.

L’objectif : **toute fonctionnalité de Notion s’exprime en FotionMark**. Les fichiers restent du Markdown ; l’interpréteur et le moteur reconstruisent les vrais composants — tableau de tâches, kanban, galerie, modèles… — avec le comportement de Notion.

L’interpréteur vit dans [`engine/fotionmark/`](../engine/fotionmark/). Il est autonome : ni éditeur, ni DOM, ni dépendance. Le contrôle d’architecture refuse tout import externe dans ce dossier.

## Architecture du moteur

```text
engine/fotionmark/            Langage, autonome
  syntax/directives.ts        Lecture/écriture de :::conteneur, ::feuille et {attributs}
  tree/document.ts            parse / stringify d’une page entière → arbre FotionMark
  schema/attributes.ts        Types d’attributs (lecture typée, écriture canonique)
  schema/define-block.ts      defineBlock : déclaration d’un bloc
  schema/registry.ts          createRegistry : registre vérifié (doublons, références)
  schema/validate.ts          validate / validateNode : diagnostics erreur ou avertissement
  blocks/<famille>.ts         Déclarations pures des blocs d’une famille
  blocks/index.ts             Registre : la seule liste des blocs connus
engine/document/
  fotionmark-node.ts          fotionmarkNode(déclaration) : nœud d’éditeur généré
  <famille>.ts                Nœuds d’une famille + présentation (html)
  directive-block.ts          Bloc conservé tel quel quand FotionMark signale une erreur
ui/features/<famille>/        Vue interactive si le bloc en a besoin (base, kanban…)
```

Sens des dépendances : `ui → engine/document → engine/fotionmark`. FotionMark ne connaît ni l’éditeur ni l’interface ; l’éditeur ne réécrit jamais une règle de syntaxe ; l’interface ne lit jamais le texte brut d’un fichier.

## Structure d’un fichier

```markdown
---
title: Projets
icon: 📁
---

Texte Markdown ordinaire.

::::columns
:::column{width=60%}
## Gauche
:::
:::column
Droite
:::
::::
```

- **En-tête** : YAML entre `---`, conservé tel quel par l’interpréteur (les propriétés de page sont lues par le coffre).
- **Corps** : une suite de morceaux Markdown et de directives.

## Directives

| Forme | Syntaxe | Usage |
| --- | --- | --- |
| Conteneur | `:::nom[libellé]{attributs}` … `:::` | Bloc contenant du FotionMark (colonnes, onglets…) |
| Feuille | `::nom[libellé]{attributs}` | Bloc d’une ligne (base de données insérée, intégration…) |

- Le nom commence par une lettre : `[A-Za-z][\w-]*`. Le libellé entre crochets est facultatif.
- Les attributs s’écrivent `{clé=valeur clé="avec espaces" drapeau}`. Les guillemets (simples ou doubles, avec `\` pour échapper) ne sont écrits que si la valeur l’exige.
- Une directive commence en début de ligne. À l’intérieur d’un bloc de code (``` ou ~~~), rien n’est interprété.
- **Imbrication** : une clôture ne ferme que l’ouverture de même longueur. À l’écriture, chaque conteneur reçoit une clôture plus longue que celles qu’il contient (forme compatible avec remark-directive). À la lecture, des conteneurs imbriqués de même longueur sont aussi acceptés.
- **Forme canonique** : deux directives voisines sont sur des lignes consécutives ; une ligne vide sépare une directive d’un texte Markdown.

## Vocabulaire v1

Les déclarations ([`blocks/`](../engine/fotionmark/blocks/)) fixent pour chaque bloc : forme, contenu autorisé, parent requis, attributs typés et version.

| Bloc | Forme | Contenu | Attributs |
| --- | --- | --- | --- |
| `columns` | conteneur | 2 à 5 `column` | — |
| `column` | conteneur, dans `columns` | FotionMark | `width` : `percent` (entre 0 et 100 exclus) |
| `indent` | conteneur | FotionMark | — · enfants du bloc précédent (Tab dans Notion) |
| `link-to-page` | ligne | — | `page` : `page` (identifiant de la page liée) |

## Garanties

- **Aucune perte** : une directive inconnue, mal placée ou invalide est affichée comme bloc conservé et réécrite à l’identique. `validate()` décrit le problème sans modifier l’arbre.
- **Aller-retour** : `stringify(parse(texte))` redonne la forme canonique, et `parse(stringify(arbre))` redonne le même arbre. Chaque bloc a un test d’aller-retour dans [`tests/unit/fotionmark.test.ts`](../tests/unit/fotionmark.test.ts) et dans l’éditeur ([`tests/unit/engine.test.ts`](../tests/unit/engine.test.ts)).

## API

```ts
import { parse, stringify, validate, blocks, defineBlock, readAttributes } from './engine/fotionmark';

const document = parse(source);        // { frontmatter?, children: FotionNode[] }
const problems = validate(document.children); // { severity: 'error' | 'warning', path, message }[]
const text = stringify(document);
```

Nœuds : `markdown` (texte Markdown brut), `block` (conteneur et ses enfants), `leaf` (directive d’une ligne).

## Feuille de route

Prochains blocs, dans l’ordre : base de données (dossier de pages + vues : tableau, kanban, galerie, liste, calendrier, chronologie), intégrations (`::embed`, iframe isolée sans requête avant activation), HTML isolé, blocs synchronisés, boutons, dates et mentions en ligne. Les formats déjà présents avant FotionMark — listes dépliantes `<details>`, encadrés `> [!NOTE]`, couleurs `<span data-fotion-color>`, tableaux `data-fotion-table` — restent lus ; leur migration vers des directives sera proposée avec une lecture de l’ancien format.

## Conventions

Ces règles s’appliquent à chaque nouvelle fonctionnalité Notion portée en FotionMark.

### Ajouter un bloc

1. **Déclarer** le bloc dans `engine/fotionmark/blocks/<famille>.ts` avec `defineBlock` : nom, forme, version, description, attributs typés, contenu, parent.
2. **Enregistrer** la déclaration dans `blocks/index.ts`. Le registre refuse un doublon ou une référence à un bloc absent.
3. **Lier l’éditeur** dans `engine/document/<famille>.ts` avec `fotionmarkNode(déclaration, { content, html })`, puis l’ajouter à `documentExtensions()`. Aucune analyse ni écriture de texte n’est réécrite à la main.
4. **Vue** : si le bloc est interactif (base, kanban, intégration), créer la vue dans `ui/features/<famille>/` et la brancher sur le nom du bloc ; sinon le HTML de l’éditeur suffit.
5. **Commande** : ajouter l’entrée du menu / dans `engine/operations/slash-commands.ts` (catalogue) et son action dans l’éditeur.
6. **Prouver** : aller-retour et validation dans `tests/unit/fotionmark.test.ts`, aller-retour dans l’éditeur dans `tests/unit/engine.test.ts`, scénario navigateur dans `tests/e2e/`, et mise à jour du vocabulaire ci-dessus.

### Nommage

- Blocs : `kebab-case`, en anglais, uniques, **jamais renommés** une fois publiés (`columns`, `database-view`).
- Attributs : `camelCase` en anglais (`groupBy`, `showTitle`). Les libellés visibles restent dans l’interface, en français.
- `id` est réservé à tous les blocs : identifiant stable `[a-z0-9-]` pour les liens vers un bloc et les blocs synchronisés.
- Fichiers : un fichier par famille de blocs, en `kebab-case`. Pas de dossier `utils` ou `helpers`.

### Attributs

- Toujours typés : `string`, `enum`, `number`, `boolean`, `percent`, `url`, `page`, `date`. Un nouveau type s’ajoute dans `schema/attributes.ts` avec ses tests.
- Une valeur égale au défaut n’est jamais écrite ; les guillemets ne sont écrits que si nécessaire. Une même donnée a donc une seule écriture.
- Un attribut inconnu est **conservé** et signalé par un avertissement : un fichier écrit par une version plus récente ne perd rien.
- Une valeur invalide est une **erreur** : le bloc n’est pas interprété, il est affiché comme bloc conservé et réécrit à l’identique. Un enfant en erreur est conservé seul, sans invalider son parent.

### Données et présentation

- Un bloc décrit une **configuration** (quelle vue, quel tri, quelle largeur), pas des données volumineuses.
- Les données qui grandissent vivent dans des pages : une base de données est un dossier de pages `.md`, une ligne est une page et ses propriétés sont son en-tête YAML. Les modèles sont des pages d’un sous-dossier de la base. Les blocs y font référence (`src`), ils ne les recopient pas.
- Le moteur produit un HTML sémantique (`data-fotionmark`, `data-attributes`, classe `fm-<bloc>`) sans style ; les styles et interactions sont dans `ui/`.

### Versions et compatibilité

- FotionMark v1 n’accepte que des évolutions **additives** : nouveaux blocs, nouveaux attributs optionnels, nouvelles valeurs d’énumération.
- Changer le sens d’une syntaxe, renommer un bloc ou un attribut exige d’incrémenter `version` dans la déclaration et d’ajouter une migration `engine/fotionmark/migrations/<bloc>-<de>-<vers>.ts`, testée, appliquée à la lecture. Le fichier n’est réécrit qu’à la prochaine modification de la page.
- Une page peut déclarer `fotionmark: 1` dans son en-tête ; sans déclaration, la version 1 s’applique.

### Performance et sécurité

- L’interpréteur lit chaque ligne une fois ; les expressions régulières sont ancrées et sans retour arrière coûteux. Un document de plusieurs milliers de blocs doit rester interactif.
- Les vues lourdes (bases, graphiques) se chargent à la demande (`import()` dynamique) et lisent les données par l’API locale, page par page, jamais en lisant tout le coffre de façon synchrone.
- `url` n’accepte que `http(s)` et `mailto`. Les intégrations et le HTML s’affichent dans une iframe isolée (`sandbox`), sans aucune requête réseau avant que l’utilisateur l’active.

