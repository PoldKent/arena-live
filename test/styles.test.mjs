import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

test('the shipped stylesheet covers current UI classes without compiling styles in the browser', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="styles\/arena-ui\.css/);
  assert.doesNotMatch(html, /<script[^>]+cdn\.tailwindcss\.com/);
  const {stdout} = await promisify(execFile)(process.execPath,
    [fileURLToPath(new URL('../tools/build-styles.mjs', import.meta.url)), '--check']);
  assert.match(stdout, /CSS publicado coincide/);
});
