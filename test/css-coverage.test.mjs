import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {missingCssRules} from '../tools/css-coverage.mjs';

const fromTailwind = createRequire(createRequire(import.meta.url).resolve('tailwindcss/lib/cli.js'));
const postcss = fromTailwind('postcss');

test('published CSS may retain obsolete utility selectors when required declarations still match',()=>{
  const published = '.old,.needed{color:red}@media(min-width:768px){.old-sm,.needed-sm{display:flex}}';
  const required = '.needed{color:red}@media(min-width:768px){.needed-sm{display:flex}}';
  assert.deepEqual(missingCssRules(postcss,published,required),[]);
});

test('CSS coverage rejects missing utilities and changed declarations',()=>{
  const published = '.needed{color:red}@media(min-width:768px){.needed-sm{display:block}}';
  const required = '.needed{color:blue}.absent{display:flex}@media(min-width:768px){.needed-sm{display:flex}}';
  assert.equal(missingCssRules(postcss,published,required).length,3);
});

test('CSS coverage preserves context and standalone font-face declarations',()=>{
  const published = '@media(max-width:600px){.needed{display:flex}}@font-face{font-family:Example;src:url(example.woff2)}';
  const required = '@media(min-width:600px){.needed{display:flex}}@font-face{font-family:Example;src:url(example.woff2)}';
  assert.equal(missingCssRules(postcss,published,required).length,1);
});
