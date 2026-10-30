import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDirective, parseAttributes, serializeAttributes, serializeContainer, serializeLeaf, directiveStart, parse, stringify, validate } from '../../engine/fotionmark';

test('attributes accept bare, quoted and escaped values and round-trip', () => {
  const attributes = parseAttributes('{width=50% title="Deux mots" note=\'a "b"\' flag}');
  assert.deepEqual(attributes, { width: '50%', title: 'Deux mots', note: 'a "b"', flag: '' });
  assert.deepEqual(parseAttributes(serializeAttributes(attributes)), attributes);
  assert.equal(serializeAttributes({}), '');
});

test('containers nest by fence length or by depth and ignore fences inside code', () => {
  const source = serializeContainer('columns', {}, [serializeContainer('column', { width: '60%' }, 'Gauche'), serializeContainer('column', {}, '```md\n:::\n```')].join('\n'));
  assert.ok(source.startsWith('::::columns\n:::column{width=60%}\nGauche\n:::\n'), source);
  const outer = parseDirective(`${source}\n\nAprès`);
  assert.equal(outer?.kind, 'container');
  assert.equal(outer?.raw, source);
  const first = parseDirective(outer!.kind === 'container' ? outer!.body : '');
  assert.deepEqual([first?.name, first?.attributes, first?.kind === 'container' && first.body], ['column', { width: '60%' }, 'Gauche']);
  const same = parseDirective(':::a\n:::b\nx\n:::\n:::\nreste');
  assert.equal(same?.kind === 'container' && same.body, ':::b\nx\n:::');
  assert.equal(parseDirective(':::a\nnon fermé'), null);
});

test('leaf directives, labels and lexer start positions', () => {
  assert.deepEqual(parseDirective('::embed[Vidéo]{url="https://exemple.fr/v"}\nsuite'), { kind: 'leaf', name: 'embed', label: 'Vidéo', attributes: { url: 'https://exemple.fr/v' }, raw: '::embed[Vidéo]{url="https://exemple.fr/v"}' });
  assert.equal(serializeLeaf('database', { src: './Projets', view: 'Kanban' }), '::database{src=./Projets view=Kanban}');
  assert.equal(directiveStart('Texte\n:::columns\n'), 6);
  assert.equal(directiveStart('ratio 1::2'), -1);
  assert.equal(parseDirective('Pas une directive'), null);
});

test('the interpreter builds a tree, keeps Markdown runs and round-trips a document', () => {
  const source = '---\ntitle: Essai\n---\n\nIntro **riche**\n\n::::columns\n:::column{width=60%}\n# Gauche\n\n::embed{url=https://exemple.fr}\n:::\n:::column\n```\n:::pas une directive\n```\n:::\n::::\n\nFin.';
  const document = parse(source);
  assert.equal(document.frontmatter, 'title: Essai');
  assert.deepEqual(document.children.map(node => node.type), ['markdown', 'block', 'markdown']);
  const columns = document.children[1];
  assert.ok(columns.type === 'block' && columns.children.length === 2);
  assert.deepEqual(columns.type === 'block' && columns.children[0].type === 'block' && columns.children[0].children.map(node => node.type), ['markdown', 'leaf']);
  assert.equal(stringify(document), source);
  assert.deepEqual(parse(stringify(document)), document);
});

test('the schema reports unknown and misplaced blocks without changing the tree', () => {
  assert.deepEqual(validate(parse(':::columns\n:::column\nA\n:::\n:::column\nB\n:::\n:::').children), []);
  const messages = (source: string) => validate(parse(source).children).map(d => d.message);
  assert.deepEqual(messages(':::column\nSeule\n:::'), ['« column » doit être dans « columns »']);
  assert.deepEqual(messages('::::columns\n:::column\nA\n:::\n::::'), ['« columns » demande au moins 2 éléments']);
  assert.deepEqual(messages('::kanban{src=./Projets}'), ['Bloc inconnu « kanban »']);
  assert.deepEqual(messages('::::columns\n:::column{width=150%}\nA\n:::\n:::column\nB\n:::\n::::'), ['Valeur invalide pour width : 150%']);
});
