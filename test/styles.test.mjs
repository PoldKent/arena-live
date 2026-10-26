import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

test('the shipped stylesheet covers current UI classes without compiling styles in the browser', async () => {
  const html = await readEngineSource();
  assert.match(html, /<link rel="stylesheet" href="styles\/arena-ui\.css/);
  assert.doesNotMatch(html, /<script[^>]+cdn\.tailwindcss\.com/);
  const {stdout} = await promisify(execFile)(process.execPath,
    [fileURLToPath(new URL('../tools/build-styles.mjs', import.meta.url)), '--check']);
  assert.match(stdout, /CSS publicado coincide/);
});
