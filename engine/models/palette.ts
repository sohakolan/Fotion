/** Notion block colours: stored ids, French labels and the light values written into files. */
export const textColors = [
  { id: 'default', label: 'Par défaut', text: 'inherit', background: 'transparent' },
  { id: 'gray', label: 'Gris', text: '#787774', background: '#f1f1ef' },
  { id: 'brown', label: 'Marron', text: '#976d57', background: '#f3eeee' },
  { id: 'orange', label: 'Orange', text: '#cc782f', background: '#f8ecdf' },
  { id: 'yellow', label: 'Jaune', text: '#c29343', background: '#faf3dd' },
  { id: 'green', label: 'Vert', text: '#548164', background: '#eef3ed' },
  { id: 'blue', label: 'Bleu', text: '#487ca5', background: '#e9f3f7' },
  { id: 'purple', label: 'Violet', text: '#8a67ab', background: '#f6f3f8' },
  { id: 'pink', label: 'Rose', text: '#b35488', background: '#f9f2f5' },
  { id: 'red', label: 'Rouge', text: '#c4554d', background: '#faecec' },
] as const;
export type ColorId = typeof textColors[number]['id'];
export const colorId = (value: unknown): ColorId => textColors.find(c => c.id === value)?.id || 'default';
