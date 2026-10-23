import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cleanMergedBranches, RETIRED_BRANCHES } from '../tools/clean-merged-branches.mjs';

async function fixture() {
  const path = await mkdtemp(join(tmpdir(),'arena-branch-test-')), remote = join(path,'remote.git'), cwd = join(path,'work');
  const git = (args, at = cwd) => execFileSync('git',args,{cwd:at,encoding:'utf8',stdio:'pipe'}).trim();
  git(['init','--bare',remote],path); git(['clone',remote,cwd],path);
  git(['config','user.name','Arena test']); git(['config','user.email','arena-test@example.invalid']);
  git(['checkout','-b','main']); await writeFile(join(cwd,'game.txt'),'retained history\n');
  git(['add','game.txt']); git(['commit','-m','base']); git(['push','origin','main']);
  const sha = git(['rev-parse','HEAD']);
  for (const branch of [...RETIRED_BRANCHES,'personal-work']) git(['push','origin',`${sha}:refs/heads/${branch}`]);
  return { cwd, git, sha, dispose:()=>rm(path,{recursive:true,force:true}), refs:()=>git(['for-each-ref','--format=%(refname):%(objectname)','refs/heads/'],remote) };
}
test('cleanup deletes only known integrated branches and preserves main and unrelated work', async()=>{
  const f = await fixture();
  try {
    const result=cleanMergedBranches({cwd:f.cwd});
    assert.deepEqual(result.branches,[...RETIRED_BRANCHES]);
    assert.equal(f.refs(),`refs/heads/main:${f.sha}\nrefs/heads/personal-work:${f.sha}`);
    assert.equal(f.git(['status','--porcelain']),'');
    assert.deepEqual(cleanMergedBranches({cwd:f.cwd}).branches,[]);
  } finally { await f.dispose(); }
});
test('cleanup rejects the entire plan when one known branch contains unmerged work', async()=>{
  const f = await fixture();
  try {
    f.git(['checkout','-b',RETIRED_BRANCHES[3]]); await writeFile(join(f.cwd,'new.txt'),'keep me');
    f.git(['add','new.txt']); f.git(['commit','-m','unmerged']); f.git(['push','origin',RETIRED_BRANCHES[3]]); f.git(['checkout','main']);
    const before=f.refs(); assert.throws(()=>cleanMergedBranches({cwd:f.cwd}),/cambios fuera de main/);
    assert.equal(f.refs(),before);
  } finally { await f.dispose(); }
});
test('dry run verifies integration while retaining every remote reference', async()=>{
  const f = await fixture();
  try {
    const before=f.refs(),result=cleanMergedBranches({cwd:f.cwd,dryRun:true});
    assert.equal(result.dryRun,true);assert.deepEqual(result.branches,[...RETIRED_BRANCHES]);assert.equal(f.refs(),before);
  } finally { await f.dispose(); }
});
