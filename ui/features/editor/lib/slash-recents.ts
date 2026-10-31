/** Notion's slash menu pins the recently used commands; the list lives in the browser, like other UI preferences. */
const recentLimit = 6;
const recentStorageKey = 'fotion-slash-recents';

export const recentSlashIds = (): string[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(recentStorageKey) ?? '[]');
    return Array.isArray(stored) && stored.every(id => typeof id === 'string') ? stored.slice(0, recentLimit) : [];
  } catch { return []; }
};

/** Notes an executed command, most recent first, without duplicates. */
export function pushRecentSlashCommand(id: string): void {
  if (typeof localStorage === 'undefined') return;
  const updated = [id, ...recentSlashIds().filter(existing => existing !== id)].slice(0, recentLimit);
  try { localStorage.setItem(recentStorageKey, JSON.stringify(updated)); } catch { /* a full quota must not break the editor. */ }
}
