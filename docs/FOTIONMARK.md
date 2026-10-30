# FotionMark v1

FotionMark est la surcouche Markdown de Fotion. Un fichier FotionMark reste un fichier Markdown GFM valide : ce que Markdown sait exprimer s’écrit en Markdown ; le reste (colonnes, bases de données, intégrations…) s’écrit avec des **directives**, lisibles à la main et ignorées sans perte par les autres éditeurs.

L’interpréteur vit dans [`engine/fotionmark/`](../engine/fotionmark/). Il est autonome : ni éditeur, ni DOM, ni dépendance. Le contrôle d’architecture refuse tout import externe dans ce dossier.

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

Le schéma ([`schema.ts`](../engine/fotionmark/schema.ts)) déclare chaque bloc : forme, enfants autorisés, parent requis, attributs valides.

| Bloc | Forme | Contenu | Attributs |
| --- | --- | --- | --- |
| `columns` | conteneur | au moins 2 `column` | — |
| `column` | conteneur, dans `columns` | FotionMark | `width` : pourcentage entre 0 et 100 exclus |

## Garanties

- **Aucune perte** : une directive inconnue, mal placée ou invalide est affichée comme bloc conservé et réécrite à l’identique. `validate()` décrit le problème sans modifier l’arbre.
- **Aller-retour** : `stringify(parse(texte))` redonne la forme canonique, et `parse(stringify(arbre))` redonne le même arbre. Chaque bloc a un test d’aller-retour dans [`tests/unit/fotionmark.test.ts`](../tests/unit/fotionmark.test.ts) et dans l’éditeur ([`tests/unit/engine.test.ts`](../tests/unit/engine.test.ts)).

## API

```ts
import { parse, stringify, validate, schema } from './engine/fotionmark';

const document = parse(source);        // { frontmatter?, children: FotionNode[] }
const problems = validate(document.children);
const text = stringify(document);
```

Nœuds : `markdown` (texte Markdown brut), `block` (conteneur et ses enfants), `leaf` (directive d’une ligne).

## Feuille de route

Prochains blocs, dans l’ordre : base de données (dossier de pages + vues : tableau, kanban, galerie, liste, calendrier, chronologie), intégrations (`::embed`, iframe isolée sans requête avant activation), HTML isolé, blocs synchronisés, boutons, dates et mentions en ligne. Les formats déjà présents avant FotionMark — listes dépliantes `<details>`, encadrés `> [!NOTE]`, couleurs `<span data-fotion-color>`, tableaux `data-fotion-table` — restent lus ; leur migration vers des directives sera proposée avec une lecture de l’ancien format.
