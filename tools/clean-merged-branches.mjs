// Retire the explicitly audited branches, retaining the only required branch: main.
// Eleven heads are ancestors of main; the twelfth is an unused experiment whose
// combat behaviors are superseded in main. Verify its exact SHA and main ancestry.
// Uses the owner's existing Git authentication; never rewrites main or local files.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const RETIRED_BRANCHES = Object.freeze([
  "feat/mobile-touch-joystick-layout",
  "fix/fullscreen-panels-v037-centering",
  "fix/mobile-tests-panel-visibility",
  "fix/mobile-v037-top-controls",
  "fix/mobile-v0405-clean-rebuild",
  "fix/streamer-tests-overlay-constant-arena",
  "fix/v040-auto-build-mobile-on-start",
  "fix/v0401-mobile-streamer-power-rail",
  "refactor/official-v0405-index-cleanup",
  "release/arena-live-v040-full",
  "restore/mobile-v037-contract"
]);
export const SUPERSEDED_EXPERIMENT = Object.freeze({
  branch: "fix/free-reentry-melee-collision-vertical-ai",
  sha: "ed16906342905d254a91fef4b5a7ab4b8d7cb6b5",
  // This main commit contains the integrated NPC aim, basic clash and ground bounce.
  mainContains: "e6225d13ec89a60f6091b6d4318c5f320d132786"
});
const root = fileURLToPath(new URL('../', import.meta.url));
export function cleanMergedBranches({ cwd = root, dryRun = false, superseded = SUPERSEDED_EXPERIMENT } = {}) {
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
  if (superseded) {
    const { branch, sha, mainContains } = superseded;
    const ref = git(['rev-parse','--verify',`refs/remotes/origin/${branch}`], [0,128]);
    if (ref.status === 0) {
      if (ref.output !== sha) throw new Error(`La rama ${branch} cambió desde la auditoría. No se ha eliminado ninguna rama.`);
      if (git(['merge-base','--is-ancestor',mainContains,main], [0,1]).status !== 0)
        throw new Error(`main ya no contiene la implementación que reemplaza ${branch}. No se ha eliminado ninguna rama.`);
      plan.push({ branch, sha: ref.output });
    }
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
      : 'Las ramas auditadas ya están retiradas.');
    console.log('main conserva el historial; los archivos locales se mantienen.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
