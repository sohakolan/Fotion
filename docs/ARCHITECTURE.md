# Trois couches : moteur, interface, stockage

La structure du projet sépare trois responsabilités. `npm run check:architecture`, exécuté par le build et la CI, contrôle les emplacements et le sens des imports.

```text
engine/                        # Règles et formats des documents
  index.ts                     # API publique du moteur
  models/page.ts               # Contrats de données communs
  document/
    extensions.ts              # Schéma Tiptap indépendant des vues de Fotion
    blocks.ts                  # Dépliants et titres dépliants
    callout.ts                 # Modèle et format des encadrés
    code-block.ts              # Modèle et format du code
    colors.ts                  # Marques et palette persistante
    page-mention.ts             # Références stables entre pages
    table.ts                   # Tables et sérialisation sans perte
    table-of-contents.ts        # Présence du bloc de sommaire
  fotionmark/                  # FotionMark : syntaxe, interpréteur et schéma (autonome, voir FOTIONMARK.md)
  operations/                  # Transactions et commandes : déplacement, conversion, menu /
  pages/                       # Liens, recherche, backlinks et ordre des pages
ui/                            # Interface utilisateur
  main.tsx                     # Montage de Solid
  app/                         # Composition, session, styles et navigation
  kit/                         # UI-Kit : thème et composants partagés, alignés sur Notion
    index.ts                   # API publique du kit
    tokens.css                 # Jetons : couleurs clair/sombre, palette, typographie, rayons, ombres
    components.css             # Styles des composants du kit et de la galerie
    components/                # Menu, MenuItem, Switch, Button, IconButton, Kbd, Tooltip, EmojiPicker, galerie
  features/
    editor/
      index.ts                 # API publique de l'éditeur visuel
      components/              # Éditeur et poignées de blocs
      extensions/              # Vues interactives adaptées aux schémas du moteur
      lib/                     # Coloration différée et décorations visuelles
    pages/
      index.ts
      components/              # Titre adaptatif, historique et aperçu
    sidebar/
      index.ts
      components/              # Sections repliables, tri, nombre affiché, panneau « Plus »
server/                        # Accès aux fichiers et frontière HTTP
  http/vault-middleware.ts      # Routes, contrôle d'origine et erreurs HTTP
  storage/vault.ts             # Coffre, écritures atomiques, conflits, historique
  storage/seed.ts              # Documents de démonstration
```

Les configurations restent à la racine. `public/` contient les ressources statiques, `docs/` la documentation, `tests/` les preuves et `scripts/` l'environnement de vérification. `vault/` contient les documents personnels et reste ignoré par Git.

## Responsabilités et dépendances

- **FotionMark** (`engine/fotionmark/`) : la surcouche Markdown et son interpréteur. Il n'importe que lui-même, aucun paquet externe ; le reste du moteur l'utilise (les blocs de `document/` lui demandent si une directive est valide). Spécification : [FOTIONMARK.md](FOTIONMARK.md).
- **Moteur** : structures de documents, conversions, transactions, formats Markdown/HTML et index des pages. Il n'importe ni `ui/`, ni `server/`, ni Solid, ni Lucide. Les modèles ne dépendent pas des extensions d'éditeur. Le moteur ne connaît pas les menus, les modales, le stockage du navigateur ou les requêtes HTTP.
- **Interface** : compose les fonctionnalités avec Solid, gère les interactions, applique les vues Tiptap et appelle les opérations du moteur. Elle importe le moteur uniquement par `engine/index.ts`. Elle n'importe jamais les fichiers du serveur.
- **Serveur** : accède au disque et expose l'API locale. Il utilise les contrats publics du moteur, sans importer l'interface. La validation des entrées, les protections des chemins et la concurrence des écritures restent à la frontière du stockage.

Le sens autorisé est `ui → engine` et `server → engine`. L'interface communique avec le serveur par HTTP. Aucune dépendance inverse n'est autorisée.

Le **UI-Kit** (`ui/kit/`) est la couche de design commune : il n'importe rien d'autre que lui-même, et toute l'interface l'utilise par `ui/kit/index.ts` (seul `ui/main.tsx` charge ses feuilles de style). Les couleurs, tailles, rayons et ombres se lisent dans les variables de `tokens.css` ; ne pas coder une couleur de thème en dur ailleurs. La galerie de référence s'ouvre à l'adresse `#ui-kit`. Le menu de bloc, le menu de page et les info-bulles des poignées utilisent déjà le kit ; les autres écrans de `ui/app/styles/` y migrent progressivement.

Dans l'interface, `app` compose les fonctionnalités par leurs `index.ts`. `pages` peut utiliser l'API publique de `editor` pour un aperçu de version ; `editor` ne dépend pas de `pages`. Les imports privés entre fonctionnalités sont refusés.

## Schémas et vues Tiptap

`documentExtensions()` fournit le schéma et les parseurs/sérialiseurs du moteur, utilisables sans les vues de Fotion. `ui/features/editor/extensions/editor-extensions.ts` reprend cette liste et adapte seulement les extensions nécessitant une vue interactive : boutons d'un encadré, panneau de langage, sommaire cliquable, navigation des mentions ou redimensionnement des tableaux.

Les méthodes `addNodeView` sont interdites dans `engine/` par le contrôle automatique. Les règles de sérialisation restent dans le moteur ; les vues n'en maintiennent pas une seconde version. Les classes et attributs du HTML sérialisé font partie du format d'échange, sans import de feuilles de style.

Le moteur repose encore sur Tiptap/ProseMirror. **Indépendant de l'interface ne signifie pas indépendant du DOM** : l'import/export HTML riche et l'index des tableaux HTML utilisent des API DOM. Les tests sans application fournissent JSDOM. Les contrats de pages et les transactions pures peuvent être utilisés sans monter Solid. Une distribution npm autonome ou un moteur sans DOM n'est pas encore fournie.

## Conventions et changements

Composants en `PascalCase.tsx`, modules du moteur et fonctions en `kebab-case.ts`. Imports locaux relatifs. Les points d'entrée exposent les symboles nécessaires aux consommateurs ; les tests peuvent importer un module interne pour le vérifier directement.

Un nouveau bloc ajoute son modèle et son format dans `engine/document/`, puis sa vue dans `ui/features/editor/extensions/` si nécessaire. Une nouvelle action sur le document va dans `engine/operations/` ; un menu qui la déclenche reste dans `ui/`. Une nouvelle opération disque reste dans `server/storage/`.

Ne pas créer de dossiers génériques `utils`, `helpers` ou `common`. Réviser ensemble la documentation et le contrôle si une nouvelle couche ou dépendance devient nécessaire. `App.tsx` porte encore plusieurs panneaux et états de session ; les extraire progressivement dans leurs fonctionnalités. Les styles de l'application sont découpés par zone dans `ui/app/styles/` (chargés dans l'ordre de `index.css`) ; jetons et composants partagés dans `ui/kit/`.

## Vérifications

```sh
npm run check:architecture
npm test
npm run test:ui
npx playwright install chromium
npm run test:browser
```

`tests/unit/engine.test.ts` exerce le moteur sans les vues de l'application. Les autres tests unitaires couvrent stockage, conversions et formats. `test:ui` vérifie les modules de production recomposés en IIFE dans JSDOM. `test:browser` compile et utilise Chrome/Chromium sur `dist/`, avec un coffre temporaire isolé. Pour Chrome installé : `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`.

Le contrôle inspecte les imports/exports statiques et les imports dynamiques à chaîne littérale. Il ne prouve pas l'absence de cycles internes ni les dépendances transitives des paquets externes. Les modules chargés à la demande, leurs mesures et limites sont documentés dans [PERFORMANCE.md](PERFORMANCE.md).
