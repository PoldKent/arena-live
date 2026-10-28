// Generate the committed UI stylesheet without a runtime browser compiler.
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {missingCssRules} from './css-coverage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = createRequire(import.meta.url).resolve('tailwindcss/lib/cli.js');
const check = process.argv.includes('--check');
const temporary = check ? await mkdtemp(join(tmpdir(), 'arena-live-css-')) : null;
const committed = join(root, 'styles/arena-ui.css');
const output = check ? join(temporary, 'arena-ui.css') : committed;
try {
  const result = spawnSync(process.execPath, [cli, '--input', 'styles/arena-ui.input.css',
    '--output', output, '--content', 'index.html,bridge/bridge-client.js,engine/*.js', '--minify'],
    {cwd:root, encoding:'utf8'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'No se pudo generar el CSS.');
  if (check) {
    const published = await readFile(committed, 'utf8');
    const required = await readFile(output, 'utf8');
    if (published !== required) {
      // The redesigned lobby removed Tailwind classes but uses its own inline
      // broadcast CSS. An old, otherwise valid utility is not a missing style.
      const postcss = createRequire(cli)('postcss');
      const missing = missingCssRules(postcss, published, required);
      if (missing.length) {
        throw new Error('CSS desactualizado: faltan ' + missing.length
          + ' reglas o difieren sus declaraciones. Ejecuta npm.cmd run build:styles'
          + ' y guarda styles/arena-ui.css. Ejemplos: ' + missing.slice(0, 3).join('; '));
      }
      console.log('CSS publicado coincide en todas las reglas necesarias; hay selectores antiguos sin uso.');
    } else {
      console.log('CSS publicado coincide exactamente con las clases del juego y del puente.');
    }
  } else console.log('Generado styles/arena-ui.css.');
} finally {
  if (temporary) await rm(temporary, {recursive:true, force:true});
}
