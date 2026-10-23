// Summarize one release's real-engine study. Historical source/variants are not
// mixed into current rates. Bootstrap whole seed clusters, including rotations.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const classes=['kame','ninja','titan','trueno','esmeralda'];
const names=['Guerrero','Shinobi','Titán','Rayo','Espíritu'];
export async function summarizeBalance(study, prefix) {
  assert.equal(study.deterministic,true);assert.equal(study.telemetryParity,true);assert.equal(study.crossScenarioParity,true);
  assert.deepEqual(study.errors,[]);assert.ok(study.metadata.engineGitBlob);
  const rows=study.results;
  const key=r=>[r.kind,r.powerMode,r.count||2,r.pair?.join('/'),r.seed,r.side,r.first,r.rotation].join('|');
  assert.equal(new Set(rows.map(key)).size,rows.length,'Count each case once');
  let state=20261023;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const round=n=>Math.round(n*10000)/10000;
  const ci=(matches,key)=>{
    const groups=new Map();
    for(const r of matches){const g=groups.get(r.baseSeed)||{n:0,wins:0};g.n++;g.wins+=Number(r.winner===key);groups.set(r.baseSeed,g);}
    const values=[...groups.values()].map(g=>g.wins/g.n),samples=[];
    for(let j=0;j<2000;j++){let sum=0;for(let i=0;i<values.length;i++)sum+=values[Math.floor(random()*values.length)];samples.push(sum/values.length*100);}
    samples.sort((a,b)=>a-b);return{seedClusters:values.length,low:round(samples[50]),high:round(samples[1949])};
  };
  const aggregate=matches=>{
    const result={matches:matches.length,timeouts:matches.filter(r=>!r.winner).length,classes:[]};
    if(!matches.length)return result;
    result.classes=classes.map((key,i)=>{
      const eligible=matches.filter(r=>!r.pair||r.pair.includes(key)),fighters=eligible.flatMap(r=>r.fighters.filter(f=>f.classKey===key));
      if(!eligible.length)return{classKey:key,name:names[i],matches:0};
      const wins=eligible.filter(r=>r.winner===key).length;
      return{classKey:key,name:names[i],matches:eligible.length,wins,winPct:round(wins/eligible.length*100),ci95:ci(eligible,key),
        meanHpDamage:round(fighters.reduce((n,f)=>n+f.hpDamage,0)/fighters.length),meanKills:round(fighters.reduce((n,f)=>n+f.kills,0)/fighters.length)};
    });
    assert.equal(result.classes.reduce((n,r)=>n+(r.wins||0),0),result.matches-result.timeouts);return result;
  };
  const header='kind,power_mode,players,class_a,class_b,base_seed,seed,side,first,rotation,winner,seconds\n';
  const csv=header+rows.map(r=>[r.kind,r.powerMode,r.count||2,r.pair?.[0]||'',r.pair?.[1]||'',r.baseSeed,r.seed,r.side??'',r.first??'',r.rotation??'',r.winner||'timeout',r.seconds].join(',')).join('\n')+'\n';
  const archive=gzipSync(Buffer.from(csv),{level:9});
  const summary={version:study.metadata.version,engineGitBlob:study.metadata.engineGitBlob,balance:study.metadata.balance,targeting:study.metadata.targeting,
    sampling:{matches:rows.length,duelSeeds:study.metadata.duelSeeds,arenaSeeds:study.metadata.arenaSeeds,seedStart:study.metadata.seedStart,seedRanges:study.metadata.seedRanges||null,maxSeconds:study.metadata.maxSeconds,browser:study.metadata.browser},
    provenance:study.provenance||null,
    method:'Seeded AI; mirrored duel side/update order; balanced arena classes and five rotations. Actual mode transitions, no audience bonuses/re-entry. 2000 bootstrap resamples of whole seed clusters. Rates describe full matches and include unfinished cases in the denominator; timeouts are reported separately.',
    duels:aggregate(rows.filter(r=>r.kind==='duel'&&r.powerMode==='full')),
    noSpecials:aggregate(rows.filter(r=>r.kind==='duel'&&r.powerMode==='noSpecials')),
    arenas:Object.fromEntries([...new Set(rows.filter(r=>r.kind==='arena').map(r=>r.count))].sort((a,b)=>a-b).map(n=>[n,aggregate(rows.filter(r=>r.kind==='arena'&&r.count===n))])),
    checks:{deterministic:true,telemetryParity:true,crossScenarioParity:true,errors:[]},
    evidence:{archive:prefix.split(/[\\/]/).at(-1)+'-matches.csv.gz',rows:rows.length,sha256:createHash('sha256').update(archive).digest('hex')}};
  await mkdir(dirname(prefix),{recursive:true});
  await writeFile(prefix+'-summary.json',JSON.stringify(summary,null,2)+'\n');await writeFile(prefix+'-matches.csv.gz',archive);
  return summary;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [input,prefix,...extra]=process.argv.slice(2);
  assert.ok(input&&!extra.length,'Usage: node test/balance-summary.mjs study.json [output-prefix]');
  const study=JSON.parse(await readFile(input,'utf8'));
  const summary=await summarizeBalance(study,prefix||input.replace(/\.json$/,'')+'-report');
  console.log(JSON.stringify({version:summary.version,matches:summary.sampling.matches,duels:summary.duels.classes,arenas:summary.arenas}));
}
