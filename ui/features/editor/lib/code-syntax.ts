/** Builds only when a code block needs a language: the grammar module stays out of the main bundle. */
type SyntaxModule = typeof import('./syntax-highlighting');
let module_: Promise<SyntaxModule> | undefined;
const load = () => module_ ??= import('./syntax-highlighting');

export async function ensureLanguage(language: string) {
  const module = await load();
  await module.ensureLanguage(language);
}
