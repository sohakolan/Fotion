/**
 * Natural date phrases for Notion's @-menu, in French and English. Dates are local calendar days (YYYY-MM-DD).
 */
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/['’]/g, ' ').replace(/\s+/g, ' ').trim();
const pad = (value: number) => String(value).padStart(2, '0');
export const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const monthsEn = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const weekdaysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const monthIndex = (word: string) => { const i = months.findIndex(m => m.startsWith(word)), j = monthsEn.findIndex(m => m.startsWith(word)); return word.length >= 3 ? (i >= 0 ? i : j) : -1; };

function valid(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

/** Interprets one phrase; returns the calendar day or null. */
export function parseDatePhrase(text: string, now = new Date()): string | null {
  const q = normalize(text);
  if (!q) return null;
  const today = addDays(now, 0);
  const relative: Record<string, number> = { "aujourd hui": 0, today: 0, demain: 1, tomorrow: 1, hier: -1, yesterday: -1, "apres demain": 2, "avant hier": -2 };
  if (q in relative) return isoDay(addDays(today, relative[q]));
  let match = q.match(/^(?:dans|in) (\d{1,3}) (jours?|days?|semaines?|weeks?|mois|months?)$/);
  if (match) { const n = Number(match[1]), unit = match[2]; return isoDay(/^(mois|month)/.test(unit) ? new Date(today.getFullYear(), today.getMonth() + n, today.getDate()) : addDays(today, /^(semaine|week)/.test(unit) ? n * 7 : n)); }
  match = q.match(/^(?:il y a (\d{1,3}) (jours?|semaines?)|(\d{1,3}) (days?|weeks?) ago)$/);
  if (match) { const n = Number(match[1] ?? match[3]), unit = match[2] ?? match[4]; return isoDay(addDays(today, -(/^(semaine|week)/.test(unit) ? n * 7 : n))); }
  match = q.match(/^(?:(prochain|next) )?([a-z]+)(?: (prochain|next))?$/);
  const weekday = match ? Math.max(weekdays.indexOf(match[2]), weekdaysEn.indexOf(match[2])) : -1;
  if (match && weekday >= 0) { const ahead = (weekday - today.getDay() + 7) % 7 || 7; return isoDay(addDays(today, ahead)); }
  match = q.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) { const date = valid(+match[1], +match[2] - 1, +match[3]); return date && isoDay(date); }
  match = q.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/);
  if (match) { const year = match[3] ? (match[3].length === 2 ? 2000 + +match[3] : +match[3]) : today.getFullYear(); const date = valid(year, +match[2] - 1, +match[1]); return date && isoDay(date); }
  match = q.match(/^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/) || q.match(/^([a-z]+) (\d{1,2})(?:,? (\d{4}))?$/);
  if (match) {
    const [day, word] = /^\d/.test(match[1]) ? [+match[1], match[2]] : [+match[2], match[1]];
    const month = monthIndex(word);
    if (month >= 0) { const date = valid(match[3] ? +match[3] : today.getFullYear(), month, day); return date && isoDay(date); }
  }
  return null;
}

/** Suggestions shown in the Date section of the @-menu, best first. */
export function dateSuggestions(query: string, now = new Date()): string[] {
  const q = normalize(query);
  const exact = parseDatePhrase(query, now);
  if (exact) return [exact];
  if (!q) return [];
  // Partial words (“dem”, “aujou”, “lun”) complete to the matching relative day or weekday.
  const words = ["aujourd hui", 'demain', 'hier', 'today', 'tomorrow', 'yesterday', ...weekdays, ...weekdaysEn];
  return [...new Set(words.filter(word => word.startsWith(q)).map(word => parseDatePhrase(word, now)!))];
}

/** A stored date mention value: a calendar day, optionally with a time (reminders). */
export const isDateValue = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value) && !Number.isNaN(Date.parse(value.slice(0, 10)));

/**
 * French label of a stored day (or day and time). On screen Notion says Hier/Aujourd’hui/Demain;
 * files keep the absolute form (`relative: false`) so their text never changes with time.
 */
export function formatDate(value: string, now = new Date(), relative = true): string {
  const [day, time] = value.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d), diff = Math.round((date.getTime() - addDays(now, 0).getTime()) / 86_400_000);
  const name = relative && diff === 0 ? 'Aujourd’hui' : relative && diff === 1 ? 'Demain' : relative && diff === -1 ? 'Hier' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return time ? `${name} ${time.slice(0, 5)}` : name;
}
