// Pure rules shared by the browser and Node. No DOM, clocks or rendering.
(function installArenaCore(root) {
    'use strict';
    const transientNumbers=Object.freeze(['damageTaken','knockbackTimer','attackAnimTimer','hurtTimer',
        'critBoostTimer','shieldTimer','shieldHP','berserkTimer','tapKnockbackTimer','tapKnockbackBonus',
        'likeBoostTimer','immunityTimer','specialAmplifyTimer','energyRegenerationTimer','healthRegenerationTimer',
        'classChangeCooldown','ringOutTimer','fallDrop','z','vx','vy','vz','doubleJumpCooldown','smashDropTimer','aiJumpCooldown']);
    function resetLife(f,{round=false,energy=50,protection=false}={}) {
        for(const key of transientNumbers)f[key]=0;
        Object.assign(f,{eliminated:false,permanentlyOut:false,hp:f.maxHp,energy,lastAttacker:null,
            lastHitTick:null,lastHitLife:null,castingSkill:null,activeSpecialFactor:1,recoveryJumpUsed:false,
            extraRecoveryUsed:false,edgeRecoveryPending:false,onGround:false,jumpsLeft:f.maxJumps||2,
            attackCooldown:45,aiSpecialCooldown:100,lifeSerial:(f.lifeSerial||0)+1});
        if(protection){f.shieldTimer=110;f.shieldHP=45;}
        if(round)Object.assign(f,{joinsUsed:1,blockedAttempts:0,kills:0,damageDealt:0,likesReceived:0});
        return f;
    }
    function rosterEntry(f){return {name:f.name,platformKey:f.platformKey,isStreamer:!!f.isStreamer,
        archetypeKey:f.preferredArchetypeKey||f.archetypeKey,coopCount:Math.max(1,Number(f.coopCount)||1)};}
    function score(f){return (Number(f.kills)||0)*250+(Number(f.damageDealt)||0);}
    function compareScore(a,b){return score(b)-score(a)||(b.kills||0)-(a.kills||0)
        ||Number(!!a.eliminated)-Number(!!b.eliminated)
        ||(b.eliminated?0:b.hp/Math.max(1,b.maxHp))-(a.eliminated?0:a.hp/Math.max(1,a.maxHp));}
    function snapshot(f){return Object.freeze({...f,lastAttacker:null,castingSkill:null,platform:Object.freeze({...f.platform})});}
    function result(fighters,winner,{reason='survival',eliminations=[]}={}) {
        const byId=new Map(fighters.map(f=>[f.id,snapshot(f)]));
        if(winner&&!byId.has(winner.id))byId.set(winner.id,snapshot(winner));
        const selected=winner?byId.get(winner.id):null,order=[];
        const add=f=>{if(f&&!order.some(item=>item.id===f.id))order.push(f);};
        add(selected);
        if(reason==='survival')for(const f of [...eliminations].reverse())add(byId.get(f.id));
        for(const f of [...byId.values()].sort(compareScore))add(f);
        return Object.freeze({reason,winner:selected,podium:Object.freeze(order.slice(0,3)),
            standings:Object.freeze(order),draw:!selected,scorePerKO:250});
    }
    function createRandom(seed){let state=Number(seed)>>>0;return Object.freeze({
        next(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},
        state(){return state;},reset(value){state=Number(value)>>>0;}});}
    const targetingKeys=Object.freeze({kame:'warriorTargeting',ninja:'shinobiTargeting',titan:'titanTargeting',trueno:'lightningTargeting',esmeralda:'spiritTargeting'});
    const targetingOptions=Object.freeze({kame:Object.freeze(['local','always','nearest','prey']),ninja:Object.freeze(['local','always','nearest','prey']),titan:Object.freeze(['nearest','prey','same','other']),trueno:Object.freeze(['nearest','prey','same','other']),esmeralda:Object.freeze(['nearest','prey','same','other'])});
    const policies=Object.freeze({
        nearest:Object.freeze({kind:'nearest',absolute:false,distanceFactor:10000}),
        same:Object.freeze({kind:'same',absolute:false,distanceFactor:15625}),
        other:Object.freeze({kind:'other',absolute:false,distanceFactor:15625}),
        shinobi:Object.freeze({kind:'other',absolute:false,distanceFactor:13225}),
        prey:Object.freeze({kind:'prey',absolute:false,distanceFactor:15625}),
        sameAlways:Object.freeze({kind:'same',absolute:true,distanceFactor:15625}),
        otherAlways:Object.freeze({kind:'other',absolute:true,distanceFactor:13225})
    });
    function targetingMode(classKey,runtime={}){
        const options=Object.hasOwn(targetingOptions,classKey)?targetingOptions[classKey]:null;if(!options)return 'nearest';
        const value=runtime?.[targetingKeys[classKey]];return options.includes(value)?value:options[0];
    }
    function combatTargetPolicy(classKey,runtime={}){
        const mode=targetingMode(classKey,runtime);
        if(mode==='local')return classKey==='kame'?policies.same:policies.shinobi;
        if(mode==='always')return classKey==='kame'?policies.sameAlways:policies.otherAlways;
        return policies[mode];
    }
    function normalizeRuntime(value={}) {
        const v=value&&typeof value==='object'?value:{};
        return {specialPolicy:v.specialPolicy==='audience'?'audience':'fair',pausePolicy:v.pausePolicy==='show'?'show':'queue',
            renderFps:Number(v.renderFps)===30?30:60,quality:['high','balanced','performance'].includes(v.quality)?v.quality:'balanced',
            ...Object.fromEntries(Object.entries(targetingKeys).map(([classKey,key])=>[key,targetingMode(classKey,v)])),testAdaptClass:v.testAdaptClass!==false,masterVolume:Number.isFinite(Number(v.masterVolume))?Math.round(Math.min(100,Math.max(0,Number(v.masterVolume)))/5)*5:70,
            hudOpacity:Number.isFinite(Number(v.hudOpacity))?Math.round(Math.min(100,Math.max(35,Number(v.hudOpacity)))):85};
    }
    function createHistory(capacity=50000){
        if(!Number.isInteger(capacity)||capacity<1)throw new RangeError('Invalid history capacity');
        const entries=new Array(capacity);let start=0,length=0,dropped=0;
        return Object.freeze({get length(){return length;},get dropped(){return dropped;},push(value){if(length===capacity){entries[start]=value;start=(start+1)%capacity;dropped++;}else{entries[(start+length)%capacity]=value;length++;}},
            slice(from=0,to=length){from=Math.max(0,from);to=Math.min(length,to);return Array.from({length:Math.max(0,to-from)},(_,i)=>entries[(start+from+i)%capacity]);},map(fn){return this.slice().map(fn);}});
    }
    root.ArenaCore=Object.freeze({resetLife,rosterEntry,score,compareScore,snapshot,result,createRandom,normalizeRuntime,createHistory,targetingKeys,targetingOptions,targetingMode,combatTargetPolicy});
})(globalThis);
