export const seeds = [
  { id: 'bienvenue.md', title: 'Mon espace', icon: '🏡', favorite: true, cover: 'landscape', content: `Un endroit pour **penser librement**, rassembler vos idées et faire avancer ce qui compte.

## Faites comme chez vous

C’est ici que tout commence. Une idée à garder, un projet à construire, une liste à cocher… Cet espace est le vôtre.

> 🌱 Les grandes choses commencent souvent par une petite note.

## Un peu de clarté, chaque jour

- [x] Créer un endroit pour mes idées
- [x] Prendre le temps de l’explorer
- [ ] Écrire ma première note
- [ ] Donner vie à un nouveau projet

---

## À portée de main

Retrouvez vos projets, vos notes et vos inspirations dans les pages ci-dessous.

Un conseil : tapez **/** sur une ligne vide pour ajouter un bloc, ou sélectionnez du texte pour le mettre en forme.
` },
  { id: 'projets.md', title: 'Projets', icon: '🗂️', favorite: true, content: `Les idées qui prennent forme.

## En ce moment

- [ ] Imaginer mon prochain projet
- [ ] Définir une première étape concrète
- [ ] Réserver du temps pour avancer

## Plus tard

Un espace pour les envies qui peuvent attendre.
` },
  { id: 'notes.md', title: 'Notes & idées', icon: '💡', favorite: true, content: `Pour ne plus laisser filer les bonnes idées.

## Le carnet

Une phrase entendue, un détail observé, une question qui reste. Tout peut commencer ici.

> Il n’est pas nécessaire d’avoir une idée parfaite pour commencer à l’écrire.

## À explorer

- Apprendre quelque chose de nouveau
- Simplifier une habitude du quotidien
- Construire un outil que j’aimerais utiliser
` },
  { id: 'lectures.md', title: 'Liste de lecture', icon: '📚', content: `## Sur ma table de chevet

- [ ] Un livre qui change de perspective
- [ ] Un article à relire tranquillement
- [x] Quelques pages, chaque jour

## À retenir

Écrivez ici les passages et les idées que vous voulez garder.
` },
  { id: 'voyage.md', title: 'Prochaine escapade', icon: '🏔️', parent: 'projets.md', content: `## Prendre le large

Quelques jours pour ralentir et découvrir un autre horizon.

### Avant de partir

- [ ] Choisir la destination
- [ ] Trouver un joli endroit où dormir
- [ ] Préparer un itinéraire, avec de la place pour l’imprévu

### Dans mon sac

- Un carnet
- Un appareil photo
- Un bon livre
` },
  { id: 'guide.md', title: 'Premiers pas', icon: '👋', content: `## Un espace simple, des fichiers à vous

Vos pages sont enregistrées automatiquement dans des fichiers **Markdown** du dossier \`vault/\`. Vous pouvez les ouvrir avec un éditeur de texte ou Obsidian.

## Les essentiels

- Tapez **/** pour insérer un titre, une liste, une tâche ou un tableau.
- Sélectionnez un passage pour le mettre en **gras**, en *italique* ou ajouter un lien.
- Déplacez un bloc avec la poignée qui apparaît à sa gauche.
- Cliquez sur le titre, l’icône ou la couverture pour personnaliser la page.
- Utilisez **⌘ K** pour retrouver une page.
- Ajoutez une sous-page avec le **+** à droite d’une page dans la barre latérale.

## Le Markdown fonctionne aussi

Tapez \`# \` pour un titre, \`- \` pour une liste ou \`[] \` pour une tâche.

> Vos fichiers restent sur votre ordinateur. Aucun compte, aucune synchronisation.
` },
];
