/**
 * Language detection for freshly typed code blocks: signature lines from the strongest
 * to the weakest, so unclear snippets stay undetected. Only returns ids the editor
 * knows how to highlight — anything else keeps no language by us.
 */
export function detectLanguage(code: string): string | null {
  const text = code.trim();
  if (!text || !text.includes('\n')) return null; // A single line rarely identifies its language.
  const first = text.split('\n')[0].trim();

  const shebang = first.match(/^#!\s*\S*\b(bash|sh|python|node|ruby)\b/);
  if (shebang) return shebang[1] === 'bash' || shebang[1] === 'sh' ? 'bash' : shebang[1] === 'node' ? 'javascript' : shebang[1];
  if (/^<!DOCTYPE html/i.test(first) || /^<html[\s>]/i.test(first)) return 'xml';
  if (/^<\?php\b/.test(first)) return 'php';

  if (/^diff --git/m.test(text) || /^@@ -\d/.test(text) || (/^\+{1,3} \S/m.test(text) && /^-{1,3} \S/m.test(text))) return 'diff';
  if (/^#{1,3} \S/m.test(text) && /\*\*[^*]+\*\*|(\[[^\]]+\]\([^)]+\))/.test(text)) return 'markdown';
  if (/^\[[\w.-]+\]\s*$/m.test(text)) return 'ini';
  if (/^FROM \S/.test(first) && /^(RUN|CMD|COPY|ADD|ENTRYPOINT|EXPOSE) \S/m.test(text)) return 'dockerfile';
  if (/^(SELECT|INSERT INTO|UPDATE|CREATE TABLE|DELETE FROM|ALTER TABLE)\b/i.test(first)) return 'sql';
  if (/^(query|mutation|fragment)\s+\w+\s*[({]/i.test(first)) return 'graphql';

  // Typed JavaScript before plain JavaScript, and both before generic braces.
  if (/\binterface \w+|\btype \w+ =|:\s*(string|number|boolean|void|any)\b/.test(text)) return 'typescript';
  if (/\b(const|let|var) \w+|\bfunction \w+\(|=>/.test(text)) return 'javascript';

  if (/\bdef \w+\(|\belif\b|\bprint\(|\bfrom \w+ import |\b__init__\b/.test(code)) return 'python';
  if (/^#include\b/.test(first) || /\bstd::\w+|::\w+\(/.test(text) || /\bint main\s*\(/.test(text)) return 'cpp';
  if (/\busing System\b|\bnamespace \w+|\bpublic class \w+/.test(text)) return 'csharp';
  if (/\bpackage main\b|:=\s*\w+/.test(text) || /\bfunc \w+\(/.test(text)) return 'go';
  if (/\blet mut |fn \w+\(|::<|println!/.test(text)) return 'rust';
  if (/\bpublic static void main\b|\bSystem\.out\.print/.test(text)) return 'java';
  if (/\bfunc \w+\(/.test(text) && /\blet \w+ =/.test(text) && /\bvar\b/.test(text) === false) return 'swift';

  // CSS: selectors with declarations inside braces.
  if (/(^|\n)\s*[.#a-z][\w.#:>\s-]*\{[^}]*:[^}]+;/.test(code)) return 'css';
  if (/^\s*"[^"]+"\s*:\s*("[^"]*"|-?\d+(\.\d+)?|true|false|null)/m.test(code)) return 'json';
  if (/^[A-Za-z][\w-]*:\s*(?:$|\S)/m.test(code) && !/[{};]/.test(code) && (/^\s*[-*] /m.test(code) || /^-{3}$/m.test(code))) return 'yaml';
  if (/\bputs\b|\brequire(_relative)? ['"]/.test(code)) return 'ruby';
  return null;
}
