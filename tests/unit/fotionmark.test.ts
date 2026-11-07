import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDirective, parseAttributes, serializeAttributes, serializeContainer, serializeLeaf, directiveStart, parse, stringify, validate, readAttributes, writeAttributes, defineBlock, createRegistry, readDatabase, readCell, writeCell, newPropertyId, updateProperty, addProperty, newDatabase, reservedKeys, type Property } from '../../engine/fotionmark';

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

test('typed attributes read defaults, write only what differs and keep unknown keys', () => {
  const types = { width: { type: 'percent' }, view: { type: 'enum', values: ['table', 'board'], default: 'table' }, limit: { type: 'number', integer: true, min: 1, default: 10 }, open: { type: 'boolean', default: false }, due: { type: 'date' }, src: { type: 'page' } } as const;
  assert.deepEqual(readAttributes(types, { width: '35%', view: 'kanban', limit: '0', open: '', due: '2026-10-30', src: '../x.md', autre: '1' }), { width: 35, view: 'table', limit: 10, open: true, due: '2026-10-30', src: undefined });
  assert.deepEqual(writeAttributes(types, { width: 50, view: 'table', limit: 25, open: false }, { autre: '1', view: 'board' }), { autre: '1', width: '50%', limit: '25' });
});

test('block declarations and registries reject inconsistent definitions', () => {
  assert.throws(() => defineBlock({ name: 'Mauvais_Nom', form: 'leaf', version: 1, description: '', attributes: {} }));
  assert.throws(() => defineBlock({ name: 'feuille', form: 'leaf', version: 1, description: '', attributes: {}, content: { kind: 'markdown' } }));
  assert.throws(() => defineBlock({ name: 'avec-id', form: 'leaf', version: 1, description: '', attributes: { id: { type: 'string' } } }));
  const leaf = defineBlock({ name: 'note', form: 'leaf', version: 1, description: '', attributes: {} });
  assert.throws(() => createRegistry([leaf, leaf]));
  assert.throws(() => createRegistry([defineBlock({ name: 'enfant', form: 'leaf', version: 1, description: '', attributes: {}, parent: 'absent' })]));
  assert.deepEqual(validate(parse('::note{id=Mauvais}\n::note{id=bon-1 inconnu=x}').children, createRegistry([leaf])).map(d => [d.severity, d.message]), [['error', 'Identifiant de bloc invalide : Mauvais'], ['warning', 'Attribut inconnu conservé : inconnu']]);
});

test('database schemas read known properties, report the rest and keep it when edited', () => {
  const raw = { properties: [{ id: 'status', name: 'Statut', type: 'status' }, { id: 'tags', name: 'Étiquettes', type: 'multi-select', options: [{ name: 'Urgent', color: 'red' }, { color: 'blue' }] }, { id: 'title', type: 'text' }, { id: 'map', type: 'place', zoom: 4 }, { id: 'status', type: 'text' }], view: 'kept' };
  const reading = readDatabase(raw)!;
  assert.deepEqual(reading.properties.map(p => [p.id, p.type, p.options.map(o => o.name)]), [['status', 'status', ['Pas commencé', 'En cours', 'Terminé']], ['tags', 'multi-select', ['Urgent']]]);
  assert.equal(reading.problems.length, 3);
  assert.equal(readDatabase({ title: 'pas une base' }), undefined);
  const renamed = updateProperty(raw, 'tags', { name: 'Labels' });
  assert.equal(renamed.view, 'kept');
  assert.deepEqual((renamed.properties as object[])[3], { id: 'map', type: 'place', zoom: 4 });
  assert.equal(((renamed.properties as { name: string }[])[1]).name, 'Labels');
  const added = addProperty(newDatabase(), { id: newPropertyId('Échéance', ['tags']), name: 'Échéance', type: 'date' });
  assert.deepEqual(added.properties, [{ id: 'tags', name: 'Étiquettes', type: 'multi-select' }, { id: 'echeance', name: 'Échéance', type: 'date' }]);
  assert.equal(newPropertyId('Titre', []), 'titre');
  assert.equal(newPropertyId('Échéance', ['echeance']), 'echeance-2');
  assert.equal(newPropertyId('2026', []), 'propriete');
  assert.ok(!reservedKeys.includes(newPropertyId('parent', []) as never));
});

test('database cells read typed values, keep mismatches undefined and write YAML values', () => {
  const property = (type: Property['type']): Property => ({ id: 'x', name: 'X', type, options: [] });
  assert.equal(readCell(property('number'), 12.5), 12.5);
  assert.equal(readCell(property('number'), 'douze'), undefined);
  assert.equal(readCell(property('text'), undefined), null);
  assert.equal(readCell(property('text'), 42), '42');
  assert.deepEqual(readCell(property('multi-select'), 'Seul'), ['Seul']);
  assert.equal(readCell(property('date'), '2026-02-30'), undefined);
  assert.equal(readCell(property('checkbox'), 'oui'), undefined);
  assert.equal(writeCell(property('number'), '3,5'), 3.5);
  assert.equal(writeCell(property('number'), ''), undefined);
  assert.equal(writeCell(property('checkbox'), false), undefined);
  assert.equal(writeCell(property('checkbox'), true), true);
  assert.deepEqual(writeCell(property('multi-select'), ' a, b ,a,, '), ['a', 'b']);
  assert.equal(writeCell(property('date'), '2026-11-07'), '2026-11-07');
  assert.equal(writeCell(property('date'), 'demain'), undefined);
  assert.equal(writeCell(property('select'), '  En cours '), 'En cours');
});

test('database views are leaf directives with an optional source and a table layout', () => {
  const document = parse('::database-view[Tableau]{src=projets.md}\n::database-view\n::database-view{layout=galaxy}');
  assert.deepEqual(validate(document.children).map(d => d.severity), ['error']);
  assert.equal(stringify(document), '::database-view[Tableau]{src=projets.md}\n::database-view\n::database-view{layout=galaxy}');
});
