# Architecture des fichiers

Cette structure est obligatoire pour les prochains développements. `npm run check:architecture` contrôle les emplacements, noms et imports locaux ; `npm run build` l'exécute avant TypeScript. La CI lance aussi les tests unitaires, DOM et navigateur.

```text
src/
  main.tsx                     # Montage de Solid
  app/
    App.tsx                    # Composition, navigation et état de la session
    styles.css                 # Styles de l'application
  features/
    editor/
      index.ts                 # API publique de l'éditeur
      components/              # DocumentEditor, BlockControls
      extensions/              # Extensions Tiptap et leur assemblage
      lib/                     # Transactions de déplacement
    pages/
      index.ts                 # API publique des pages
      components/              # Historique des versions
      lib/                     # Recherche, backlinks, déplacements des pages
shared/
  page.ts                      # Contrats de données navigateur / serveur
  page-links.ts                # Liens locaux et normalisation de recherche
server/
  http/vault-middleware.ts     # Routes, origine, taille des requêtes, erreurs HTTP
  storage/vault.ts             # Markdown, YAML, fichiers atomiques et historique
  storage/seed.ts              # Pages de démonstration
scripts/                       # Vérifications et environnement de test
tests/                        # Voir répartition ci-dessous
```

`tests/unit/` couvre les fonctions, extensions et opérations sur les fichiers. `tests/e2e/` couvre les interactions dans un navigateur réel. `scripts/check-ui.mjs` conserve le scénario d'intégration JSDOM sur le bundle compilé. Les fichiers de configuration des outils restent à la racine ; les documents et captures de référence vont dans `docs/`, les ressources statiques dans `public/`.

## Sens des dépendances

- `src/main.tsx` monte `app`. `app` compose les fonctionnalités par leurs `index.ts` publics.
- Une fonctionnalité importe librement ses propres fichiers et les contrats de `shared`.
- `pages` peut consommer l'API publique de `editor` pour afficher une version en lecture seule. `editor` ne dépend pas de `pages`.
- Les imports entre fonctionnalités passent exclusivement par leur `index.ts`. Les autres dépendances entre fonctionnalités sont refusées tant que cette règle n'a pas été explicitement révisée.
- `shared` ne dépend que de `shared` pour les modules locaux. Aucun composant, stockage ou API Node n'y entre.
- `server/http` utilise `server/storage` et `shared`. `server/storage` ne dépend jamais de HTTP ou de `src`.
- Aucun fichier de production n'importe un test, un script ou un fichier de configuration.

Les tests peuvent importer les fonctions internes qu'ils vérifient. Les scripts et configurations assemblent les couches nécessaires à l'exécution, sans être importés par le produit.

## Conventions

Composants en `PascalCase.tsx`, fonctions et extensions en `kebab-case.ts`, dossiers de fonctionnalités en `kebab-case`. Les fichiers `index.ts` exposent uniquement les symboles utilisés par les autres couches. Imports locaux relatifs : pas d'alias masquant une dépendance.

Ajouter une fonctionnalité dans `src/features/<nom>/`, avec les seuls sous-dossiers nécessaires parmi `components`, `lib`, `extensions`. Un besoin nouveau de couche ou de dépendance doit modifier ensemble cette documentation et le contrôle. Ne pas créer de dossiers génériques `utils`, `helpers` ou `common` ; placer la logique près de son propriétaire. `shared` contient uniquement les contrats réellement communs.

`App.tsx` reste le point de composition et porte encore plusieurs panneaux et états de session. Extraire un panneau dans sa fonctionnalité lorsque son comportement évolue, sans mélanger ce travail avec une modification du format Markdown. Les styles sont encore regroupés dans `app/styles.css` ; cette réorganisation ne constitue pas une refonte CSS.

## Vérifications et données

```sh
npm run check:architecture
npm test
npm run test:ui
npx playwright install chromium
npm run test:browser
```

Sur une machine disposant de Chrome : `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`. Le serveur navigateur utilise un coffre temporaire distinct, supprimé à l'arrêt normal. Les captures et traces restent dans `test-results/`, ignoré par Git. Le coffre personnel `vault/`, son historique et les fichiers `.env` ne doivent jamais être versionnés.

Le contrôle d'architecture inspecte les imports et exports statiques ainsi que les imports dynamiques à chaîne littérale. Il ne prouve pas l'absence de cycles au sein d'une même fonctionnalité ni les dépendances transitives des paquets externes. Les imports construits à l'exécution sont à éviter et demandent une revue explicite.
