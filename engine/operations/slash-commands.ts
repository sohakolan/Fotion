export type SlashGroup = 'Blocs de base' | 'Médias' | 'Avancés';
export interface SlashCommand { id: string; label: string; description: string; group: SlashGroup; aliases: string; shortcut?: string }

// Order and grouping follow Notion's slash menu; aliases cover French and English names.
export const slashCommands: SlashCommand[] = [
  { id: 'text', label: 'Texte', description: 'Commencez à écrire, tout simplement.', group: 'Blocs de base', aliases: 'paragraphe paragraph text plain' },
  { id: 'heading1', label: 'Titre 1', description: 'Un grand titre de section.', group: 'Blocs de base', aliases: 'h1 heading 1 titre', shortcut: '#' },
  { id: 'heading2', label: 'Titre 2', description: 'Un titre de section intermédiaire.', group: 'Blocs de base', aliases: 'h2 heading 2 titre', shortcut: '##' },
  { id: 'heading3', label: 'Titre 3', description: 'Un petit titre de section.', group: 'Blocs de base', aliases: 'h3 heading 3 titre', shortcut: '###' },
  { id: 'bulletList', label: 'Liste à puces', description: 'Une liste simple à puces.', group: 'Blocs de base', aliases: 'bullet bulleted list ul puces', shortcut: '-' },
  { id: 'orderedList', label: 'Liste numérotée', description: 'Une liste avec un ordre à suivre.', group: 'Blocs de base', aliases: 'numbered ordered list ol numéros', shortcut: '1.' },
  { id: 'taskList', label: 'Liste de tâches', description: 'Gardez une trace de vos tâches.', group: 'Blocs de base', aliases: 'todo to-do task checkbox case à cocher', shortcut: '[]' },
  { id: 'toggle', label: 'Liste dépliante', description: 'Masquez ou affichez du contenu.', group: 'Blocs de base', aliases: 'toggle list déroulante bascule', shortcut: '>' },
  { id: 'page', label: 'Page', description: 'Créez une sous-page dans cette page.', group: 'Blocs de base', aliases: 'page sous-page subpage' },
  { id: 'callout', label: 'Encadré', description: 'Mettez une idée importante en avant.', group: 'Blocs de base', aliases: 'callout note info encadré' },
  { id: 'quote', label: 'Citation', description: 'Mettez un passage en lumière.', group: 'Blocs de base', aliases: 'quote blockquote citation', shortcut: '"' },
  { id: 'table', label: 'Tableau', description: 'Organisez des informations en lignes et colonnes.', group: 'Blocs de base', aliases: 'table tableau grid' },
  { id: 'divider', label: 'Séparateur', description: 'Séparez visuellement vos idées.', group: 'Blocs de base', aliases: 'divider hr line séparateur ligne', shortcut: '---' },
  { id: 'image', label: 'Image', description: 'Intégrez une image à partir de son lien.', group: 'Médias', aliases: 'image photo picture img' },
  { id: 'code', label: 'Code', description: 'Capturez un extrait de code.', group: 'Médias', aliases: 'code snippet pre', shortcut: '```' },
  { id: 'toc', label: 'Table des matières', description: 'Naviguez entre les titres de cette page.', group: 'Avancés', aliases: 'toc table of contents sommaire' },
  ...[2, 3, 4].map(count => ({ id: `columns${count}`, label: `${count} colonnes`, description: `Répartissez le contenu sur ${count} colonnes.`, group: 'Avancés' as const, aliases: `columns colonnes ${count} cols layout` })),
  ...[1, 2, 3].map(level => ({ id: `toggleHeading${level}`, label: `Titre dépliant ${level}`, description: 'Un titre qui masque ou affiche son contenu.', group: 'Avancés' as const, aliases: `toggle heading h${level} titre dépliant` })),
];

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
const isSubsequence = (query: string, text: string) => { let i = 0; for (const char of text) if (char === query[i]) i++; return i === query.length; };

function score(command: SlashCommand, query: string) {
  const label = normalize(command.label), words = `${label} ${normalize(command.aliases)}`.split(/\s+/);
  if (label.startsWith(query)) return 0;
  if (words.some(word => word.startsWith(query))) return 1;
  if (`${label} ${normalize(command.aliases)}`.includes(query)) return 2;
  if (query.length > 1 && isSubsequence(query.replace(/\s/g, ''), label.replace(/\s/g, ''))) return 3;
  return -1;
}

/** Commands matching a query, best matches first; ties keep the menu order. */
export function searchSlashCommands<T extends SlashCommand>(query: string, commands: T[]): T[] {
  const q = normalize(query.trim());
  if (!q) return commands;
  return commands.map((command, index) => ({ command, index, rank: score(command, q) }))
    .filter(entry => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.command);
}

/** Detects `/query` at the cursor: at the start of the block or after a space, like Notion. */
export function slashQuery(textBefore: string): { query: string; length: number } | null {
  const match = textBefore.match(/(?:^|\s)\/((?!\s)[^/\n]{0,40})$/);
  if (!match) return null;
  return { query: match[1], length: match[1].length + 1 };
}
