import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { isDirectExecution } from '../src/index.js';

test('isDirectExecution returns true for absolute script paths', () => {
  const importMetaUrl = new URL('../src/index.js', import.meta.url).href;
  const absoluteScriptPath = fileURLToPath(importMetaUrl);

  assert.equal(isDirectExecution(importMetaUrl, absoluteScriptPath), true);
});

test('isDirectExecution returns true for relative script paths', () => {
  const importMetaUrl = new URL('../src/index.js', import.meta.url).href;
  const absoluteScriptPath = fileURLToPath(importMetaUrl);
  const relativeScriptPath = relative(process.cwd(), absoluteScriptPath);

  assert.equal(isDirectExecution(importMetaUrl, relativeScriptPath), true);
});

test('isDirectExecution returns false when argv1 is missing or different', () => {
  const importMetaUrl = new URL('../src/index.js', import.meta.url).href;

  assert.equal(isDirectExecution(importMetaUrl, undefined), false);
  assert.equal(isDirectExecution(importMetaUrl, '/tmp/not-index.js'), false);
});
