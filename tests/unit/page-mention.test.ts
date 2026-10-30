import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentionQuery } from '../../src/features/editor/extensions/page-mention';

test('page mention triggers respect email addresses, word boundaries and closing brackets', () => {
  assert.deepEqual(mentionQuery('@'), { query: '', length: 1 });
  assert.deepEqual(mentionQuery('Voir @Mon projet'), { query: 'Mon projet', length: 11 });
  assert.deepEqual(mentionQuery('Voir [[Réunion'), { query: 'Réunion', length: 9 });
  assert.deepEqual(mentionQuery('(@Projet'), { query: 'Projet', length: 7 });
  for (const text of ['mail@example.com', '[[fermé]]', 'texte@page', '@page\nsuite']) assert.equal(mentionQuery(text), null, text);
});
