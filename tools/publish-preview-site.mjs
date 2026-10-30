// Explicit opt-in deployment of the built browser preview to a gh-pages branch.
// Uses an isolated temporary checkout; never force-pushes or rewrites the main branch.
import {mkdtemp,readdir,rm,cp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=resolve(root,'dist/arena-preview');
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
const args=process.argv.slice(2);
if(!args.includes('--confirm-public')){
    console.error('Run npm run publish:preview -- --confirm-public after reviewing the generated files. All client-side JavaScript will be publicly accessible.');
    process.exitCode=2;
}else{
    function git(cwd,...command){
        const result=spawnSync('git', ['-C',cwd,...command],{encoding:'utf8',stdio:['inherit','pipe','pipe']});
        if(result.error||result.status!==0)throw Error('git '+command.join(' ')+' failed: '+(result.stderr||result.error||''));
        return result.stdout.trim();
    }
    const remoteArg=args.find(a=>a.startsWith('--remote='));
    const remote=remoteArg?remoteArg.slice('--remote='.length):git(root,'remote','get-url','origin');
    if(!/^(?:https:\/\/github\.com\/|git@github\.com:)[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(remote))
        throw Error('Only GitHub repositories are supported for this deployment.');
    const expected=['index.html','mobile.html','desktop/index.html','.nojekyll','robots.txt'];
    for(const path of expected){
        const {stat}=await import('node:fs/promises');
        await stat(resolve(source,path));
    }
    const tmp=await mkdtemp(join(tmpdir(),'arena-live-preview-'));
    try{
        const check=spawnSync('git',['-C',root,'ls-remote','--heads',remote,'refs/heads/gh-pages'],{encoding:'utf8'});
        if(check.error||check.status!==0)throw Error('Cannot check remote gh-pages branch: '+(check.stderr||check.error||''));
        const exists=check.stdout.trim().length>0;
        if(exists){
            const clone=spawnSync('git',['clone','--depth','1','--branch','gh-pages',remote,tmp],{encoding:'utf8'});
            if(clone.error||clone.status!==0)throw Error('Unable to clone gh-pages: '+(clone.stderr||clone.error||''));
        }else{
            git(tmp,'init','-b','gh-pages');
            git(tmp,'remote','add','origin',remote);
        }
        for(const item of await readdir(tmp))if(item!=='.git')await rm(join(tmp,item),{recursive:true,force:true});
        await cp(source,tmp,{recursive:true,force:true});
        git(tmp,'add','-A');
        const checkDiff=spawnSync('git',['-C',tmp,'diff','--cached','--quiet']);
        if(checkDiff.status===1){
            git(tmp,'commit','-m',`deploy(preview): Arena Live ${version}`);
            git(tmp,'push','origin','gh-pages');
            console.log('Preview pushed to gh-pages of '+remote+'. Enable GitHub Pages from gh-pages / (root) in repository Settings > Pages.');
        }else if(checkDiff.status===0)console.log('Preview already up to date in gh-pages.');
        else throw Error('Unable to check staged changes');
    }finally{
        await rm(tmp,{recursive:true,force:true});
    }
}
