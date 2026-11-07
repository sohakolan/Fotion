import { textColors } from '../models/palette';

export type SlashGroup = 'Blocs de base' | 'Médias' | 'Bases de données' | 'En ligne' | 'Avancés' | 'Actions' | 'Couleurs';
/** `hidden` commands (actions, colours) only appear once the user types, as in Notion. */
export interface SlashCommand { id: string; label: string; description: string; group: SlashGroup; aliases: string; shortcut?: string; hidden?: boolean }

/** Block types reachable through `/turn` (« Transformer en … »). */
export const turnTargets = [['text', 'Texte'], ['heading1', 'Titre 1'], ['heading2', 'Titre 2'], ['heading3', 'Titre 3'], ['bulletList', 'Liste à puces'], ['orderedList', 'Liste numérotée'], ['taskList', 'Liste de tâches'], ['toggle', 'Liste dépliante'], ['quote', 'Citation'], ['code', 'Code'], ['callout', 'Encadré']] as const;

// Order and grouping follow Notion's slash menu; aliases cover French names and Notion's English commands.
const catalogue: SlashCommand[] = [
  { id: 'text', label: 'Texte', description: 'Commencez à écrire, tout simplement.', group: 'Blocs de base', aliases: 'paragraphe paragraph text plain texte' },
  { id: 'heading1', label: 'Titre 1', description: 'Un grand titre de section.', group: 'Blocs de base', aliases: 'h1 # heading 1 titre', shortcut: '#' },
  { id: 'heading2', label: 'Titre 2', description: 'Un titre de section intermédiaire.', group: 'Blocs de base', aliases: 'h2 ## heading 2 titre', shortcut: '##' },
  { id: 'heading3', label: 'Titre 3', description: 'Un petit titre de section.', group: 'Blocs de base', aliases: 'h3 ### heading 3 titre', shortcut: '###' },
  { id: 'bulletList', label: 'Liste à puces', description: 'Une liste simple à puces.', group: 'Blocs de base', aliases: 'bullet bulleted list ul puces', shortcut: '-' },
  { id: 'orderedList', label: 'Liste numérotée', description: 'Une liste avec un ordre à suivre.', group: 'Blocs de base', aliases: 'num numbered ordered list ol numéros', shortcut: '1.' },
  { id: 'taskList', label: 'Liste de tâches', description: 'Gardez une trace de vos tâches.', group: 'Blocs de base', aliases: 'todo to-do task checkbox case à cocher', shortcut: '[]' },
  { id: 'toggle', label: 'Liste dépliante', description: 'Masquez ou affichez du contenu.', group: 'Blocs de base', aliases: 'toggle list déroulante bascule', shortcut: '>' },
  { id: 'page', label: 'Page', description: 'Créez une sous-page dans cette page.', group: 'Blocs de base', aliases: 'page sous-page subpage' },
  { id: 'link', label: 'Lien vers une page', description: 'Ajoutez un bloc qui mène à une autre page.', group: 'Blocs de base', aliases: 'link lien page link to page' },
  { id: 'callout', label: 'Encadré', description: 'Mettez une idée importante en avant.', group: 'Blocs de base', aliases: 'callout note info encadré' },
  { id: 'quote', label: 'Citation', description: 'Mettez un passage en lumière.', group: 'Blocs de base', aliases: 'quote blockquote citation', shortcut: '"' },
  { id: 'table', label: 'Tableau', description: 'Organisez des informations en lignes et colonnes.', group: 'Blocs de base', aliases: 'table tableau grid' },
  { id: 'divider', label: 'Séparateur', description: 'Séparez visuellement vos idées.', group: 'Blocs de base', aliases: 'div divider hr line séparateur ligne', shortcut: '---' },
  { id: 'image', label: 'Image', description: 'Intégrez une image à partir de son lien.', group: 'Médias', aliases: 'image photo picture img' },
  { id: 'video', label: 'Vidéo', description: 'Importez ou intégrez une vidéo (YouTube, Vimeo…).', group: 'Médias', aliases: 'video vidéo film youtube vimeo' },
  { id: 'audio', label: 'Audio', description: 'Importez ou intégrez un fichier audio.', group: 'Médias', aliases: 'audio son musique podcast' },
  { id: 'code', label: 'Code', description: 'Capturez un extrait de code.', group: 'Médias', aliases: 'code snippet pre', shortcut: '```' },
  { id: 'file', label: 'Fichier', description: 'Importez un fichier à télécharger.', group: 'Médias', aliases: 'file fichier pièce jointe upload' },
  { id: 'pdf', label: 'PDF', description: 'Affichez un document PDF dans la page.', group: 'Médias', aliases: 'pdf document' },
  { id: 'bookmark', label: 'Signet web', description: 'Ajoutez un lien avec son titre et sa description.', group: 'Médias', aliases: 'book bookmark signet lien web' },
  { id: 'embed', label: 'Intégration', description: 'Intégrez une page web dans un cadre isolé.', group: 'Médias', aliases: 'embed intégrer intégration iframe site' },
  { id: 'database', label: 'Vue tableau', description: 'Base de données en ligne : chaque ligne est une page.', group: 'Bases de données', aliases: 'database base de données bdd db table view vue tableau inline' },
  { id: 'databaseBoard', label: 'Vue kanban', description: 'Base de données en colonnes, regroupée par statut.', group: 'Bases de données', aliases: 'database board kanban base de données vue colonnes statut' },
  { id: 'math', label: 'Équation', description: 'Affichez une formule mathématique en LaTeX.', group: 'Avancés', aliases: 'math latex equation équation formule tex' },
  { id: 'button', label: 'Bouton', description: 'Insérez des blocs prédéfinis en un clic.', group: 'Avancés', aliases: 'button bouton template modèle' },
  { id: 'breadcrumb', label: 'Fil d’Ariane', description: 'Affichez le chemin de cette page.', group: 'Avancés', aliases: 'bread breadcrumb fil ariane chemin' },
  { id: 'toc', label: 'Table des matières', description: 'Naviguez entre les titres de cette page.', group: 'Avancés', aliases: 'toc table of contents sommaire matières' },
  ...[2, 3, 4].map(count => ({ id: `columns${count}`, label: `${count} colonnes`, description: `Répartissez le contenu sur ${count} colonnes.`, group: 'Avancés' as const, aliases: `columns colonnes ${count} cols layout` })),
  ...[1, 2, 3].map(level => ({ id: `toggleHeading${level}`, label: `Titre dépliant ${level}`, description: 'Un titre qui masque ou affiche son contenu.', group: 'Avancés' as const, aliases: `toggle heading h${level} titre dépliant` })),
  { id: 'mention', label: 'Mentionner une page', description: 'Insérez un lien vivant vers une page.', group: 'En ligne', aliases: 'mention @ page lien link' },
  { id: 'date', label: 'Date ou rappel', description: 'Insérez une date, par exemple aujourd’hui.', group: 'En ligne', aliases: 'date jour today aujourd hui calendrier' },
  { id: 'reminder', label: 'Rappel', description: 'Insérez un rappel pour aujourd’hui à 9 h.', group: 'En ligne', aliases: 'reminder rappel alarme' },
  { id: 'inlineEquation', label: 'Équation en ligne', description: 'Insérez une formule dans le texte.', group: 'En ligne', aliases: 'equation équation inline latex tex math formule' },
  { id: 'emoji', label: 'Emoji', description: 'Recherchez et insérez un emoji.', group: 'En ligne', aliases: 'emoji émoticône smiley' },
  { id: 'duplicate', label: 'Dupliquer', description: 'Créez une copie du bloc actuel.', group: 'Actions', aliases: 'duplicate dupliquer copier copy', shortcut: '⌘D', hidden: true },
  { id: 'moveto', label: 'Déplacer vers', description: 'Déplacez ce bloc vers une autre page.', group: 'Actions', aliases: 'moveto move to déplacer vers page', hidden: true },
  { id: 'delete', label: 'Supprimer', description: 'Supprimez le bloc actuel.', group: 'Actions', aliases: 'delete supprimer effacer remove', hidden: true },
  { id: 'color-default', label: 'Couleur par défaut', description: 'Retirez la couleur du bloc.', group: 'Couleurs', aliases: 'default défaut couleur color reset', hidden: true },
  ...textColors.filter(color => color.id !== 'default').flatMap(color => [
    { id: `color-${color.id}`, label: `Texte ${color.label.toLocaleLowerCase()}`, description: `Colore le texte du bloc en ${color.label.toLocaleLowerCase()}.`, group: 'Couleurs' as const, aliases: `color couleur texte ${color.id} ${color.label}`, hidden: true },
    { id: `background-${color.id}`, label: `Fond ${color.label.toLocaleLowerCase()}`, description: `Surligne le bloc en ${color.label.toLocaleLowerCase()}.`, group: 'Couleurs' as const, aliases: `background fond surligner highlight color couleur ${color.id} ${color.label}`, hidden: true },
  ]),
];

// « Transformer en … » entries reuse the aliases of the block they produce, so `/turn h1` works.
export const slashCommands: SlashCommand[] = [
  ...catalogue.filter(command => command.group !== 'Couleurs'),
  ...turnTargets.map(([id, label]) => ({ id: `turn-${id}`, label: `Transformer en ${label}`, description: `Change le bloc actuel en ${label.toLocaleLowerCase()}.`, group: 'Actions' as const, aliases: `turn transformer convertir into ${catalogue.find(command => command.id === id)?.aliases ?? ''}`, hidden: true })),
  ...catalogue.filter(command => command.group === 'Couleurs'),
];

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
const isSubsequence = (query: string, text: string) => { let i = 0; for (const char of text) if (char === query[i]) i++; return i === query.length; };

function score(command: SlashCommand, query: string) {
  const label = normalize(command.label), words = `${label} ${normalize(command.aliases)}`.split(/\s+/);
  if (label.startsWith(query)) return 0;
  if (words.some(word => word.startsWith(query))) return 1;
  const terms = query.split(/\s+/);
  if (terms.length > 1 && terms.every(term => words.some(word => word.startsWith(term)))) return 1;
  if (`${label} ${normalize(command.aliases)}`.includes(query)) return 2;
  if (query.length > 1 && isSubsequence(query.replace(/\s/g, ''), label.replace(/\s/g, ''))) return 3;
  return -1;
}

/** Commands matching a query, best matches first; ties keep the menu order. */
export function searchSlashCommands<T extends SlashCommand>(query: string, commands: T[]): T[] {
  const q = normalize(query.trim());
  if (!q) return commands.filter(command => !command.hidden);
  return commands.map((command, index) => ({ command, index, rank: score(command, q) }))
    .filter(entry => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.command);
}

const recentLimit = 6;

/** Empty-query menu: recently used commands lead, then the rest keeps its order. */
export function withRecentSlashCommands<T extends SlashCommand>(commands: T[], recents: string[]): T[] {
  if (!recents.length) return commands;
  const recent = new Map(recents.map((id, index) => [id, index]));
  const inRecents = commands.filter(command => recent.has(command.id))
    .sort((a, b) => (recent.get(a.id) ?? 0) - (recent.get(b.id) ?? 0));
  const rest = commands.filter(command => !recent.has(command.id));
  return [...inRecents, ...rest];
}

/** Detects `/query` at the cursor: at the start of the block or after a space, like Notion. */
export function slashQuery(textBefore: string): { query: string; length: number } | null {
  const match = textBefore.match(/(?:^|\s)\/((?!\s)[^/\n]{0,40})$/);
  if (!match) return null;
  return { query: match[1], length: match[1].length + 1 };
}
