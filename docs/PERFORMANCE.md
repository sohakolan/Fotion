# Performance : mesures et limites

## Chargement de la coloration — 30 octobre 2026

Mesures de `npm run build`, Vite 8.3.5, même environnement local. Les tailles sont décimales, arrondies par Vite ; « gzip » est son estimation de compression, pas une mesure du transfert réel du serveur local.

| JavaScript | Avant (`5e31b2f`) | Après chargement différé |
| --- | ---: | ---: |
| Module initial minifié | 815,54 ko | 632,51 ko |
| Module initial, estimation gzip | 258,56 ko | 199,35 ko |
| Module différé de coloration minifié | — | 163,51 ko |
| Module différé, estimation gzip | — | 52,08 ko |

Le module initial diminue d'environ 22,4 % en taille minifiée et 22,9 % en estimation gzip. Le module de coloration est demandé au premier bloc non vide qui indique une langue autre que `plaintext`. Les pages sans code et les blocs de texte brut n'en ont pas besoin. Les 37 grammaires communes restent chargées ensemble à ce premier usage ; il ne s'agit pas encore d'un chargement par langage.

L'extension de code conserve son éditeur, sa langue, son retour à la ligne, sa légende et sa copie dès l'ouverture. Pendant le chargement, seul le rendu coloré attend. Une erreur de téléchargement laisse le texte éditable et sauvegardable, avec un message proposant de recharger la page. Aucune transaction de document n'est émise pour l'arrivée de la coloration, afin de ne pas déclencher une sauvegarde, une normalisation d'autres plugins ou une étape d'annulation.

Les plages colorées sont mises en cache par nœud ProseMirror immuable avec une `WeakMap`. Modifier un autre bloc ou déplacer un bloc de code ne demande pas de réanalyser le texte inchangé. Aucune détection automatique de langage n'est lancée.

## Preuves reproductibles

- [Chargement différé](../src/features/editor/lib/lazy-highlighting.ts) et [rendu syntaxique](../src/features/editor/lib/syntax-highlighting.ts).
- [Tests des alias, positions et catalogue](../tests/unit/highlighting.test.ts) ; [test de conservation du document](../tests/unit/markdown.test.ts).
- [Chrome sur le build de production](../tests/e2e/editor.spec.ts) : absence de téléchargement sur une page sans code et sur un bloc brut, téléchargement volontairement retardé, absence de sauvegarde supplémentaire à son arrivée, échec réseau, édition puis récupération après rechargement.

```sh
npm test
npm run test:ui
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

`test:browser` compile puis sert `dist/` avec le coffre de test temporaire. `test:ui` recompose les fichiers compilés en une IIFE pour JSDOM, qui n'exécute pas les imports ES depuis `eval` ; ce scénario vérifie le DOM, tandis que Chrome vérifie le téléchargement réel des modules séparés. En CI, le build déjà effectué par `test:ui` est réutilisé par `npx playwright test`.

## Travail restant

Le module initial dépasse encore 500 ko minifiés. La baisse mesurée ne prouve pas un temps de démarrage, une consommation mémoire ou une latence de frappe satisfaisants sur mobile. Mesurer ces aspects sur appareils réels, avec gros coffres et longs documents, avant de déclarer l'objectif « lightweight performant » terminé. Étudier ensuite le chargement par langage et les autres modules lourds à partir de profils, sans déplacer artificiellement le coût vers un téléchargement immédiat supplémentaire.
