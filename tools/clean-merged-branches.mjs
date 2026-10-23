// Retire only the known pre-v0.6 branches after their history is in origin/main.
// Uses the owner's existing Git authentication; never rewrites main or local files.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const RETIRED_BRANCHES = Object.freeze([
  'analysis/class-balance-v05',
  'feature/performance-128-v05',
  'feature/tiktok-live-chat-mvp',
  'preview/class-balance-v05'
]);
const root = fileURLToPath(new URL('../', import.meta.url));
export function cleanMergedBranches({ cwd = root, dryRun = false } = {}) {
  const git = (args, allowed = [0]) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
    if (r.error) throw r.error;
    if (!allowed.includes(r.status)) throw new Error((r.stderr || r.stdout || `Git terminó con código ${r.status}`).trim());
    return { status: r.status, output: r.stdout.trim() };
  };
  if (git(['branch','--show-current']).output !== 'main') throw new Error('Ejecuta la limpieza desde la rama main.');
  git(['fetch','--prune','origin']);
  const main = git(['rev-parse','--verify','refs/remotes/origin/main']).output;
  const plan = [];
  for (const branch of RETIRED_BRANCHES) {
    const ref = git(['rev-parse','--verify',`refs/remotes/origin/${branch}`], [0,128]);
    if (ref.status !== 0) continue;
    const retained = git(['merge-base','--is-ancestor',ref.output,main], [0,1]);
    if (retained.status !== 0) throw new Error(`La rama ${branch} contiene cambios fuera de main. No se ha eliminado ninguna rama.`);
    plan.push({ branch, sha: ref.output });
  }
  if (plan.length && !dryRun) {
    // Atomic deletion and one lease per ref prevent deleting a branch that has
    // advanced since fetch. A protected ref/changed lease rejects the whole push.
    git(['push','--atomic', ...plan.map(p => `--force-with-lease=refs/heads/${p.branch}:${p.sha}`),
      'origin', ...plan.map(p => `:refs/heads/${p.branch}`)]);
    git(['fetch','--prune','origin']);
    for (const p of plan) {
      if (git(['rev-parse','--verify',`refs/remotes/origin/${p.branch}`], [0,128]).status === 0)
        throw new Error(`La rama ${p.branch} sigue disponible. Revisa el remoto.`);
    }
  }
  return { main, dryRun, branches: plan.map(p => p.branch) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = cleanMergedBranches({ dryRun: process.argv.includes('--dry-run') });
    console.log(result.branches.length
      ? `${result.dryRun ? 'Ramas verificadas' : 'Ramas retiradas'}: ${result.branches.join(', ')}`
      : 'Las ramas antiguas ya están retiradas.');
    console.log('main conserva el historial; los archivos locales se mantienen.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
